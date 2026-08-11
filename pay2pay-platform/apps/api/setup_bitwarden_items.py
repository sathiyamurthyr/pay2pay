"""
Pay2Pay — Create Bitwarden Vault Items
========================================
Run AFTER secrets_bootstrap.py has logged in. This creates all
Pay2Pay secrets as structured vault items.

Usage:
    python setup_bitwarden_items.py <BW_SESSION_TOKEN>
    
Or set environment variable BW_SESSION before running.
"""
import os
import sys
import json
import base64
import subprocess
from pathlib import Path

BW_EXE = str(Path(__file__).parent.parent / "bw.exe")   # d:\pay2pay\bw.exe
BW_SESSION = os.environ.get("BW_SESSION", "") or (sys.argv[1] if len(sys.argv) > 1 else "")

if not BW_SESSION:
    print("[ERROR] Provide BW_SESSION as env var or first argument.", file=sys.stderr)
    sys.exit(1)

# ── Secrets to store ──────────────────────────────────────────────────────────
VAULT_ITEMS = [
    {
        "name": "Pay2Pay — Backblaze B2 Storage",
        "notes": "Pay2Pay KYC document storage. Bucket: pay2pay\nPaths: cmp/sd/ | cmp/dist/ | cmp/ret/ | cmp/service/",
        "login": {
            "username": "003069b02f3e5f824becfcbcad231096ef5a0950c6",  # B2_KEY_ID
            "password": "003069b02f3e5f824becfcbcad231096ef5a0950c6",  # B2_APP_KEY
        },
        "fields": [
            {"name": "B2_KEY_ID",      "value": "003069b02f3e5f824becfcbcad231096ef5a0950c6", "type": 1},
            {"name": "B2_APP_KEY",     "value": "003069b02f3e5f824becfcbcad231096ef5a0950c6", "type": 1},
            {"name": "B2_BUCKET_NAME", "value": "pay2pay",                                     "type": 0},
            {"name": "ACCOUNT_NAME",   "value": "Sathus@SV162127",                             "type": 0},
            {"name": "Path_SD",        "value": "cmp/sd/{year}/{month}/{day}/{file}",           "type": 0},
            {"name": "Path_Dist",      "value": "cmp/dist/{year}/{month}/{day}/{file}",         "type": 0},
            {"name": "Path_Retailer",  "value": "cmp/ret/{year}/{month}/{day}/{file}",          "type": 0},
            {"name": "Path_Service",   "value": "cmp/service/{year}/{month}/{day}/{file}",      "type": 0},
            {"name": "Path_Company",   "value": "cmp/{year}/{month}/{day}/{file}",              "type": 0},
        ],
    },
    {
        "name": "Pay2Pay — Supabase PostgreSQL Database",
        "notes": "Pay2Pay production database on Supabase.",
        "login": {
            "username": "postgres",
            "password": "AivioSathus!321",
            "uris": [{"uri": "db.arkoolfygfqawyvwnldv.supabase.co:5432"}],
        },
        "fields": [
            {"name": "DATABASE_URL",      "value": "postgresql+asyncpg://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres", "type": 1},
            {"name": "ALEMBIC_URL",       "value": "postgresql+psycopg://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres",  "type": 1},
            {"name": "HOST",              "value": "db.arkoolfygfqawyvwnldv.supabase.co",                                                               "type": 0},
            {"name": "PORT",              "value": "5432",                                                                                              "type": 0},
            {"name": "DB_NAME",           "value": "postgres",                                                                                          "type": 0},
        ],
    },
    {
        "name": "Pay2Pay — Super Admin Credentials",
        "notes": "Platform super admin login. DO NOT share.",
        "login": {
            "username": "admin@pay2pay.com",
            "password": "AivioSathus!321",
            "uris": [{"uri": "http://localhost:3000"}, {"uri": "https://pay2pay.vercel.app"}],
        },
        "fields": [
            {"name": "role",  "value": "PLATFORM_SUPER_ADMIN", "type": 0},
            {"name": "env",   "value": "production",           "type": 0},
        ],
    },
    {
        "name": "Pay2Pay — JWT Secret Keys",
        "notes": "JWT signing keys for access and refresh tokens.",
        "login": {
            "username": "jwt-signing-keys",
            "password": "e674b934091a133f9dfca4b967a544c207908b8b8017c669145695029a73887c",
        },
        "fields": [
            {"name": "SECRET_KEY",         "value": "e674b934091a133f9dfca4b967a544c207908b8b8017c669145695029a73887c", "type": 1},
            {"name": "REFRESH_SECRET_KEY", "value": "5f3a0937a098863f6696b997c6d66e7f12e8ad28b8577a111b154b5e6702c2e0", "type": 1},
            {"name": "ALGORITHM",          "value": "HS256",                                                               "type": 0},
            {"name": "EXPIRE_MINUTES",     "value": "60",                                                                  "type": 0},
        ],
    },
]


def bw(args: list[str], check: bool = True) -> str:
    result = subprocess.run(
        [BW_EXE] + args + ["--session", BW_SESSION],
        capture_output=True, text=True
    )
    if check and result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout.strip()


def encode_item(item_data: dict) -> str:
    """Encode vault item as base64 JSON for `bw create item`."""
    # Bitwarden type 1 = Login
    template = {
        "type": 1,
        "name": item_data["name"],
        "notes": item_data.get("notes", ""),
        "login": item_data.get("login", {}),
        "fields": item_data.get("fields", []),
        "reprompt": 0,
        "favorite": False,
    }
    raw = json.dumps(template, ensure_ascii=False)
    return base64.b64encode(raw.encode()).decode()


def main():
    print(f"🔑  Using session token: {BW_SESSION[:12]}…\n")
    print("📋  Syncing vault…")
    bw(["sync"])

    # Check existing items to avoid duplicates
    existing_raw = bw(["list", "items"])
    existing_names = {i["name"] for i in json.loads(existing_raw) if existing_raw}

    created = []
    skipped = []

    for item in VAULT_ITEMS:
        if item["name"] in existing_names:
            skipped.append(item["name"])
            print(f"   ⚠️  Skipped (already exists): {item['name']}")
            continue

        encoded = encode_item(item)
        result = bw(["create", "item", encoded])
        created.append(item["name"])
        print(f"   ✅  Created: {item['name']}")

    print(f"\n📊  Summary: {len(created)} created, {len(skipped)} skipped.")
    print("\n🔒  Done! Run `python secrets_bootstrap.py` to pull secrets into .env")


if __name__ == "__main__":
    main()
