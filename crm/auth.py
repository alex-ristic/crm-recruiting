import base64
import hashlib
import hmac
import json
import secrets
import sys
import time
from http import cookies
from urllib.parse import parse_qs, urlparse


HASH_ALGORITHM = "pbkdf2_sha256"
DEFAULT_ITERATIONS = 260000


def hash_password(password, *, iterations=DEFAULT_ITERATIONS):
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return f"{HASH_ALGORITHM}${iterations}${salt}${base64.urlsafe_b64encode(digest).decode('ascii')}"


def verify_password(password, stored_hash):
    try:
        algorithm, iterations_raw, salt, encoded_digest = stored_hash.split("$", 3)
        iterations = int(iterations_raw)
    except ValueError:
        return False
    if algorithm != HASH_ALGORITHM:
        return False
    expected = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    try:
        actual = base64.urlsafe_b64decode(encoded_digest.encode("ascii"))
    except ValueError:
        return False
    return hmac.compare_digest(expected, actual)


def create_session_cookie(settings, user):
    session = {
        "user_id": user["id"],
        "username": user["username"],
        "issued_at": int(time.time()),
        "csrf": secrets.token_urlsafe(32),
    }
    value = _sign_payload(session, settings.session_secret)
    attributes = [
        f"{settings.session_cookie_name}={value}",
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        f"Max-Age={settings.session_max_age_seconds}",
    ]
    if settings.cookie_secure:
        attributes.append("Secure")
    return "; ".join(attributes)


def clear_session_cookie(settings):
    attributes = [
        f"{settings.session_cookie_name}=",
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=0",
    ]
    if settings.cookie_secure:
        attributes.append("Secure")
    return "; ".join(attributes)


def get_session(handler):
    settings = handler.settings
    if not settings.auth_enabled or settings.auth_misconfigured:
        return None
    header = handler.headers.get("Cookie", "")
    jar = cookies.SimpleCookie()
    try:
        jar.load(header)
    except cookies.CookieError:
        return None
    morsel = jar.get(settings.session_cookie_name)
    if not morsel:
        return None
    session = _unsign_payload(morsel.value, settings.session_secret)
    if not session:
        return None
    user = handler.user_storage.find_by_id(session.get("user_id"))
    if not user or not user.get("active", True):
        return None
    issued_at = int(session.get("issued_at", 0))
    if issued_at + settings.session_max_age_seconds < int(time.time()):
        return None
    return session


def get_current_user(handler):
    if not handler.settings.auth_enabled:
        from crm.users import local_admin_user
        return local_admin_user()
    session = get_session(handler)
    return handler.user_storage.find_by_id(session.get("user_id")) if session else None


def is_authenticated(handler):
    if not handler.settings.auth_enabled:
        return True
    return get_session(handler) is not None


def parse_form_body(handler, max_bytes=10000):
    raw_length = handler.headers.get("Content-Length", "0")
    try:
        length = int(raw_length)
    except ValueError:
        return {}
    if length <= 0 or length > max_bytes:
        return {}
    raw = handler.rfile.read(length).decode("utf-8", errors="replace")
    return {key: values[0] for key, values in parse_qs(raw, keep_blank_values=True).items()}


def is_same_origin(handler):
    host = handler.headers.get("Host", "")
    for header_name in ("Origin", "Referer"):
        value = handler.headers.get(header_name)
        if not value:
            continue
        parsed = urlparse(value)
        if parsed.netloc and parsed.netloc != host:
            return False
    fetch_site = handler.headers.get("Sec-Fetch-Site")
    if fetch_site and fetch_site not in {"same-origin", "none"}:
        return False
    return True


def csrf_token(handler):
    session = get_session(handler)
    return session.get("csrf") if session else None


def verify_csrf(handler):
    if not handler.settings.auth_enabled:
        return True
    expected = csrf_token(handler)
    supplied = handler.headers.get("X-CSRF-Token", "")
    return bool(expected and supplied and hmac.compare_digest(expected, supplied))


def _sign_payload(payload, secret):
    body = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")).decode("ascii")
    signature = hmac.new(secret.encode("utf-8"), body.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{body}.{signature}"


def _unsign_payload(value, secret):
    try:
        body, signature = value.rsplit(".", 1)
    except ValueError:
        return None
    expected = hmac.new(secret.encode("utf-8"), body.encode("ascii"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        return None
    try:
        return json.loads(base64.urlsafe_b64decode(body.encode("ascii")).decode("utf-8"))
    except (ValueError, json.JSONDecodeError):
        return None


def main(argv=None):
    argv = argv if argv is not None else sys.argv[1:]
    if len(argv) != 1:
        print("Usage: python3 -m crm.auth 'your-password'", file=sys.stderr)
        return 2
    print(hash_password(argv[0]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
