"""
Enterprise Playwright & DevTools Sales Suite
=============================================
Functional E2E Validation, API & Network Performance Auditing,
Multi-ASM Hierarchy Verification, and Zero-Residue Cleanup.
"""

import sys
import os
import time
import json
import random
import string
import asyncio
from datetime import datetime, timezone

# Ensure app imports work
sys.path.insert(0, os.path.abspath("."))

from playwright.async_api import async_playwright
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

BASE_URL = "http://127.0.0.1:8000"

ASM_ACCOUNTS = [
    {"email": "sales@pay2pay.in", "code": "SALES001", "name": "ASMPay2Pay", "role": "Area Sales Manager (Tenant Wide)"},
    {"email": "asmsales@gmail.com", "code": "ASM-SATHUS-001", "name": "Maria nancy christy", "role": "Area Sales Manager (ASM)"},
    {"email": "joeltechenterprises@gmail.com", "code": "ASM-SATHUS-002", "name": "VIJAYA KUMARI", "role": "Area Sales Manager (ASM)"},
    {"email": "rajesh.sales@pay2pay.in", "code": "SALES002", "name": "Pay2PayASM", "role": "Field Sales Officer"}
]
ASM_PASSWORD = "Sales@12345"

def generate_dynamic_dataset():
    """Generates unique, non-hardcoded realistic test data conforming to exact validation rules."""
    ts = int(time.time())
    rand_4 = f"{random.randint(1000, 9999)}"
    rand_6 = f"{random.randint(100000, 999999)}"
    rand_letters = "".join(random.choices(string.ascii_uppercase, k=3))

    sd_pan = f"SD{rand_letters}{rand_4}X"[:10]  # 10 chars
    sd_gst = f"33{sd_pan}1Z5"[:15]            # 15 chars

    dist_pan = f"DI{rand_letters}{rand_4}Y"[:10]
    dist_gst = f"33{dist_pan}1Z5"[:15]

    ret_pan = f"RE{rand_letters}{rand_4}Z"[:10]
    ret_gst = f"33{ret_pan}1Z5"[:15]
    ret_aadhaar = f"7788{rand_4}{rand_4}"[:12]

    sd_mobile = f"9876{rand_6}"  # 10 digits
    dist_mobile = f"9877{rand_6}"
    ret_mobile = f"9878{rand_6}"

    sd_data = {
        "business_name": f"Demo Auto SD {ts}",
        "owner_name": f"SD Owner {rand_letters}",
        "mobile": sd_mobile,
        "email": f"sd_{ts}_{rand_6}@demotest.com",
        "state": "Tamil Nadu",
        "city": "Chennai",
        "address": f"Suite {rand_4}, Tech Park, Mount Road",
        "pincode": "600002",
        "pan_number": sd_pan,
        "gst_number": sd_gst,
        "bank_account_number": f"991100{rand_6}",
        "ifsc": "SBIN0001234"
    }

    dist_data = {
        "business_name": f"Demo Auto Dist {ts}",
        "owner_name": f"Dist Owner {rand_letters}",
        "mobile": dist_mobile,
        "email": f"dist_{ts}_{rand_6}@demotest.com",
        "state": "Tamil Nadu",
        "city": "Coimbatore",
        "address": f"Plot {rand_4}, Industrial Estate, Avinashi Road",
        "pincode": "641001",
        "pan_number": dist_pan,
        "gst_number": dist_gst,
        "bank_account_number": f"992200{rand_6}",
        "ifsc": "HDFC0005678"
    }

    ret_data = {
        "store_name": f"Demo Auto Retailer {ts}",
        "legal_name": f"Demo Retailer Pvt Ltd {ts}",
        "owner_name": f"Ret Owner {rand_letters}",
        "business_category": "General Store",
        "store_type": "BRICK_AND_MORTAR",
        "mobile": ret_mobile,
        "email": f"ret_{ts}_{rand_6}@demotest.com",
        "state": "Tamil Nadu",
        "city": "Madurai",
        "address": f"Shop {rand_4}, Commercial Complex, Main Bazaar",
        "pincode": "625001",
        "pan_number": ret_pan,
        "gst_number": ret_gst,
        "aadhaar_number": ret_aadhaar,
        "bank_name": "State Bank of India",
        "account_holder_name": f"Ret Owner {rand_letters}",
        "bank_account_number": f"993300{rand_6}",
        "ifsc": "SBIN0004321",
        "bank_branch": "Madurai Main"
    }

    return sd_data, dist_data, ret_data


async def run_suite():
    print("=" * 80)
    print("STARTING PLAYWRIGHT & DEVTOOLS E2E SALES PORTAL AUDIT")
    print("=" * 80)

    dataset_sd, dataset_dist, dataset_ret = generate_dynamic_dataset()

    network_metrics = []
    e2e_results = []
    created_ids = {
        "super_distributor": None,
        "distributor": None,
        "retailer": None,
        "emails": [dataset_sd["email"], dataset_dist["email"], dataset_ret["email"]],
        "mobiles": [dataset_sd["mobile"], dataset_dist["mobile"], dataset_ret["mobile"]]
    }

    asm_tokens = {}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # DevTools Network Traffic Monitoring
        def on_request(request):
            request._start_time = time.perf_counter()

        def on_response(response):
            end_time = time.perf_counter()
            start_time = getattr(response.request, "_start_time", end_time)
            latency_ms = round((end_time - start_time) * 1000, 2)
            
            if "/api/v1/sales" in response.url:
                network_metrics.append({
                    "url": response.url.replace(BASE_URL, ""),
                    "method": response.request.method,
                    "status": response.status,
                    "latency_ms": latency_ms,
                    "resource_type": response.request.resource_type,
                    "ok": response.ok
                })

        page.on("request", on_request)
        page.on("response", on_response)

        # ----------------------------------------------------------------------
        # STEP 1: ASM LOGINS VALIDATION ACROSS ALL 4 ASM ACCOUNTS
        # ----------------------------------------------------------------------
        print("\n--- STEP 1: AUTHENTICATING ALL 4 ASM ACCOUNTS ---")
        for asm in ASM_ACCOUNTS:
            login_payload = {
                "identifier": asm["email"],
                "password": ASM_PASSWORD
            }
            start_t = time.perf_counter()
            api_res = await page.request.post(
                f"{BASE_URL}/api/v1/sales/auth/login",
                data=login_payload,
                headers={"Content-Type": "application/json"}
            )
            lat = round((time.perf_counter() - start_t) * 1000, 2)
            status_code = api_res.status
            res_body = await api_res.json() if status_code == 200 else {}

            token = res_body.get("access_token")
            if token:
                asm_tokens[asm["email"]] = token
                print(f"[PASS] Login ASM: {asm['code']} ({asm['name']}) | Status: {status_code} | Latency: {lat}ms")
                e2e_results.append({
                    "step": f"ASM Login ({asm['code']})",
                    "status": "PASS",
                    "latency_ms": lat,
                    "details": f"Authenticated {asm['email']} successfully."
                })
            else:
                print(f"[FAIL] Login ASM: {asm['code']} ({asm['email']}) | Status: {status_code}")
                e2e_results.append({
                    "step": f"ASM Login ({asm['code']})",
                    "status": "FAIL",
                    "latency_ms": lat,
                    "details": f"Failed to authenticate {asm['email']}."
                })

        primary_token = asm_tokens.get("sales@pay2pay.in")

        # ----------------------------------------------------------------------
        # STEP 2: REGISTER 1 SUPER DISTRIBUTOR (SD)
        # ----------------------------------------------------------------------
        print("\n--- STEP 2: REGISTERING SUPER DISTRIBUTOR ---")
        start_t = time.perf_counter()
        sd_res = await page.request.post(
            f"{BASE_URL}/api/v1/sales/register/super-distributor",
            data=dataset_sd,
            headers={
                "Authorization": f"Bearer {primary_token}",
                "Content-Type": "application/json"
            }
        )
        lat = round((time.perf_counter() - start_t) * 1000, 2)
        sd_status = sd_res.status
        sd_body = await sd_res.json() if sd_status in [200, 201] else await sd_res.text()

        if sd_status in [200, 201] and isinstance(sd_body, dict) and sd_body.get("success"):
            created_ids["super_distributor"] = sd_body.get("public_id")
            sd_code = sd_body.get("super_distributor_code")
            print(f"[PASS] Registered SD: {dataset_sd['business_name']} | Code: {sd_code} | ID: {created_ids['super_distributor']} | Latency: {lat}ms")
            e2e_results.append({
                "step": "Register Super Distributor",
                "status": "PASS",
                "latency_ms": lat,
                "details": f"Registered SD {sd_code} ({dataset_sd['business_name']})"
            })
        else:
            print(f"[FAIL] SD Registration Failed | Status: {sd_status} | Response: {sd_body}")
            e2e_results.append({
                "step": "Register Super Distributor",
                "status": "FAIL",
                "latency_ms": lat,
                "details": f"Error status {sd_status}: {sd_body}"
            })

        # ----------------------------------------------------------------------
        # STEP 3: REGISTER 1 DISTRIBUTOR (MAPPED TO SD)
        # ----------------------------------------------------------------------
        print("\n--- STEP 3: REGISTERING DISTRIBUTOR ---")
        if created_ids["super_distributor"]:
            dataset_dist["mapped_super_distributor_id"] = created_ids["super_distributor"]
            start_t = time.perf_counter()
            dist_res = await page.request.post(
                f"{BASE_URL}/api/v1/sales/register/distributor",
                data=dataset_dist,
                headers={
                    "Authorization": f"Bearer {primary_token}",
                    "Content-Type": "application/json"
                }
            )
            lat = round((time.perf_counter() - start_t) * 1000, 2)
            dist_status = dist_res.status
            dist_body = await dist_res.json() if dist_status in [200, 201] else await dist_res.text()

            if dist_status in [200, 201] and isinstance(dist_body, dict) and dist_body.get("success"):
                created_ids["distributor"] = dist_body.get("public_id")
                dist_code = dist_body.get("distributor_code")
                print(f"[PASS] Registered Distributor: {dataset_dist['business_name']} | Code: {dist_code} | ID: {created_ids['distributor']} | Latency: {lat}ms")
                e2e_results.append({
                    "step": "Register Distributor",
                    "status": "PASS",
                    "latency_ms": lat,
                    "details": f"Registered Distributor {dist_code} ({dataset_dist['business_name']})"
                })
            else:
                print(f"[FAIL] Distributor Registration Failed | Status: {dist_status} | Response: {dist_body}")
                e2e_results.append({
                    "step": "Register Distributor",
                    "status": "FAIL",
                    "latency_ms": lat,
                    "details": f"Error status {dist_status}: {dist_body}"
                })

        # ----------------------------------------------------------------------
        # STEP 4: REGISTER 1 RETAILER (MAPPED TO DISTRIBUTOR)
        # ----------------------------------------------------------------------
        print("\n--- STEP 4: REGISTERING RETAILER ---")
        if created_ids["distributor"]:
            dataset_ret["mapped_distributor_id"] = created_ids["distributor"]
            start_t = time.perf_counter()
            ret_res = await page.request.post(
                f"{BASE_URL}/api/v1/sales/register/retailer",
                data=dataset_ret,
                headers={
                    "Authorization": f"Bearer {primary_token}",
                    "Content-Type": "application/json"
                }
            )
            lat = round((time.perf_counter() - start_t) * 1000, 2)
            ret_status = ret_res.status
            ret_body = await ret_res.json() if ret_status in [200, 201] else await ret_res.text()

            if ret_status in [200, 201] and isinstance(ret_body, dict) and ret_body.get("success"):
                created_ids["retailer"] = ret_body.get("public_id")
                ret_code = ret_body.get("retailer_code") or ret_body.get("code")
                print(f"[PASS] Registered Retailer: {dataset_ret['store_name']} | Code: {ret_code} | ID: {created_ids['retailer']} | Latency: {lat}ms")
                e2e_results.append({
                    "step": "Register Retailer",
                    "status": "PASS",
                    "latency_ms": lat,
                    "details": f"Registered Retailer {ret_code} ({dataset_ret['store_name']})"
                })
            else:
                print(f"[FAIL] Retailer Registration Failed | Status: {ret_status} | Response: {ret_body}")
                e2e_results.append({
                    "step": "Register Retailer",
                    "status": "FAIL",
                    "latency_ms": lat,
                    "details": f"Error status {ret_status}: {ret_body}"
                })

        # ----------------------------------------------------------------------
        # STEP 5: VERIFY HIERARCHY DIRECTORIES ACROSS DIFFERENT ASM LOGINS
        # ----------------------------------------------------------------------
        print("\n--- STEP 5: VERIFYING HIERARCHY VISIBILITY ACROSS ALL ASM LOGINS ---")
        hierarchy_verification = []
        for asm in ASM_ACCOUNTS:
            token = asm_tokens.get(asm["email"])
            if not token:
                continue

            # Query Super Distributors
            start_t = time.perf_counter()
            sd_list_res = await page.request.get(
                f"{BASE_URL}/api/v1/sales/hierarchy/super-distributors",
                headers={"Authorization": f"Bearer {token}"}
            )
            sd_lat = round((time.perf_counter() - start_t) * 1000, 2)
            sd_data_list = (await sd_list_res.json()) if sd_list_res.status == 200 else []
            sd_items = sd_data_list.get("items", []) if isinstance(sd_data_list, dict) else sd_data_list

            # Query Distributors
            start_t = time.perf_counter()
            dist_list_res = await page.request.get(
                f"{BASE_URL}/api/v1/sales/hierarchy/distributors",
                headers={"Authorization": f"Bearer {token}"}
            )
            dist_lat = round((time.perf_counter() - start_t) * 1000, 2)
            dist_data_list = (await dist_list_res.json()) if dist_list_res.status == 200 else []
            dist_items = dist_data_list.get("items", []) if isinstance(dist_data_list, dict) else dist_data_list

            # Query Retailers
            start_t = time.perf_counter()
            ret_list_res = await page.request.get(
                f"{BASE_URL}/api/v1/sales/hierarchy/retailers",
                headers={"Authorization": f"Bearer {token}"}
            )
            ret_lat = round((time.perf_counter() - start_t) * 1000, 2)
            ret_data_list = (await ret_list_res.json()) if ret_list_res.status == 200 else []
            ret_items = ret_data_list.get("items", []) if isinstance(ret_data_list, dict) else ret_data_list

            sd_found = any(str(item.get("public_id")) == str(created_ids["super_distributor"]) for item in sd_items) if created_ids["super_distributor"] else False
            dist_found = any(str(item.get("public_id")) == str(created_ids["distributor"]) for item in dist_items) if created_ids["distributor"] else False
            ret_found = any(str(item.get("public_id")) == str(created_ids["retailer"]) for item in ret_items) if created_ids["retailer"] else False

            hierarchy_verification.append({
                "asm_code": asm["code"],
                "asm_name": asm["name"],
                "total_sds": len(sd_items),
                "total_distributors": len(dist_items),
                "total_retailers": len(ret_items),
                "target_sd_visible": sd_found,
                "target_dist_visible": dist_found,
                "target_ret_visible": ret_found,
                "sd_latency_ms": sd_lat,
                "dist_latency_ms": dist_lat,
                "ret_latency_ms": ret_lat
            })

            print(f"ASM Scope Check ({asm['code']} - {asm['name']}): Visible SDs={len(sd_items)}, Dist={len(dist_items)}, Ret={len(ret_items)} | Target SD Visible={sd_found}, Dist Visible={dist_found}, Ret Visible={ret_found}")

        await browser.close()

    # --------------------------------------------------------------------------
    # STEP 6: CLEANUP TEST DEMO DATA FROM DATABASE
    # --------------------------------------------------------------------------
    print("\n--- STEP 6: CLEANING UP CREATED TEST DEMO DATA FROM DATABASE ---")
    cleanup_logs = []
    async with AsyncSessionLocal() as db:
        # Delete Retailer dependencies
        if created_ids["retailer"]:
            ret_uuid = created_ids["retailer"]
            try:
                await db.execute(text("DELETE FROM retailer_contact WHERE retailer_id = CAST(:rid AS UUID);"), {"rid": ret_uuid})
                await db.execute(text("DELETE FROM retailer_address WHERE retailer_id = CAST(:rid AS UUID);"), {"rid": ret_uuid})
                await db.execute(text("DELETE FROM retailer_kyc WHERE retailer_id = CAST(:rid AS UUID);"), {"rid": ret_uuid})
                await db.execute(text("DELETE FROM retailer_bank WHERE retailer_id = CAST(:rid AS UUID);"), {"rid": ret_uuid})
                await db.execute(text("DELETE FROM retailer_assignment WHERE retailer_id = CAST(:rid AS UUID);"), {"rid": ret_uuid})
                await db.execute(text("DELETE FROM sales_hierarchy_mapping WHERE retailer_id = CAST(:rid AS UUID);"), {"rid": ret_uuid})
                await db.execute(text("DELETE FROM retailer WHERE public_id = CAST(:rid AS UUID);"), {"rid": ret_uuid})
                await db.commit()
                cleanup_logs.append(f"Deleted Retailer {ret_uuid} and associated contacts/address/kyc/bank/assignment.")
            except Exception as e:
                await db.rollback()
                cleanup_logs.append(f"Error deleting Retailer {ret_uuid}: {e}")

        # Delete Distributor
        if created_ids["distributor"]:
            dist_uuid = created_ids["distributor"]
            try:
                await db.execute(text("DELETE FROM sales_hierarchy_mapping WHERE distributor_id = CAST(:did AS UUID);"), {"did": dist_uuid})
                await db.execute(text("DELETE FROM super_distributor_distributor_mapping WHERE distributor_id = CAST(:did AS UUID);"), {"did": dist_uuid})
                await db.execute(text("DELETE FROM organization_attachment WHERE entity_type = 'DISTRIBUTOR' AND entity_id = CAST(:did AS UUID);"), {"did": dist_uuid})
                await db.execute(text("DELETE FROM distributor WHERE public_id = CAST(:did AS UUID);"), {"did": dist_uuid})
                await db.commit()
                cleanup_logs.append(f"Deleted Distributor {dist_uuid} and associated mappings & attachments.")
            except Exception as e:
                await db.rollback()
                cleanup_logs.append(f"Error deleting Distributor {dist_uuid}: {e}")

        # Delete Super Distributor
        if created_ids["super_distributor"]:
            sd_uuid = created_ids["super_distributor"]
            try:
                await db.execute(text("DELETE FROM sales_hierarchy_mapping WHERE super_distributor_id = CAST(:sid AS UUID);"), {"sid": sd_uuid})
                await db.execute(text("DELETE FROM sd_wallet WHERE super_distributor_id = CAST(:sid AS UUID);"), {"sid": sd_uuid})
                await db.execute(text("DELETE FROM organization_attachment WHERE entity_type = 'SUPER_DISTRIBUTOR' AND entity_id = CAST(:sid AS UUID);"), {"sid": sd_uuid})
                await db.execute(text("DELETE FROM super_distributor WHERE public_id = CAST(:sid AS UUID);"), {"sid": sd_uuid})
                await db.commit()
                cleanup_logs.append(f"Deleted Super Distributor {sd_uuid} and associated wallet & attachments.")
            except Exception as e:
                await db.rollback()
                cleanup_logs.append(f"Error deleting Super Distributor {sd_uuid}: {e}")

        # Fallback cleanup by demo test emails/mobiles
        for em in created_ids["emails"]:
            await db.execute(text("DELETE FROM retailer_contact WHERE email = :email;"), {"email": em})
            await db.execute(text("DELETE FROM retailer WHERE public_id IN (SELECT retailer_id FROM retailer_contact WHERE email = :email);"), {"email": em})
            await db.execute(text("DELETE FROM distributor WHERE email = :email;"), {"email": em})
            await db.execute(text("DELETE FROM super_distributor WHERE email = :email;"), {"email": em})
        await db.commit()

        # Database Zero-Residue Verification
        res_sd = (await db.execute(text("SELECT count(*) FROM super_distributor WHERE email = :e;"), {"e": dataset_sd["email"]})).scalar()
        res_dist = (await db.execute(text("SELECT count(*) FROM distributor WHERE email = :e;"), {"e": dataset_dist["email"]})).scalar()
        res_ret = (await db.execute(text("SELECT count(*) FROM retailer_contact WHERE email = :e;"), {"e": dataset_ret["email"]})).scalar()

        zero_residue = (res_sd == 0 and res_dist == 0 and res_ret == 0)
        print(f"\nZero Residue Verification: SD count={res_sd}, Dist count={res_dist}, Ret count={res_ret} | Clean={zero_residue}")
        cleanup_logs.append(f"Zero Residue Confirmation: SD={res_sd}, Dist={res_dist}, Ret={res_ret} (Passed: {zero_residue})")

    summary = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dynamic_dataset": {
            "super_distributor": dataset_sd,
            "distributor": dataset_dist,
            "retailer": dataset_ret
        },
        "created_entity_ids": created_ids,
        "e2e_results": e2e_results,
        "hierarchy_verification": hierarchy_verification,
        "network_metrics": network_metrics,
        "cleanup": {
            "zero_residue_verified": zero_residue,
            "logs": cleanup_logs
        }
    }

    summary_json_path = os.path.join(os.path.dirname(__file__), "sales_audit_summary.json")
    with open(summary_json_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"\nAudit complete! Raw JSON summary saved to {summary_json_path}")
    return summary

if __name__ == "__main__":
    asyncio.run(run_suite())
