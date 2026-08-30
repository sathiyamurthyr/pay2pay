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
    }

    # In-memory lookup caches populated from database
    _code_to_ref_id: Dict[str, int] = {
        "ADMIN": 1,
        "RETAILER": 2,
        "DISTRIBUTOR": 3,
        "SD": 4,
        "CRM": 5,
        "RM": 6,
    }

    _ref_id_to_code: Dict[int, str] = {
        1: "ADMIN",
        2: "RETAILER",
        3: "DISTRIBUTOR",
        4: "SD",
        5: "CRM",
        6: "RM",
    }

    _code_to_name: Dict[str, str] = {
        "ADMIN": "Admin",
        "RETAILER": "Retailer",
        "DISTRIBUTOR": "Distributor",
        "SD": "Super Distributor",
        "CRM": "CRM",
        "RM": "Regional Manager",
    }

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
                    "message": "User type cannot be empty. Allowed user types: ADMIN, RETAILER, DISTRIBUTOR, SD, CRM, RM"
                }
            )

        cleaned = str(user_type).strip().upper()
        if allow_all and cleaned == "ALL":
            return "ALL"

        if cleaned not in cls.ALLOWED_USER_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "success": False,
                    "error_code": "INVALID_USER_TYPE",
                    "message": f"Invalid user type '{user_type}'. Only ADMIN, RETAILER, DISTRIBUTOR, SD, CRM, RM are allowed."
                }
            )

        return cleaned

    @classmethod
    async def get_user_type_ref_id(cls, db: Optional[AsyncSession], code: str) -> Optional[int]:
        """
        Resolves the standardized BIGINT user_type_ref_id for a given user_type_code.
        Queries database or falls back to cache.
        """
        if not code:
            return None
        cleaned_code = str(code).strip().upper()
        
        # Check cache first
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
                    ref_id = row[0]
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
                    r_id = row[0]
                    u_code = str(row[1]).upper()
                    cls._code_to_ref_id[u_code] = r_id
                    cls._ref_id_to_code[r_id] = u_code
                    return u_code
            except Exception:
                pass

        return cls._ref_id_to_code.get(ref_id)

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
