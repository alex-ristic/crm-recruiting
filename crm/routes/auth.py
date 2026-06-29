from http import HTTPStatus

from crm.auth import (
    clear_session_cookie,
    create_session_cookie,
    csrf_token,
    is_same_origin,
    parse_form_body,
    verify_password,
)
from crm.routes.state import send_json


def handle_login_page(handler, error=""):
    message = ""
    if handler.settings.auth_misconfigured:
        message = "Authentication is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD_HASH, and SESSION_SECRET."
    elif error:
        message = "Invalid username or password."
    body = _login_html(message).encode("utf-8")
    handler.send_response(HTTPStatus.OK)
    handler.send_header("Content-Type", "text/html; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def handle_login_post(handler):
    if handler.settings.auth_misconfigured:
        handle_login_page(handler)
        return
    if not is_same_origin(handler):
        handler.send_error(HTTPStatus.FORBIDDEN)
        return
    form = parse_form_body(handler)
    username = form.get("username", "")
    password = form.get("password", "")
    if username != handler.settings.admin_username or not verify_password(password, handler.settings.admin_password_hash):
        handle_login_page(handler, error="invalid")
        return
    handler.send_response(HTTPStatus.SEE_OTHER)
    handler.send_header("Location", "/")
    handler.send_header("Set-Cookie", create_session_cookie(handler.settings, username))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()


def handle_logout_post(handler):
    if not is_same_origin(handler):
        handler.send_error(HTTPStatus.FORBIDDEN)
        return
    handler.send_response(HTTPStatus.SEE_OTHER)
    handler.send_header("Location", "/login")
    handler.send_header("Set-Cookie", clear_session_cookie(handler.settings))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()


def handle_session(handler):
    if not handler.settings.auth_enabled:
        send_json(handler, {"authenticated": True, "csrfToken": None, "authRequired": False})
        return
    token = csrf_token(handler)
    send_json(handler, {"authenticated": bool(token), "csrfToken": token, "authRequired": True})


def _login_html(message):
    message_html = f'<p class="message">{_escape(message)}</p>' if message else ""
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Recruiting CRM Login</title>
    <style>
      * {{ box-sizing: border-box; }}
      body {{ margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f6fa; color: #0f172a; font-family: Inter, system-ui, sans-serif; }}
      main {{ width: min(380px, calc(100vw - 32px)); padding: 28px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 18px 45px rgba(15, 23, 42, .12); }}
      h1 {{ margin: 0 0 6px; font-size: 22px; }}
      p {{ margin: 0 0 20px; color: #64748b; font-size: 13px; line-height: 1.45; }}
      label {{ display: block; margin-top: 14px; color: #334155; font-size: 13px; font-weight: 700; }}
      input {{ width: 100%; height: 40px; margin-top: 6px; padding: 0 11px; border: 1px solid #cbd5e1; border-radius: 8px; font: inherit; }}
      button {{ width: 100%; height: 40px; margin-top: 20px; border: 0; border-radius: 8px; color: #fff; background: #0052ff; font-weight: 700; cursor: pointer; }}
      .message {{ margin: 12px 0 0; color: #991b1b; }}
    </style>
  </head>
  <body>
    <main>
      <h1>Recruiting CRM</h1>
      <p>Sign in to continue.</p>
      <form method="post" action="/login">
        <label>Username<input name="username" autocomplete="username" required /></label>
        <label>Password<input name="password" type="password" autocomplete="current-password" required /></label>
        <button type="submit">Log in</button>
      </form>
      {message_html}
    </main>
  </body>
</html>"""


def _escape(value):
    return str(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
