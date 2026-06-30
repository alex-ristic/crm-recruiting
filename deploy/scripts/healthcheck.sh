#!/usr/bin/env bash
set -euo pipefail

URL="${URL:-http://127.0.0.1:8000/login}"

python3 - "$URL" <<'PY'
import sys
import urllib.request

url = sys.argv[1]
try:
    with urllib.request.urlopen(url, timeout=10) as response:
        body = response.read(2048).decode("utf-8", errors="replace")
        if response.status != 200:
            raise SystemExit(f"Unexpected HTTP status: {response.status}")
        if "Recruiting CRM" not in body:
            raise SystemExit("Healthcheck response did not look like the CRM")
except Exception as exc:
    raise SystemExit(f"Healthcheck failed: {exc}") from exc

print(f"OK {url}")
PY
