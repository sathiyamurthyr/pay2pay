import asyncio
import os
import json
from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def seed_master_data():
    db_url = os.environ.get("DATABASE_URL")
    print(f"Connecting to: {db_url.split('@')[1] if '@' in db_url else db_url}")
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        now_dt = datetime.now(timezone.utc)

        # 1. Ensure payin_vendors has AIRPAY (1) and BANKME (2)
        print("Checking payin_vendors...")
        await conn.execute(text("""
            INSERT INTO public.payin_vendors (
                payin_vendor_ref_id, vendor_code, vendor_name, provider_name, provider_type,
                api_base_url, auth_type, cred_ref, timeout_sec, retry_policy,
                vendor_status, created_by, updated_by, created_at, updated_at
            ) VALUES 
            (
                1, 'AIRPAY', 'Airpay Payment Services', 'Airpay', 'PAYMENT_GATEWAY',
                'https://api.airpay.co.in', 'API_KEY', 'ENC_AIRPAY_KEY', 30, 'EXPONENTIAL_BACKOFF',
                'ACTIVE', 'SYSTEM', 'SYSTEM', :now, :now
            ),
            (
                2, 'BANKME', 'BankMe Payment Services', 'BankMe', 'PAYMENT_GATEWAY',
                'https://api.bankme.in', 'API_KEY', 'ENC_BANKME_KEY', 30, 'EXPONENTIAL_BACKOFF',
                'ACTIVE', 'SYSTEM', 'SYSTEM', :now, :now
            )
            ON CONFLICT (vendor_code) DO UPDATE SET
                vendor_name = EXCLUDED.vendor_name,
                provider_name = EXCLUDED.provider_name,
                vendor_status = 'ACTIVE',
                updated_at = :now;
        """), {"now": now_dt})

        # 2. Seed payin_card_types with 5 standard schemes
        print("Checking payin_card_types...")
        await conn.execute(text("""
            INSERT INTO public.payin_card_types (
                payin_card_type_ref_id, card_type_code, card_type_name, card_network, card_desc, is_enabled, created_at, updated_at
            ) VALUES
            (1, 'VISA', 'Visa', 'VISA', 'Consumer Debit / Credit', true, :now, :now),
            (2, 'MASTERCARD', 'MasterCard', 'MASTERCARD', 'Consumer Debit / Credit', true, :now, :now),
            (3, 'RUPAY', 'RuPay', 'RUPAY', 'Domestic NPCI Network', true, :now, :now),
            (4, 'AMEX', 'AMEX / Diners', 'AMEX', 'Premium Card Schemes', true, :now, :now),
            (5, 'CORP', 'Business / Corporate', 'CORP', 'Commercial & Purchasing', true, :now, :now)
            ON CONFLICT (card_type_code) DO UPDATE SET
                card_type_name = EXCLUDED.card_type_name,
                card_network = EXCLUDED.card_network,
                card_desc = EXCLUDED.card_desc,
                is_enabled = EXCLUDED.is_enabled,
                updated_at = :now;
        """), {"now": now_dt})

        # 3. Seed payin_company_vendors for Company 2 (SMSPAY) and Company 1 (Near4You)
        print("Checking payin_company_vendors...")
        # Company 2 (SMSPAY) -> G-1 (BankMe), G-2 (Airpay)
        await conn.execute(text("""
            INSERT INTO public.payin_company_vendors (
                company_ref_id, payin_vendor_ref_id, merchant_id, gateway_code,
                retailer_display_name, description, display_order, status,
                vendor_priority, is_default, is_enabled, effective_from, updated_by, created_at, updated_at
            ) VALUES
            (
                2, 2, 'SMSPAY_BANKME_MID', 'G-1',
                'Gateway G-1', 'Fast and secure payment processing with instant confirmation.',
                1, 'ACTIVE', 1, true, true, :now, 'SYSTEM', :now, :now
            ),
            (
                2, 1, 'SMSPAY_AIRPAY_MID', 'G-2',
                'Gateway G-2', 'Enterprise-grade payment gateway with redundant routing.',
                2, 'ACTIVE', 2, false, true, :now, 'SYSTEM', :now, :now
            )
            ON CONFLICT (company_ref_id, payin_vendor_ref_id) DO UPDATE SET
                gateway_code = EXCLUDED.gateway_code,
                retailer_display_name = EXCLUDED.retailer_display_name,
                description = EXCLUDED.description,
                display_order = EXCLUDED.display_order,
                status = 'ACTIVE',
                is_enabled = true,
                updated_at = :now;
        """), {"now": now_dt})

        # Company 1 (Near4You) -> G-1 (Airpay), G-2 (BankMe)
        await conn.execute(text("""
            INSERT INTO public.payin_company_vendors (
                company_ref_id, payin_vendor_ref_id, merchant_id, gateway_code,
                retailer_display_name, description, display_order, status,
                vendor_priority, is_default, is_enabled, effective_from, updated_by, created_at, updated_at
            ) VALUES
            (
                1, 1, 'NEAR4YOU_AIRPAY_MID', 'G-1',
                'Gateway G-1', 'Fast and secure payment processing with instant confirmation.',
                1, 'ACTIVE', 1, true, true, :now, 'SYSTEM', :now, :now
            ),
            (
                1, 2, 'NEAR4YOU_BANKME_MID', 'G-2',
                'Gateway G-2', 'Enterprise-grade payment gateway with redundant routing.',
                2, 'ACTIVE', 2, false, true, :now, 'SYSTEM', :now, :now
            )
            ON CONFLICT (company_ref_id, payin_vendor_ref_id) DO UPDATE SET
                gateway_code = EXCLUDED.gateway_code,
                retailer_display_name = EXCLUDED.retailer_display_name,
                description = EXCLUDED.description,
                display_order = EXCLUDED.display_order,
                status = 'ACTIVE',
                is_enabled = true,
                updated_at = :now;
        """), {"now": now_dt})

        # 4. Seed payin_mdr_cfg
        print("Checking payin_mdr_cfg...")
        # Company 2 (SMSPAY) - Gateway G-1 (BankMe, vendor 2)
        # Rates: Visa 2.62%, MasterCard 2.62%, RuPay 1.80%, AMEX 3.10%, CORP 3.40%
        # Company 2 (SMSPAY) - Gateway G-2 (Airpay, vendor 1)
        # Rates: Visa 2.85%, MasterCard 2.85%, RuPay 1.80%, AMEX 3.25%, CORP 3.50%
        # Company 1 (Near4You) - Gateway G-1 (Airpay, vendor 1)
        # Rates: Visa 2.50%, MasterCard 2.50%, RuPay 1.80%, AMEX 3.00%, CORP 3.30%
        mdr_records = [
            # Company 2, G-1 (Vendor 2 - BANKME) - Base & Card Schemes
            (2, 2, None, None, 0.0262, 'COLLECT_ADDITIONALLY', True),
            (2, 2, 1, 'VISA', 0.0262, 'COLLECT_ADDITIONALLY', True),
            (2, 2, 2, 'MASTERCARD', 0.0262, 'COLLECT_ADDITIONALLY', True),
            (2, 2, 3, 'RUPAY', 0.0180, 'COLLECT_ADDITIONALLY', True),
            (2, 2, 4, 'AMEX', 0.0310, 'COLLECT_ADDITIONALLY', True),
            (2, 2, 5, 'CORP', 0.0340, 'COLLECT_ADDITIONALLY', True),

            # Company 2, G-2 (Vendor 1 - AIRPAY) - Base & Card Schemes
            (2, 1, None, None, 0.0285, 'COLLECT_ADDITIONALLY', True),
            (2, 1, 1, 'VISA', 0.0285, 'COLLECT_ADDITIONALLY', True),
            (2, 1, 2, 'MASTERCARD', 0.0285, 'COLLECT_ADDITIONALLY', True),
            (2, 1, 3, 'RUPAY', 0.0180, 'COLLECT_ADDITIONALLY', True),
            (2, 1, 4, 'AMEX', 0.0325, 'COLLECT_ADDITIONALLY', True),
            (2, 1, 5, 'CORP', 0.0350, 'COLLECT_ADDITIONALLY', True),

            # Company 1, G-1 (Vendor 1 - AIRPAY) - Base & Card Schemes
            (1, 1, None, None, 0.0250, 'COLLECT_ADDITIONALLY', True),
            (1, 1, 1, 'VISA', 0.0250, 'COLLECT_ADDITIONALLY', True),
            (1, 1, 2, 'MASTERCARD', 0.0250, 'COLLECT_ADDITIONALLY', True),
            (1, 1, 3, 'RUPAY', 0.0180, 'COLLECT_ADDITIONALLY', True),
            (1, 1, 4, 'AMEX', 0.0300, 'COLLECT_ADDITIONALLY', True),
            (1, 1, 5, 'CORP', 0.0330, 'COLLECT_ADDITIONALLY', True),

            # Company 1, G-2 (Vendor 2 - BANKME) - Base Rule
            (1, 2, None, None, 0.0262, 'COLLECT_ADDITIONALLY', True),
        ]

        for cid, vid, ctid, net, pct, treat, en in mdr_records:
            # Check if exists
            if net is None:
                chk = await conn.execute(text("""
                    SELECT payin_mdr_cfg_ref_id FROM public.payin_mdr_cfg
                    WHERE company_ref_id = :cid AND payin_vendor_ref_id = :vid AND card_network IS NULL
                    LIMIT 1;
                """), {"cid": cid, "vid": vid})
            else:
                chk = await conn.execute(text("""
                    SELECT payin_mdr_cfg_ref_id FROM public.payin_mdr_cfg
                    WHERE company_ref_id = :cid AND payin_vendor_ref_id = :vid AND card_network = :net
                    LIMIT 1;
                """), {"cid": cid, "vid": vid, "net": net})
            existing = chk.scalar()
            if existing:
                await conn.execute(text("""
                    UPDATE public.payin_mdr_cfg
                    SET mdr_pct = :pct,
                        payin_card_type_ref_id = :ctid,
                        mdr_treatment = :treat,
                        is_enabled = :en,
                        updated_by = 'SYSTEM',
                        updated_at = :now
                    WHERE payin_mdr_cfg_ref_id = :eid;
                """), {"pct": pct, "ctid": ctid, "treat": treat, "en": en, "now": now_dt, "eid": existing})
            else:
                await conn.execute(text("""
                    INSERT INTO public.payin_mdr_cfg (
                        company_ref_id, payin_vendor_ref_id, payin_card_type_ref_id, card_network,
                        mdr_pct, mdr_fixed, tax_pct, min_mdr, max_mdr, mdr_treatment,
                        priority, is_enabled, effective_from, created_by, updated_by, created_at, updated_at
                    ) VALUES (
                        :cid, :vid, :ctid, :net,
                        :pct, 0.0, 0.18, 0.0, 5000.0, :treat,
                        100, :en, :now, 'SYSTEM', 'SYSTEM', :now, :now
                    );
                """), {"cid": cid, "vid": vid, "ctid": ctid, "net": net, "pct": pct, "treat": treat, "en": en, "now": now_dt})

        print("Master data and mapping seeded successfully.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_master_data())
