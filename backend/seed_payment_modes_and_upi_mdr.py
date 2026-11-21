"""
Authoritative Database Seed Script:
1. Seeds missing payment modes in public.payin_payment_modes:
   - CREDIT_CARD, DEBIT_CARD, NET_BANKING, WALLET, UNKNOWN
2. Seeds explicit UPI MDR configuration in public.payin_mdr_cfg
   for all active company & vendor pairs, guaranteeing UPI has its own distinct
   MDR rate and never conflates with credit/debit card rates.
"""

import asyncio
from datetime import datetime, timezone
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def seed_master_data():
    now_utc = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as session:
        # 1. Seed Payment Modes
        print("--> Seeding payment modes in public.payin_payment_modes...")
        modes = [
            (1, "UPI", "Unified Payments Interface", "UPI Intent & Collect", 1, True),
            (2, "CREDIT_CARD", "Credit Card", "Visa, MasterCard, RuPay, Amex Credit Cards", 2, True),
            (3, "DEBIT_CARD", "Debit Card", "Visa, MasterCard, RuPay Debit Cards", 3, True),
            (4, "NET_BANKING", "Net Banking", "Internet Banking across Indian Banks", 4, True),
            (5, "WALLET", "Wallet", "Prepaid Wallets & PPI", 5, True),
            (99, "UNKNOWN", "Pending Classification", "Unclassified / Pending Gateway Classification", 99, True),
        ]
        for mode_id, code, name, desc, order, enabled in modes:
            await session.execute(text("""
                INSERT INTO public.payin_payment_modes (
                    payin_payment_mode_ref_id, pay_mode_code, pay_mode_name, pay_mode_desc, display_order, is_enabled, created_at, updated_at
                ) VALUES (
                    :mid, :code, :name, :desc, :order, :en, :now, :now
                )
                ON CONFLICT (pay_mode_code) DO UPDATE
                SET pay_mode_name = EXCLUDED.pay_mode_name,
                    pay_mode_desc = EXCLUDED.pay_mode_desc,
                    is_enabled = EXCLUDED.is_enabled,
                    updated_at = :now;
            """), {
                "mid": mode_id, "code": code, "name": name, "desc": desc, "order": order, "en": enabled, "now": now_utc
            })
        print("    Payment modes seeded successfully.")

        # 2. Seed UPI MDR rules for Company 1 and Company 2 across all vendors
        print("--> Seeding UPI MDR rules in public.payin_mdr_cfg...")
        pairs = [
            # (company_ref_id, vendor_ref_id, mdr_pct, treatment)
            (2, 2, 0.0000, "DEDUCT_FROM_TOPUP"),    # SMSPAY, BankMe
            (2, 1, 0.0000, "DEDUCT_FROM_TOPUP"),    # SMSPAY, Vendor 1
            (1, 1, 0.0000, "COLLECT_ADDITIONALLY"), # Sathus, Vendor 1
            (1, 2, 0.0000, "COLLECT_ADDITIONALLY"), # Sathus, BankMe
        ]

        for cid, vid, mdr_pct, treatment in pairs:
            # Check if UPI rule already exists for this (company, vendor)
            chk = await session.execute(text("""
                SELECT payin_mdr_cfg_ref_id FROM public.payin_mdr_cfg
                WHERE company_ref_id = :cid
                  AND payin_vendor_ref_id = :vid
                  AND card_network = 'UPI'
                LIMIT 1;
            """), {"cid": cid, "vid": vid})
            existing_id = chk.scalar()

            if not existing_id:
                ins = text("""
                    INSERT INTO public.payin_mdr_cfg (
                        company_ref_id, payin_vendor_ref_id, payin_payment_mode_ref_id, card_network,
                        mdr_pct, mdr_fixed, tax_pct, min_mdr, max_mdr, mdr_treatment,
                        priority, is_enabled, effective_from, created_by, updated_by, created_at, updated_at
                    ) VALUES (
                        :cid, :vid, 1, 'UPI',
                        :pct, 0.0, 0.18, 0.0, 5000.0, :treat,
                        100, TRUE, :now, 'SYSTEM_MIGRATION', 'SYSTEM_MIGRATION', :now, :now
                    ) RETURNING payin_mdr_cfg_ref_id;
                """)
                res = await session.execute(ins, {
                    "cid": cid, "vid": vid, "pct": mdr_pct, "treat": treatment, "now": now_utc
                })
                new_id = res.scalar()
                print(f"    Inserted UPI MDR rule {new_id} for Company {cid}, Vendor {vid} (MDR: {mdr_pct*100:.2f}%, Treatment: {treatment})")
            else:
                print(f"    UPI MDR rule {existing_id} already exists for Company {cid}, Vendor {vid}")

        await session.commit()
        print("--> All master data and UPI MDR configuration committed.")

if __name__ == "__main__":
    asyncio.run(seed_master_data())
