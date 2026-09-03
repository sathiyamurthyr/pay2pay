import asyncio
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, ".")
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def create_sp():
    async with AsyncSessionLocal() as s:
        await s.execute(text("""
            CREATE OR REPLACE FUNCTION public.sp_toggle_beneficiary_favorite(
                p_beneficiary_id uuid
            )
            RETURNS TABLE(
                public_id uuid,
                is_favourite boolean,
                status text
            )
            LANGUAGE plpgsql
            AS $$
            DECLARE
                v_fav boolean;
                v_found boolean := false;
            BEGIN
                SELECT b.is_favourite INTO v_fav
                FROM public.beneficiary b
                WHERE b.public_id = p_beneficiary_id;

                IF FOUND THEN
                    v_found := true;
                ELSE
                    SELECT bm.is_favourite INTO v_fav
                    FROM public.beneficiary_master bm
                    WHERE bm.public_id = p_beneficiary_id;
                    
                    IF FOUND THEN
                        v_found := true;
                    END IF;
                END IF;

                IF NOT v_found THEN
                    RETURN QUERY SELECT p_beneficiary_id, false, 'NOT_FOUND'::text;
                    RETURN;
                END IF;

                -- Toggle the value
                v_fav := NOT COALESCE(v_fav, false);

                UPDATE public.beneficiary
                SET is_favourite = v_fav,
                    updated_date = NOW()
                WHERE public.beneficiary.public_id = p_beneficiary_id;

                UPDATE public.beneficiary_master
                SET is_favourite = v_fav,
                    updated_date = NOW()
                WHERE public.beneficiary_master.public_id = p_beneficiary_id;

                RETURN QUERY SELECT p_beneficiary_id, v_fav, 'SUCCESS'::text;
            END;
            $$;
        """))
        await s.commit()
        print("Updated public.sp_toggle_beneficiary_favorite with updated_date!")

if __name__ == "__main__":
    asyncio.run(create_sp())
