"""
Pay2Pay User Type Master Service
Authoritative business logic for User Type definitions, validations, and ID resolution.

Database is the source of truth for User Type definitions.
Supported User Types (6 Fixed Types):
1. ADMIN        - Full administrative access
2. RETAILER     - Retailer-level transactions and payouts
3. DISTRIBUTOR  - Distributor-level transactions and mapped retailer data
4. SD           - Super Distributor-level transactions and mapped hierarchy
5. CRM          - Customer/service/support transaction visibility
6. RM           - Regional Manager transactions for mapped retailers
"""

from typing import Optional, List, Dict, Any, Set
from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession


class UserTypeService:
    # Set of strictly allowed user type codes in uppercase
    ALLOWED_USER_TYPES: Set[str] = {
        "ADMIN",
        "RETAILER",
        "DISTRIBUTOR",
        "SD",
        "CRM",
        "RM",
        "AUDIT",
        "OPERATIONS",
        "FINANCE",
        "SUPPORT",
    }

    # In-memory lookup caches populated from database
    _code_to_ref_id: Dict[str, int] = {
        "ADMIN": 1,
        "RETAILER": 2,
        "DISTRIBUTOR": 3,
        "SD": 4,
        "CRM": 5,
        "RM": 6,
        "AUDIT": 7,
        "OPERATIONS": 8,
        "FINANCE": 9,
        "SUPPORT": 10,
    }

    _ref_id_to_code: Dict[int, str] = {
        1: "ADMIN",
        2: "RETAILER",
        3: "DISTRIBUTOR",
        4: "SD",
        5: "CRM",
        6: "RM",
        7: "AUDIT",
        8: "OPERATIONS",
        9: "FINANCE",
        10: "SUPPORT",
    }

    _code_to_name: Dict[str, str] = {
        "ADMIN": "Admin",
        "RETAILER": "Retailer",
        "DISTRIBUTOR": "Distributor",
        "SD": "Super Distributor",
        "CRM": "CRM",
        "RM": "Regional Manager",
        "AUDIT": "Audit",
        "OPERATIONS": "Operations",
        "FINANCE": "Finance",
        "SUPPORT": "Support",
    }

    _db_loaded: bool = False

    @classmethod
    async def load_from_db(cls, db: AsyncSession, force: bool = False):
        """
        Dynamically synchronizes in-memory lookup caches directly from public.user_type.
        Ensures the database remains the authoritative single source of truth.
        """
        if cls._db_loaded and not force:
            return
        try:
            res = await db.execute(
                text("""
                    SELECT user_type_ref_id, user_type_code, user_type_name
                    FROM public.user_type
                    WHERE is_deleted = FALSE AND is_active = TRUE
                """)
            )
            rows = res.fetchall()
            if rows:
                new_c2id = {}
                new_id2c = {}
                new_c2n = {}
                for r in rows:
                    ref_id = int(r[0])
                    u_code = str(r[1]).strip().upper()
                    u_name = str(r[2]).strip()
                    new_c2id[u_code] = ref_id
                    new_id2c[ref_id] = u_code
                    new_c2n[u_code] = u_name
                cls._code_to_ref_id.update(new_c2id)
                cls._ref_id_to_code.update(new_id2c)
                cls._code_to_name.update(new_c2n)
                cls._db_loaded = True
        except Exception:
            pass

    @classmethod
    def validate_user_type(cls, user_type: Optional[str], allow_none: bool = False, allow_all: bool = False) -> Optional[str]:
        """
        Validates user type string against the authoritative User Type master.
        If invalid, raises HTTP 400 with error_code 'INVALID_USER_TYPE'.
        """
        if user_type is None or str(user_type).strip() == "":
            if allow_none:
                return None
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "success": False,
                    "error_code": "INVALID_USER_TYPE",
                    "message": "User type cannot be empty. Allowed user types: ADMIN, RM, CRM, AUDIT, OPERATIONS, FINANCE, SUPPORT, RETAILER, DISTRIBUTOR, SD"
                }
            )

        cleaned = str(user_type).strip().upper()
        if cleaned in ("PLATFORM_ADMIN", "COMPANY_ADMIN", "ADMIN_USER"):
            cleaned = "ADMIN"
        elif cleaned == "AUDITOR":
            cleaned = "AUDIT"
        elif cleaned == "CRM_EXECUTIVE":
            cleaned = "CRM"
        elif cleaned == "REGIONAL_MANAGER":
            cleaned = "RM"

        if allow_all and cleaned == "ALL":
            return "ALL"

        if cleaned not in cls.ALLOWED_USER_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "success": False,
                    "error_code": "INVALID_USER_TYPE",
                    "message": f"Invalid user type '{user_type}'. Allowed user types: ADMIN, RM, CRM, AUDIT, OPERATIONS, FINANCE, SUPPORT, RETAILER, DISTRIBUTOR, SD."
                }
            )

        return cleaned

    @classmethod
    async def get_user_type_ref_id(cls, db: Optional[AsyncSession], code: str) -> Optional[int]:
        """
        Resolves the standardized BIGINT user_type_ref_id for a given user_type_code.
        Queries database as single source of truth or falls back to dynamic cache.
        """
        if not code:
            return None
        cleaned_code = str(code).strip().upper()

        if db and not cls._db_loaded:
            await cls.load_from_db(db)

        # Check cache
        if cleaned_code in cls._code_to_ref_id:
            return cls._code_to_ref_id[cleaned_code]

        # Query database if db session is provided
        if db:
            try:
                res = await db.execute(
                    text("""
                        SELECT user_type_ref_id, user_type_code, user_type_name 
                        FROM public.user_type 
                        WHERE (UPPER(user_type_code) = :code OR UPPER(code) = :code)
                          AND is_deleted = FALSE 
                          AND is_active = TRUE
                        LIMIT 1
                    """),
                    {"code": cleaned_code}
                )
                row = res.fetchone()
                if row:
                    ref_id = int(row[0])
                    u_code = str(row[1]).upper()
                    cls._code_to_ref_id[u_code] = ref_id
                    cls._ref_id_to_code[ref_id] = u_code
                    return ref_id
            except Exception:
                pass

        return cls._code_to_ref_id.get(cleaned_code)

    @classmethod
    async def get_user_type_code(cls, db: Optional[AsyncSession], ref_id: int) -> Optional[str]:
        """
        Resolves the user_type_code for a given user_type_ref_id.
        """
        if ref_id is None:
            return None

        if db and not cls._db_loaded:
            await cls.load_from_db(db)

        if ref_id in cls._ref_id_to_code:
            return cls._ref_id_to_code[ref_id]

        if db:
            try:
                res = await db.execute(
                    text("""
                        SELECT user_type_ref_id, user_type_code 
                        FROM public.user_type 
                        WHERE user_type_ref_id = :ref_id
                          AND is_deleted = FALSE
                        LIMIT 1
                    """),
                    {"ref_id": ref_id}
                )
                row = res.fetchone()
                if row:
                    r_id = int(row[0])
                    u_code = str(row[1]).upper()
                    cls._code_to_ref_id[u_code] = r_id
                    cls._ref_id_to_code[r_id] = u_code
                    return u_code
            except Exception:
                pass

        return cls._ref_id_to_code.get(ref_id)

    @classmethod
    async def resolve_payin_user_context(
        cls,
        db: AsyncSession,
        payload: Dict[str, Any],
        request: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Authoritatively standardises PayIn transaction ownership into the 3 core reference columns:
        1. company_ref_id (BIGINT)
        2. user_type_ref_id (BIGINT)
        3. user_ref_id (BIGINT)

        Role-independent: Works seamlessly for Retailer, Distributor, Super Distributor, and Admin.
        Never hardcodes numeric user_type_ref_id.
        """
        roles = [str(r).upper() for r in (payload.get("roles") or [])]
        user_type_claim = str(payload.get("user_type") or "").upper().strip()

        # 1. Determine user type code
        target_code = "RETAILER"
        user_ref: Optional[int] = None

        if any(r in ("SUPER_ADMIN", "ADMIN", "PLATFORM_ADMIN", "FINANCE", "OPERATIONS") for r in roles) or user_type_claim == "ADMIN":
            target_code = "ADMIN"
            user_ref = payload.get("admin_user_ref_id") or payload.get("user_ref_id")
        elif any(r in ("SUPER_DISTRIBUTOR", "SD", "MASTER_DISTRIBUTOR") for r in roles) or user_type_claim == "SD":
            target_code = "SD"
            user_ref = payload.get("super_distributor_ref_id") or payload.get("user_ref_id")
        elif any(r in ("DISTRIBUTOR", "DIST") for r in roles) or user_type_claim == "DISTRIBUTOR":
            target_code = "DISTRIBUTOR"
            user_ref = payload.get("distributor_ref_id") or payload.get("user_ref_id")
        else:
            target_code = "RETAILER"
            user_ref = payload.get("retailer_ref_id") or payload.get("user_ref_id")

        # Fallback if user_ref not explicitly found in specific claim
        if user_ref is None:
            user_ref = payload.get("user_ref_id") or payload.get("retailer_ref_id")

        if user_ref is not None:
            try:
                user_ref = int(user_ref)
            except (ValueError, TypeError):
                user_ref = None

        # 2. Dynamically resolve user_type_ref_id from public.user_type
        user_type_ref_id = await cls.get_user_type_ref_id(db, target_code)

        # 3. Resolve company_ref_id
        comp_ref = payload.get("company_ref_id")
        if comp_ref is not None:
            try:
                comp_ref = int(comp_ref)
            except (ValueError, TypeError):
                comp_ref = None

        if comp_ref is None and request:
            try:
                from app.core.company_resolver import resolve_request_company_ref
                comp_ref = resolve_request_company_ref(request)
            except Exception:
                pass

        return {
            "company_ref_id": comp_ref,
            "user_type_ref_id": user_type_ref_id,
            "user_ref_id": user_ref,
            "user_type_code": target_code,
            "retailer_ref_id": user_ref if target_code == "RETAILER" else None,
            "roles": roles,
            "tenant_ref_id": payload.get("tenant_ref_id") or 1,
            "tenant_id": payload.get("tenant_id") or "TNT-1",
            "sub": payload.get("sub")
        }

    @classmethod
    async def list_user_types(cls, db: Optional[AsyncSession] = None) -> List[Dict[str, Any]]:
        """
        Returns all active User Types from the database (source of truth).
        """
        if db:
            try:
                res = await db.execute(
                    text("""
                        SELECT user_type_ref_id, user_type_code, user_type_name, description, is_active, is_deleted
                        FROM public.user_type
                        WHERE is_deleted = FALSE
                        ORDER BY user_type_ref_id ASC
                    """)
                )
                rows = res.fetchall()
                if rows:
                    results = []
                    for r in rows:
                        results.append({
                            "user_type_ref_id": r[0],
                            "user_type_code": r[1],
                            "user_type_name": r[2],
                            "code": r[1],
                            "name": r[2],
                            "description": r[3],
                            "is_active": r[4],
                            "is_deleted": r[5]
                        })
                    return results
            except Exception:
                pass

        # Fallback to standard definitions
        return [
            {"user_type_ref_id": 1, "user_type_code": "ADMIN", "user_type_name": "Admin", "code": "ADMIN", "name": "Admin", "description": "Full administrative access.", "is_active": True, "is_deleted": False},
            {"user_type_ref_id": 2, "user_type_code": "RETAILER", "user_type_name": "Retailer", "code": "RETAILER", "name": "Retailer", "description": "Retailer-level transactions and payouts.", "is_active": True, "is_deleted": False},
            {"user_type_ref_id": 3, "user_type_code": "DISTRIBUTOR", "user_type_name": "Distributor", "code": "DISTRIBUTOR", "name": "Distributor", "description": "Distributor-level transactions and mapped retailer data.", "is_active": True, "is_deleted": False},
            {"user_type_ref_id": 4, "user_type_code": "SD", "user_type_name": "Super Distributor", "code": "SD", "name": "Super Distributor", "description": "Super Distributor-level transactions and mapped hierarchy.", "is_active": True, "is_deleted": False},
            {"user_type_ref_id": 5, "user_type_code": "CRM", "user_type_name": "CRM", "code": "CRM", "name": "CRM", "description": "Customer/service/support transaction visibility according to authorization.", "is_active": True, "is_deleted": False},
            {"user_type_ref_id": 6, "user_type_code": "RM", "user_type_name": "Regional Manager", "code": "RM", "name": "Regional Manager", "description": "Regional Manager transactions for mapped retailers.", "is_active": True, "is_deleted": False},
        ]
