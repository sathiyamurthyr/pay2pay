import uuid
from typing import Optional, List, Dict, Any, Set
from pydantic import BaseModel, Field
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from app.infrastructure.db.models import (
    AdminUserModel, CompanyModel, SuperDistributorModel,
    DistributorModel, RetailerModel
)
from app.infrastructure.db.auth_models import AuthUserModel


class UserScopeContext(BaseModel):
    """
    Authoritative resolved scope context for the authenticated user.
    """
    user_id: uuid.UUID
    role: str
    is_unrestricted_admin: bool = False
    tenant_ids: List[uuid.UUID] = Field(default_factory=list)
    tenant_ref_ids: List[int] = Field(default_factory=list)
    company_ids: List[uuid.UUID] = Field(default_factory=list)
    company_ref_ids: List[int] = Field(default_factory=list)
    master_distributor_ids: List[uuid.UUID] = Field(default_factory=list)
    master_distributor_ref_ids: List[int] = Field(default_factory=list)
    distributor_ids: List[uuid.UUID] = Field(default_factory=list)
    distributor_ref_ids: List[int] = Field(default_factory=list)
    retailer_ids: List[uuid.UUID] = Field(default_factory=list)
    retailer_ref_ids: List[int] = Field(default_factory=list)


class OrganizationScopeService:
    """
    Centralized reusable scope resolution and authorization service.
    Enforces the organizational hierarchy:
    TENANT -> COMPANY MASTER -> MASTER DISTRIBUTOR -> DISTRIBUTOR -> RETAILER
    """

    ADMIN_ROLES = {
        "SUPER_ADMIN", "PLATFORM_ADMIN", "ROOT_ADMIN", 
        "ADMIN", "OPERATIONS_ADMIN"
    }

    @classmethod
    async def resolve_user_scope(
        cls,
        db: AsyncSession,
        current_user: Any,
        token_payload: Optional[Dict[str, Any]] = None
    ) -> UserScopeContext:
        token_payload = token_payload or {}
        roles = [str(r).upper() for r in token_payload.get("roles", [])]
        user_type = str(getattr(current_user, "user_type", "") or "").upper()
        if user_type:
            roles.append(user_type)
        user_role = str(getattr(current_user, "role", "") or "").upper()
        if user_role:
            roles.append(user_role)

        primary_role = roles[0] if roles else "RETAILER"
        is_admin = any(r in cls.ADMIN_ROLES for r in roles)
        user_id = getattr(current_user, "public_id", None) or getattr(current_user, "user_id", None) or uuid.uuid4()

        tenant_id = (
            getattr(current_user, "tenant_id", None)
            or (uuid.UUID(token_payload["tenant_id"]) if token_payload.get("tenant_id") else None)
            or uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")
        )
        tenant_ref_id = getattr(current_user, "tenant_ref_id", None) or token_payload.get("tenant_ref_id") or 1

        scope = UserScopeContext(
            user_id=user_id,
            role=primary_role,
            is_unrestricted_admin=is_admin,
            tenant_ids=[tenant_id] if tenant_id else [],
            tenant_ref_ids=[tenant_ref_id] if tenant_ref_id else []
        )

        # 1. Platform Admin / Super Admin has unrestricted scope within tenant
        if is_admin:
            return scope

        # 2. Company Admin / Scope
        company_id = getattr(current_user, "company_id", None) or (
            uuid.UUID(token_payload["company_id"]) if token_payload.get("company_id") else None
        )
        company_ref_id = getattr(current_user, "company_ref_id", None) or token_payload.get("company_ref_id")

        if company_id:
            scope.company_ids.append(company_id)
        if company_ref_id:
            scope.company_ref_ids.append(company_ref_id)

        # If Company Admin: load all downstream MDs, Distributors, and Retailers
        if "COMPANY_ADMIN" in roles and company_id:
            md_stmt = select(SuperDistributorModel.public_id, SuperDistributorModel.super_distributor_ref_id).where(
                SuperDistributorModel.company_id == company_id,
                SuperDistributorModel.is_deleted == False
            )
            md_res = await db.execute(md_stmt)
            for m in md_res.fetchall():
                scope.master_distributor_ids.append(m[0])
                if m[1]:
                    scope.master_distributor_ref_ids.append(m[1])

            dist_stmt = select(DistributorModel.public_id, DistributorModel.distributor_ref_id).where(
                DistributorModel.company_id == company_id,
                DistributorModel.is_deleted == False
            )
            dist_res = await db.execute(dist_stmt)
            for d in dist_res.fetchall():
                scope.distributor_ids.append(d[0])
                if d[1]:
                    scope.distributor_ref_ids.append(d[1])

            ret_stmt = select(RetailerModel.public_id, RetailerModel.retailer_ref_id).where(
                RetailerModel.company_id == company_id,
                RetailerModel.is_deleted == False
            )
            ret_res = await db.execute(ret_stmt)
            for r in ret_res.fetchall():
                scope.retailer_ids.append(r[0])
                if r[1]:
                    scope.retailer_ref_ids.append(r[1])
            return scope

        # 3. Master Distributor (SD) User Scope
        sd_id = token_payload.get("super_distributor_id") or token_payload.get("master_distributor_id")
        sd_ref_id = token_payload.get("super_distributor_ref_id") or token_payload.get("master_distributor_ref_id")

        if any(r in ("MASTER_DISTRIBUTOR", "SUPER_DISTRIBUTOR", "SD") for r in roles) or sd_id:
            if sd_id:
                parsed_sd_id = uuid.UUID(sd_id) if isinstance(sd_id, str) else sd_id
                scope.master_distributor_ids.append(parsed_sd_id)
            if sd_ref_id:
                scope.master_distributor_ref_ids.append(sd_ref_id)

            # Load child distributors
            if scope.master_distributor_ids:
                dist_stmt = select(DistributorModel.public_id, DistributorModel.distributor_ref_id).where(
                    DistributorModel.mapped_super_distributor_id.in_(scope.master_distributor_ids),
                    DistributorModel.is_deleted == False
                )
                dist_res = await db.execute(dist_stmt)
                for d in dist_res.fetchall():
                    scope.distributor_ids.append(d[0])
                    if d[1]:
                        scope.distributor_ref_ids.append(d[1])

            # Load child retailers under those distributors
            if scope.distributor_ids:
                ret_stmt = select(RetailerModel.public_id, RetailerModel.retailer_ref_id).where(
                    RetailerModel.mapped_distributor_id.in_(scope.distributor_ids),
                    RetailerModel.is_deleted == False
                )
                ret_res = await db.execute(ret_stmt)
                for r in ret_res.fetchall():
                    scope.retailer_ids.append(r[0])
                    if r[1]:
                        scope.retailer_ref_ids.append(r[1])
            return scope

        # 4. Distributor User Scope
        dist_id = token_payload.get("distributor_id") or (
            user_id if any(r in ("DISTRIBUTOR", "DIST") for r in roles) else None
        )
        dist_ref_id = token_payload.get("distributor_ref_id")

        if any(r in ("DISTRIBUTOR", "DIST") for r in roles) or dist_id:
            if dist_id:
                parsed_d_id = uuid.UUID(str(dist_id))
                scope.distributor_ids.append(parsed_d_id)
            if dist_ref_id:
                scope.distributor_ref_ids.append(dist_ref_id)

            # Load child retailers
            if scope.distributor_ids:
                ret_stmt = select(RetailerModel.public_id, RetailerModel.retailer_ref_id).where(
                    RetailerModel.mapped_distributor_id.in_(scope.distributor_ids),
                    RetailerModel.is_deleted == False
                )
                ret_res = await db.execute(ret_stmt)
                for r in ret_res.fetchall():
                    scope.retailer_ids.append(r[0])
                    if r[1]:
                        scope.retailer_ref_ids.append(r[1])
            return scope

        # 5. Retailer User Scope
        ret_id = token_payload.get("retailer_id") or (
            user_id if any(r in ("RETAILER", "MERCHANT") for r in roles) else None
        )
        ret_ref_id = token_payload.get("retailer_ref_id")

        if ret_id:
            parsed_ret_id = uuid.UUID(str(ret_id))
            scope.retailer_ids = [parsed_ret_id]
        if ret_ref_id:
            scope.retailer_ref_ids = [ret_ref_id]

        return scope

    @classmethod
    def enforce_scope(
        cls,
        scope: UserScopeContext,
        entity_type: str,
        entity_id: uuid.UUID
    ):
        """
        Enforces that the requested entity is within the user's authorized scope.
        Raises HTTP 403 Forbidden if not authorized.
        """
        if scope.is_unrestricted_admin:
            return

        ent = entity_type.upper()
        if ent == "TENANT":
            if entity_id not in scope.tenant_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Tenant is outside your authorized organizational scope."
                )
        elif ent in ("COMPANY", "COMPANY_MASTER"):
            if scope.company_ids and entity_id not in scope.company_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Company is outside your authorized organizational scope."
                )
        elif ent in ("MASTER_DISTRIBUTOR", "SUPER_DISTRIBUTOR"):
            if scope.master_distributor_ids and entity_id not in scope.master_distributor_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Master Distributor is outside your authorized organizational scope."
                )
        elif ent == "DISTRIBUTOR":
            if scope.distributor_ids and entity_id not in scope.distributor_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Distributor is outside your authorized organizational scope."
                )
        elif ent == "RETAILER":
            if scope.retailer_ids and entity_id not in scope.retailer_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Retailer is outside your authorized organizational scope."
                )
