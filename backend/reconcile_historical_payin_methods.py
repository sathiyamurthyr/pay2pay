"""
Historical PayIn Payment Method & MDR Classification Reconciler.

Inspects historical transactions in public.payin_transactions against
authoritative gateway responses logged in public.payin_api_logs and
public.payin_callback_logs.

Rules:
- Updates card_network, pay_mode_ref_id, card_type_ref_id, and mdr_rate accurately.
- Does NOT alter settled wallet ledger balances or mutate past accounting entries.
"""

import asyncio
import json
from datetime import datetime, timezone
from sqlalchemy import text
from app.core.database import AsyncSessionLocal
from app.application.payment_method_normalizer import PaymentMethodNormalizer

async def reconcile_historical():
    async with AsyncSessionLocal() as session:
        print("=== RECONCILING HISTORICAL PAYIN TRANSACTIONS ===")
        # 1. Fetch all transactions
        txns_res = await session.execute(text("""
            SELECT payin_transactions_ref_id, tid, company_ref_id, payin_vendor_ref_id,
                   card_network, pay_mode_ref_id, txn_status, ledger_txn_id
            FROM public.payin_transactions
            ORDER BY payin_transactions_ref_id ASC;
        """))
        txns = txns_res.mappings().all()
        print(f"Total transactions found: {len(txns)}")

        # Map payment mode codes to ref_ids
        pm_res = await session.execute(text("SELECT payin_payment_mode_ref_id, pay_mode_code FROM public.payin_payment_modes;"))
        mode_map = {row["pay_mode_code"]: row["payin_payment_mode_ref_id"] for row in pm_res.mappings().all()}

        # Map card networks to ref_ids
        ct_res = await session.execute(text("SELECT payin_card_type_ref_id, card_network FROM public.payin_card_types;"))
        card_map = {row["card_network"]: row["payin_card_type_ref_id"] for row in ct_res.mappings().all()}

        updated_count = 0

        for t in txns:
            tid = t["tid"]
            cid = t["company_ref_id"]
            vid = t["payin_vendor_ref_id"]

            # Search payin_api_logs for status check / webhook payload
            log_res = await session.execute(text("""
                SELECT res_payload, req_payload FROM public.payin_api_logs
                WHERE tid = :tid AND res_payload IS NOT NULL
                ORDER BY payin_api_log_ref_id DESC
                LIMIT 5;
            """), {"tid": tid})
            logs = log_res.mappings().all()

            detected_norm = None
            for l in logs:
                rp = l["res_payload"]
                if isinstance(rp, str):
                    try:
                        rp = json.loads(rp)
                    except Exception:
                        pass
                if isinstance(rp, dict):
                    norm = PaymentMethodNormalizer.normalize_gateway_method(raw_payload=rp)
                    if norm.card_network or norm.pay_mode_code != "UNKNOWN":
                        detected_norm = norm
                        break

            if not detected_norm:
                # Check payin_callback_logs
                cb_res = await session.execute(text("""
                    SELECT payload FROM public.payin_callback_logs
                    WHERE tid = :tid
                    ORDER BY payin_callback_log_ref_id DESC
                    LIMIT 3;
                """), {"tid": tid})
                cb_logs = cb_res.mappings().all()
                for cb in cb_logs:
                    pl = cb["payload"]
                    if isinstance(pl, str):
                        try:
                            pl = json.loads(pl)
                        except Exception:
                            pass
                    if isinstance(pl, dict):
                        norm = PaymentMethodNormalizer.normalize_gateway_method(raw_payload=pl)
                        if norm.card_network or norm.pay_mode_code != "UNKNOWN":
                            detected_norm = norm
                            break

            if detected_norm:
                new_network = detected_norm.card_network
                new_mode_code = detected_norm.pay_mode_code
                new_mode_id = mode_map.get(new_mode_code, t["pay_mode_ref_id"])
                new_card_type_id = card_map.get(new_network) if new_network else None

                # Query configured MDR for this exact scheme
                mdr_pct = None
                if new_network:
                    m_chk = await session.execute(text("""
                        SELECT mdr_pct FROM public.payin_mdr_cfg
                        WHERE company_ref_id = :cid AND payin_vendor_ref_id = :vid AND card_network = :net
                        ORDER BY priority DESC, payin_mdr_cfg_ref_id DESC LIMIT 1;
                    """), {"cid": cid, "vid": vid, "net": new_network})
                    mdr_pct = m_chk.scalar()

                if mdr_pct is None:
                    # Check base rule
                    m_chk = await session.execute(text("""
                        SELECT mdr_pct FROM public.payin_mdr_cfg
                        WHERE company_ref_id = :cid AND payin_vendor_ref_id = :vid AND card_network IS NULL
                        ORDER BY priority DESC, payin_mdr_cfg_ref_id DESC LIMIT 1;
                    """), {"cid": cid, "vid": vid})
                    mdr_pct = m_chk.scalar()

                upd_stmt = text("""
                    UPDATE public.payin_transactions
                    SET card_network = :c_net,
                        pay_mode_ref_id = :pm_id,
                        card_type_ref_id = :ct_id,
                        mdr_pct = COALESCE(:mdr_pct, mdr_pct),
                        updated_at = :now
                    WHERE payin_transactions_ref_id = :rid;
                """)
                await session.execute(upd_stmt, {
                    "c_net": new_network,
                    "pm_id": new_mode_id,
                    "ct_id": new_card_type_id,
                    "mdr_pct": mdr_pct,
                    "now": datetime.now(timezone.utc),
                    "rid": t["payin_transactions_ref_id"]
                })
                updated_count += 1
                print(f"  [+] Reconciled TID {tid}: Network={new_network}, Mode={new_mode_code} (Ref {new_mode_id}), MDR={float(mdr_pct)*100 if mdr_pct else 'N/A'}%")

        await session.commit()
        print(f"\n--> Successfully reconciled {updated_count} transactions.")

if __name__ == "__main__":
    asyncio.run(reconcile_historical())
