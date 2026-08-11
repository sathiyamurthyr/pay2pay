"""
Pay2Pay — Bitwarden Secret Bootstrap
=====================================
Logs into Bitwarden, retrieves all Pay2Pay secrets, and writes a
`.env` file for the backend. Run this ONCE before starting the server.

Usage:
    python secrets_bootstrap.py

Requirements:
    - bw.exe must be on PATH or in the project root
    - BW_CLIENT_ID, BW_CLIENT_SECRET, BW_MASTER_PASSWORD must be set
      in environment OR entered interactively.
    - pip install python-dotenv
"""
import os
import sys
import json
import subprocess
import getpass
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent
BW_EXE = str(PROJECT_ROOT.parent / "bw.exe")   # d:\pay2pay\bw.exe
ENV_FILE = PROJECT_ROOT / ".env"

# ── Bitwarden credentials from env or prompt ───────────────────────────────────
BW_CLIENT_ID       = os.environ.get("BW_CLIENT_ID",       "").strip()
BW_CLIENT_SECRET   = os.environ.get("BW_CLIENT_SECRET",   "").strip()
BW_MASTER_PASSWORD = os.environ.get("BW_MASTER_PASSWORD", "").strip()

if not BW_CLIENT_ID:
    BW_CLIENT_ID = input("Bitwarden Client ID: ").strip()
if not BW_CLIENT_SECRET:
    BW_CLIENT_SECRET = getpass.getpass("Bitwarden Client Secret: ").strip()
if not BW_MASTER_PASSWORD:
    BW_MASTER_PASSWORD = getpass.getpass("Bitwarden Master Password: ").strip()

# ── Helpers ────────────────────────────────────────────────────────────────────
def bw(*args: str, input_text: str | None = None, check: bool = True) -> str:
    """Run a Bitwarden CLI command and return stdout."""
    env = {**os.environ, "BW_CLIENTID": BW_CLIENT_ID, "BW_CLIENTSECRET": BW_CLIENT_SECRET}
    result = subprocess.run(
        [BW_EXE, *args],
        capture_output=True,
        text=True,
        env=env,
        input=input_text,
    )
    if check and result.returncode != 0:
        print(f"[bw error] {result.stderr.strip()}", file=sys.stderr)
        sys.exit(1)
    return result.stdout.strip()


def bw_login_and_unlock() -> str:
    """Login with API key, unlock vault, return session token."""
    print("🔐  Authenticating with Bitwarden…")
    bw("login", "--apikey", check=False)  # no-op if already logged in

    print("🔓  Unlocking vault…")
    token = bw("unlock", "--passwordenv", "BW_PASSWORD",
               input_text=BW_MASTER_PASSWORD, check=False)
    # Parse session token from output like: export BW_SESSION="<token>"
    for line in token.splitlines():
        if "BW_SESSION" in line:
            return line.split('"')[1]

    # Fallback: try direct unlock output (already unlocked case)
    token = bw("unlock", BW_MASTER_PASSWORD, check=False)
    for line in token.splitlines():
        if "BW_SESSION" in line:
            return line.split('"')[1]
    return ""


def get_items(session: str) -> list[dict]:
    """Fetch all vault items."""
    raw = subprocess.run(
        [BW_EXE, "list", "items", "--session", session],
        capture_output=True, text=True
    ).stdout.strip()
    if not raw:
        return []
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return []


def find_field(item: dict, field_name: str) -> str:
    """Find a custom field value by name in a vault item."""
    for f in (item.get("fields") or []):
        if f.get("name", "").lower() == field_name.lower():
            return f.get("value", "")
    return ""


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    session = bw_login_and_unlock()
    if not session:
        print("[ERROR] Could not unlock Bitwarden vault.", file=sys.stderr)
        sys.exit(1)

    print("📋  Fetching vault items…")
    items = get_items(session)

    # --- Find the Pay2Pay items ---
    secrets = {}

    for item in items:
        name = item.get("name", "").lower()
        login = item.get("login") or {}

        # Pay2Pay Database
        if "pay2pay" in name and ("db" in name or "database" in name or "postgres" in name):
            secrets["DATABASE_URL"]       = login.get("password") or find_field(item, "DATABASE_URL")
            secrets["POSTGRES_USER"]      = login.get("username") or find_field(item, "POSTGRES_USER")
            secrets["POSTGRES_PASSWORD"]  = login.get("password") or find_field(item, "POSTGRES_PASSWORD")

        # Backblaze B2
        if "backblaze" in name or "b2" in name:
            secrets["B2_KEY_ID"]      = login.get("username") or find_field(item, "B2_KEY_ID")
            secrets["B2_APP_KEY"]     = login.get("password") or find_field(item, "B2_APP_KEY")
            secrets["B2_BUCKET_NAME"] = find_field(item, "B2_BUCKET_NAME") or "pay2pay"

        # JWT / Auth secrets
        if "jwt" in name or "secret" in name:
            secrets["SECRET_KEY"] = login.get("password") or find_field(item, "SECRET_KEY")

        # Super Admin
        if "admin" in name and "super" in name:
            secrets["SUPER_ADMIN_EMAIL"]    = login.get("username") or find_field(item, "email")
            secrets["SUPER_ADMIN_PASSWORD"] = login.get("password") or find_field(item, "password")

    # --- Write .env file ---
    print(f"✍️   Writing secrets to {ENV_FILE} …")
    ENV_FILE.write_text(
        "# AUTO-GENERATED by secrets_bootstrap.py — DO NOT COMMIT\n"
        + "\n".join(f'{k}="{v}"' for k, v in secrets.items() if v)
        + "\n"
    )
    print("✅  Done! Start the backend with: uvicorn app.main:app --reload")
    bw("lock", "--session", session, check=False)
    print("🔒  Vault locked.")


if __name__ == "__main__":
    main()
