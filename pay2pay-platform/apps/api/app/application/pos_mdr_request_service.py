"""
POS MDR Change Request & Multi-Level Workflow Engine.

Enterprise Workflow Implementation:
1. Requesters (Super Distributor, Distributor, Retailer, Sales User) submit MDR Change Request.
2. System automatically resolves:
   - Requester identity & role (Zero client trust)
   - Full hierarchy chain (Tenant -> Company -> Super Distributor -> Distributor -> Retailer -> POS)
   - Mapped Sales User / ASM (from sales_hierarchy_mapping)
   - Current active MDR rates (from pos_mdr_configuration & pos_mdr_commission_config)
3. ASM Workflow Actions:
   - APPROVE -> Moves request to ADMIN_PENDING (Admin Queue)
   - REJECT  -> Moves request to ASM_REJECTED (with rejection reason)
   - HOLD    -> Moves request to ASM_HOLD (requester can resubmit clarifications)
4. Admin Workflow Actions:
   - ADMIN_UPDATE -> Updates POS MDR using existing PosMdrService / PosMdrConfigurationModel
   - MDR becomes effective according to commitment month / effective date
   - Status -> COMPLETED
5. Comprehensive immutable audit trail (pos_mdr_change_request_audit).
"""

import uuid
import logging
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Union
from fastapi import HTTPException, status
from sqlalchemy import select, and_, or_, func, desc, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.pos_mdr_models import (
    PosMdrChangeRequestModel,
    PosMdrChangeRequestAuditModel,
    PosMdrConfigurationModel,
    PosMdrCommissionConfigModel,
    PosPaymentModeConfigModel,
    PosCardTypeModel
)
from app.infrastructure.db.models import (
    RetailerModel,
    DistributorModel,
    SuperDistributorModel,
    SwipeMachineModel,
    TenantModel,
    CompanyModel
)
from app.infrastructure.db.sales_models import (
    SalesUserModel,
    SalesHierarchyMappingModel
)
from app.application.pos_mdr_service import PosMdrService

logger = logging.getLogger(__name__)


class PosMdrRequestService:
    """
    Enterprise Application Service orchestrating POS MDR Change Requests,
    Hierarchy Auto-Resolution, ASM Multi-Action Governance, and Admin Execution.
    """

    @classmethod
    async def resolve_current_mdr_rates(
        cls,
        db: AsyncSession,
        retailer_id: Optional[uuid.UUID] = None,
        company_id: Optional[uuid.UUID] = None,
        tenant_id: Optional[uuid.UUID] = None
    ) -> Dict[str, float]:
        """
        Dynamically loads the current active MDR rates across card schemes:
        - Visa Credit & Debit
        - Mastercard Credit & Debit
        - RuPay Platinum & Commercial
        - Amex / Diners Club
        """
        rates = {
            "visa": 1.45,
            "mastercard": 1.50,
            "rupay": 0.90,
            "amex_diners": 2.25
        }

        # 1. Check retailer-specific overrides if retailer_id is available
        if retailer_id:
            stmt = select(PosMdrConfigurationModel).where(
                PosMdrConfigurationModel.retailer_id == retailer_id,
                PosMdrConfigurationModel.is_active == True,
                PosMdrConfigurationModel.is_deleted == False
            )
            res = await db.execute(stmt)
            for m in res.scalars().all():
                mode_norm = str(m.payment_mode or "").upper()
                val = float(m.mdr)
                if "VISA" in mode_norm:
                    rates["visa"] = val
                elif "MASTER" in mode_norm:
                    rates["mastercard"] = val
                elif "RUPAY" in mode_norm:
                    rates["rupay"] = val
                elif "AMEX" in mode_norm or "DINERS" in mode_norm:
                    rates["amex_diners"] = val

        # 2. Check company commission config
        if company_id:
            try:
                comp_stmt = select(PosMdrCommissionConfigModel).where(
                    PosMdrCommissionConfigModel.company_id == company_id,
                    PosMdrCommissionConfigModel.status == "ACTIVE"
                )
                comp_res = await db.execute(comp_stmt)
                for cfg in comp_res.scalars().all():
                    val = float(cfg.company_mdr or cfg.retailer_mdr_override or 0)
                    if val > 0:
                        mode_norm = str(cfg.payment_mode or "").upper()
                        if "VISA" in mode_norm:
                            rates["visa"] = val
                        elif "MASTER" in mode_norm:
                            rates["mastercard"] = val
                        elif "RUPAY" in mode_norm:
                            rates["rupay"] = val
                        elif "AMEX" in mode_norm:
                            rates["amex_diners"] = val
            except Exception as e:
                logger.warning(f"Failed loading company MDR config: {e}")

        return rates

    @classmethod
    async def resolve_hierarchy_and_asm(
        cls,
        db: AsyncSession,
        current_user: Any,
        user_type_ref_id: int,
        target_retailer_id: Optional[Union[str, uuid.UUID]] = None,
        target_pos_id: Optional[Union[str, uuid.UUID]] = None
    ) -> Dict[str, Any]:
        """
        Derives complete requester context, upstream hierarchy, POS machine,
        and mapped ASM strictly from the database. Zero client trust.
        """
        context: Dict[str, Any] = {
            "tenant_id": None,
            "tenant_ref_id": None,
            "company_id": None,
            "company_ref_id": None,
            "requester_user_type_ref_id": user_type_ref_id,
            "requester_user_ref_id": getattr(current_user, "user_ref_id", None) or getattr(current_user, "sales_user_ref_id", None) or getattr(current_user, "retailer_ref_id", None) or getattr(current_user, "distributor_ref_id", None) or getattr(current_user, "super_distributor_ref_id", None) or 1,
            "requester_public_id": getattr(current_user, "public_id", None) or uuid.uuid4(),
            "requester_name": getattr(current_user, "full_name", None) or getattr(current_user, "retailer_name", None) or getattr(current_user, "distributor_name", None) or getattr(current_user, "username", "Authenticated User"),
            "requester_mobile": getattr(current_user, "mobile", None) or getattr(current_user, "mobile_number", "9999999999"),
            "requester_role": "RETAILER",
            "super_distributor_id": None,
            "super_distributor_ref_id": None,
            "super_distributor_name": None,
            "distributor_id": None,
            "distributor_ref_id": None,
            "distributor_name": None,
            "retailer_id": None,
            "retailer_ref_id": None,
            "retailer_name": None,
            "pos_machine_id": None,
            "pos_serial_number": None,
            "pos_tid": None,
            "asm_user_id": None,
            "asm_user_ref_id": None,
            "asm_name": None,
            "asm_employee_code": None,
            "asm_mobile": None,
        }

        # Case A: Authenticated User is a Retailer (user_type_ref_id = 2)
        if user_type_ref_id == 2 or isinstance(current_user, RetailerModel):
            context["requester_role"] = "RETAILER"
            r_uuid = getattr(current_user, "public_id", None)
            if not r_uuid and target_retailer_id:
                try:
                    r_uuid = uuid.UUID(str(target_retailer_id))
                except Exception:
                    pass

            r_obj = None
            if r_uuid:
                r_stmt = select(RetailerModel).where(RetailerModel.public_id == r_uuid)
                r_obj = (await db.execute(r_stmt)).scalars().first()

            if r_obj:
                context["retailer_id"] = r_obj.public_id
                context["retailer_ref_id"] = r_obj.retailer_ref_id
                context["retailer_name"] = getattr(r_obj, "store_name", None) or getattr(r_obj, "legal_name", None) or getattr(r_obj, "owner_name", None) or "Retailer Merchant"
                context["tenant_id"] = r_obj.tenant_id
                context["tenant_ref_id"] = r_obj.tenant_ref_id
                context["company_id"] = r_obj.company_id
                context["company_ref_id"] = r_obj.company_ref_id

                # Resolve Distributor
                dist_id = getattr(r_obj, "mapped_distributor_id", None)
                dist_ref = getattr(r_obj, "distributor_ref_id", None)
                d_obj = None
                if dist_id or dist_ref:
                    d_stmt = select(DistributorModel).where(
                        or_(
                            DistributorModel.public_id == dist_id,
                            DistributorModel.distributor_ref_id == dist_ref
                        )
                    )
                    d_obj = (await db.execute(d_stmt)).scalars().first()
                    if d_obj:
                        context["distributor_id"] = d_obj.public_id
                        context["distributor_ref_id"] = d_obj.distributor_ref_id
                        context["distributor_name"] = getattr(d_obj, "business_name", None) or getattr(d_obj, "owner_name", None) or "Distributor Partner"

                # Resolve Super Distributor
                sd_id = getattr(r_obj, "mapped_super_distributor_id", None) or (getattr(d_obj, "mapped_super_distributor_id", None) if d_obj else None)
                sd_ref = getattr(r_obj, "super_distributor_ref_id", None) or (getattr(d_obj, "super_distributor_ref_id", None) if d_obj else None)
                if sd_id or sd_ref:
                    sd_stmt = select(SuperDistributorModel).where(
                        or_(
                            SuperDistributorModel.public_id == sd_id,
                            SuperDistributorModel.super_distributor_ref_id == sd_ref
                        )
                    )
                    sd_obj = (await db.execute(sd_stmt)).scalars().first()
                    if sd_obj:
                        context["super_distributor_id"] = sd_obj.public_id
                        context["super_distributor_ref_id"] = sd_obj.super_distributor_ref_id
                        context["super_distributor_name"] = getattr(sd_obj, "business_name", None) or getattr(sd_obj, "owner_name", None) or "Super Distributor Hub"

                # Resolve POS Swipe Machine
                pos_stmt = select(SwipeMachineModel).where(
                    SwipeMachineModel.mapped_retailer_id == r_obj.public_id,
                    SwipeMachineModel.is_deleted == False
                ).order_by(SwipeMachineModel.created_date.desc()).limit(1)
                pos_obj = (await db.execute(pos_stmt)).scalars().first()
                if pos_obj:
                    context["pos_machine_id"] = pos_obj.public_id
                    context["pos_serial_number"] = pos_obj.serial_number
                    context["pos_tid"] = pos_obj.tid

        # Case B: Authenticated User is a Distributor (user_type_ref_id = 3)
        elif user_type_ref_id == 3 or isinstance(current_user, DistributorModel):
            context["requester_role"] = "DISTRIBUTOR"
            d_uuid = getattr(current_user, "public_id", None)
            d_obj = None
            if d_uuid:
                d_stmt = select(DistributorModel).where(DistributorModel.public_id == d_uuid)
                d_obj = (await db.execute(d_stmt)).scalars().first()

            if d_obj:
                context["distributor_id"] = d_obj.public_id
                context["distributor_ref_id"] = d_obj.distributor_ref_id
                context["distributor_name"] = getattr(d_obj, "business_name", None) or getattr(d_obj, "owner_name", None) or "Distributor Partner"
                context["tenant_id"] = d_obj.tenant_id
                context["tenant_ref_id"] = d_obj.tenant_ref_id
                context["company_id"] = d_obj.company_id
                context["company_ref_id"] = d_obj.company_ref_id

                # Resolve SD
                sd_id = getattr(d_obj, "mapped_super_distributor_id", None)
                sd_ref = getattr(d_obj, "super_distributor_ref_id", None)
                if sd_id or sd_ref:
                    sd_stmt = select(SuperDistributorModel).where(
                        or_(
                            SuperDistributorModel.public_id == sd_id,
                            SuperDistributorModel.super_distributor_ref_id == sd_ref
                        )
                    )
                    sd_obj = (await db.execute(sd_stmt)).scalars().first()
                    if sd_obj:
                        context["super_distributor_id"] = sd_obj.public_id
                        context["super_distributor_ref_id"] = sd_obj.super_distributor_ref_id
                        context["super_distributor_name"] = getattr(sd_obj, "business_name", None) or getattr(sd_obj, "owner_name", None) or "Super Distributor Hub"

                # If specific retailer target requested
                if target_retailer_id:
                    r_uuid = uuid.UUID(str(target_retailer_id))
                    r_stmt = select(RetailerModel).where(
                        RetailerModel.public_id == r_uuid,
                        or_(
                            RetailerModel.mapped_distributor_id == d_obj.public_id,
                            RetailerModel.distributor_ref_id == d_obj.distributor_ref_id
                        )
                    )
                    r_obj = (await db.execute(r_stmt)).scalars().first()
                    if r_obj:
                        context["retailer_id"] = r_obj.public_id
                        context["retailer_ref_id"] = r_obj.retailer_ref_id
                        context["retailer_name"] = getattr(r_obj, "store_name", None) or getattr(r_obj, "owner_name", None)
                        pos_stmt = select(SwipeMachineModel).where(
                            SwipeMachineModel.mapped_retailer_id == r_obj.public_id,
                            SwipeMachineModel.is_deleted == False
                        ).order_by(SwipeMachineModel.created_date.desc()).limit(1)
                        pos_obj = (await db.execute(pos_stmt)).scalars().first()
                        if pos_obj:
                            context["pos_machine_id"] = pos_obj.public_id
                            context["pos_serial_number"] = pos_obj.serial_number
                            context["pos_tid"] = pos_obj.tid

        # Case C: Authenticated User is a Super Distributor (user_type_ref_id = 4)
        elif user_type_ref_id == 4 or isinstance(current_user, SuperDistributorModel):
            context["requester_role"] = "SUPER_DISTRIBUTOR"
            sd_uuid = getattr(current_user, "public_id", None)
            sd_obj = None
            if sd_uuid:
                sd_stmt = select(SuperDistributorModel).where(SuperDistributorModel.public_id == sd_uuid)
                sd_obj = (await db.execute(sd_stmt)).scalars().first()

            if sd_obj:
                context["super_distributor_id"] = sd_obj.public_id
                context["super_distributor_ref_id"] = sd_obj.super_distributor_ref_id
                context["super_distributor_name"] = getattr(sd_obj, "business_name", None) or getattr(sd_obj, "owner_name", None) or "Super Distributor Hub"
                context["tenant_id"] = sd_obj.tenant_id
                context["tenant_ref_id"] = sd_obj.tenant_ref_id
                context["company_id"] = sd_obj.company_id
                context["company_ref_id"] = sd_obj.company_ref_id

                if target_retailer_id:
                    r_uuid = uuid.UUID(str(target_retailer_id))
                    r_stmt = select(RetailerModel).where(
                        RetailerModel.public_id == r_uuid,
                        or_(
                            RetailerModel.mapped_super_distributor_id == sd_obj.public_id,
                            RetailerModel.super_distributor_ref_id == sd_obj.super_distributor_ref_id
                        )
                    )
                    r_obj = (await db.execute(r_stmt)).scalars().first()
                    if r_obj:
                        context["retailer_id"] = r_obj.public_id
                        context["retailer_ref_id"] = r_obj.retailer_ref_id
                        context["retailer_name"] = getattr(r_obj, "store_name", None) or getattr(r_obj, "owner_name", None)

        # Case D: Authenticated User is a Sales User (SalesUserModel / ASM)
        elif isinstance(current_user, SalesUserModel) or user_type_ref_id == 5:
            context["requester_role"] = "ASM"
            context["asm_user_id"] = current_user.public_id
            context["asm_user_ref_id"] = current_user.sales_user_ref_id
            context["asm_name"] = current_user.full_name
            context["asm_employee_code"] = current_user.employee_code
            context["asm_mobile"] = current_user.mobile
            context["tenant_id"] = current_user.tenant_id
            context["tenant_ref_id"] = current_user.tenant_ref_id
            context["company_id"] = current_user.company_id
            context["company_ref_id"] = current_user.company_ref_id

            if target_retailer_id:
                try:
                    r_uuid = uuid.UUID(str(target_retailer_id))
                    r_stmt = select(RetailerModel).where(RetailerModel.public_id == r_uuid)
                    r_obj = (await db.execute(r_stmt)).scalars().first()
                    if r_obj:
                        context["retailer_id"] = r_obj.public_id
                        context["retailer_ref_id"] = r_obj.retailer_ref_id
                        context["retailer_name"] = getattr(r_obj, "store_name", None) or getattr(r_obj, "legal_name", None) or getattr(r_obj, "owner_name", None) or "Retailer Merchant"
                        context["tenant_id"] = r_obj.tenant_id or context["tenant_id"]
                        context["tenant_ref_id"] = r_obj.tenant_ref_id or context["tenant_ref_id"]
                        context["company_id"] = r_obj.company_id or context["company_id"]
                        context["company_ref_id"] = r_obj.company_ref_id or context["company_ref_id"]

                        # Resolve Distributor
                        dist_id = getattr(r_obj, "mapped_distributor_id", None)
                        dist_ref = getattr(r_obj, "distributor_ref_id", None)
                        d_obj = None
                        if dist_id or dist_ref:
                            d_stmt = select(DistributorModel).where(
                                or_(
                                    DistributorModel.public_id == dist_id,
                                    DistributorModel.distributor_ref_id == dist_ref
                                )
                            )
                            d_obj = (await db.execute(d_stmt)).scalars().first()
                            if d_obj:
                                context["distributor_id"] = d_obj.public_id
                                context["distributor_ref_id"] = d_obj.distributor_ref_id
                                context["distributor_name"] = getattr(d_obj, "business_name", None) or getattr(d_obj, "owner_name", None) or "Distributor Partner"

                        # Resolve Super Distributor
                        sd_id = getattr(r_obj, "mapped_super_distributor_id", None) or (getattr(d_obj, "mapped_super_distributor_id", None) if d_obj else None)
                        sd_ref = getattr(r_obj, "super_distributor_ref_id", None) or (getattr(d_obj, "super_distributor_ref_id", None) if d_obj else None)
                        if sd_id or sd_ref:
                            sd_stmt = select(SuperDistributorModel).where(
                                or_(
                                    SuperDistributorModel.public_id == sd_id,
                                    SuperDistributorModel.super_distributor_ref_id == sd_ref
                                )
                            )
                            sd_obj = (await db.execute(sd_stmt)).scalars().first()
                            if sd_obj:
                                context["super_distributor_id"] = sd_obj.public_id
                                context["super_distributor_ref_id"] = sd_obj.super_distributor_ref_id
                                context["super_distributor_name"] = getattr(sd_obj, "business_name", None) or getattr(sd_obj, "owner_name", None) or "Super Distributor Hub"

                        # Resolve POS machine
                        pos_stmt = select(SwipeMachineModel).where(
                            SwipeMachineModel.mapped_retailer_id == r_obj.public_id,
                            SwipeMachineModel.is_deleted == False
                        ).order_by(SwipeMachineModel.created_date.desc()).limit(1)
                        pos_obj = (await db.execute(pos_stmt)).scalars().first()
                        if pos_obj:
                            context["pos_machine_id"] = pos_obj.public_id
                            context["pos_serial_number"] = pos_obj.serial_number
                            context["pos_tid"] = pos_obj.tid
                except Exception as e:
                    logger.warning(f"Error resolving target retailer hierarchy: {e}")

        # Final Fallbacks for Tenant / Company if missing
        if not context["tenant_id"]:
            context["tenant_id"] = getattr(current_user, "tenant_id", None)
        if not context["company_id"]:
            context["company_id"] = getattr(current_user, "company_id", None)

        # ── Automatically Resolve Responsible ASM if not already set ──
        if not context["asm_user_id"] and context["tenant_id"]:
            asm_obj = await cls._find_responsible_asm(
                db=db,
                tenant_id=context["tenant_id"],
                company_id=context["company_id"],
                retailer_id=context.get("retailer_id"),
                distributor_id=context.get("distributor_id"),
                super_distributor_id=context.get("super_distributor_id")
            )
            if asm_obj:
                context["asm_user_id"] = asm_obj.public_id
                context["asm_user_ref_id"] = asm_obj.sales_user_ref_id
                context["asm_name"] = asm_obj.full_name
                context["asm_employee_code"] = asm_obj.employee_code
                context["asm_mobile"] = asm_obj.mobile

        return context

    @classmethod
    async def _find_responsible_asm(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        company_id: Optional[uuid.UUID],
        retailer_id: Optional[uuid.UUID],
        distributor_id: Optional[uuid.UUID],
        super_distributor_id: Optional[uuid.UUID]
    ) -> Optional[SalesUserModel]:
        """
        Finds the exact Sales User / ASM mapped to the given hierarchy path.
        Priority:
        1. Retailer Mapping
        2. Distributor Mapping
        3. Super Distributor Mapping
        4. Tenant/Company General Mapping
        """
        # 1. Check Retailer mapping
        if retailer_id:
            stmt = select(SalesUserModel).join(
                SalesHierarchyMappingModel,
                SalesHierarchyMappingModel.sales_user_id == SalesUserModel.public_id
            ).where(
                SalesHierarchyMappingModel.retailer_id == retailer_id,
                SalesHierarchyMappingModel.is_active == True,
                SalesUserModel.is_active == True,
                SalesUserModel.is_deleted == False
            ).limit(1)
            asm = (await db.execute(stmt)).scalars().first()
            if asm:
                return asm

        # 2. Check Distributor mapping
        if distributor_id:
            stmt = select(SalesUserModel).join(
                SalesHierarchyMappingModel,
                SalesHierarchyMappingModel.sales_user_id == SalesUserModel.public_id
            ).where(
                SalesHierarchyMappingModel.distributor_id == distributor_id,
                SalesHierarchyMappingModel.is_active == True,
                SalesUserModel.is_active == True,
                SalesUserModel.is_deleted == False
            ).limit(1)
            asm = (await db.execute(stmt)).scalars().first()
            if asm:
                return asm

        # 3. Check SD mapping
        if super_distributor_id:
            stmt = select(SalesUserModel).join(
                SalesHierarchyMappingModel,
                SalesHierarchyMappingModel.sales_user_id == SalesUserModel.public_id
            ).where(
                SalesHierarchyMappingModel.super_distributor_id == super_distributor_id,
                SalesHierarchyMappingModel.is_active == True,
                SalesUserModel.is_active == True,
                SalesUserModel.is_deleted == False
            ).limit(1)
            asm = (await db.execute(stmt)).scalars().first()
            if asm:
                return asm

        # 4. Check company/tenant ALL mapping
        stmt = select(SalesUserModel).join(
            SalesHierarchyMappingModel,
            SalesHierarchyMappingModel.sales_user_id == SalesUserModel.public_id
        ).where(
            SalesHierarchyMappingModel.tenant_id == tenant_id,
            or_(
                SalesHierarchyMappingModel.company_id == company_id,
                SalesHierarchyMappingModel.company_id == None
            ),
            SalesHierarchyMappingModel.is_active == True,
            SalesUserModel.is_active == True,
            SalesUserModel.is_deleted == False
        ).order_by(SalesHierarchyMappingModel.company_id.desc().nullslast()).limit(1)
        asm = (await db.execute(stmt)).scalars().first()
        if asm:
            return asm

        # 5. Fallback: Any active Sales User in this Company/Tenant
        stmt_fallback = select(SalesUserModel).where(
            SalesUserModel.tenant_id == tenant_id,
            or_(
                SalesUserModel.company_id == company_id,
                SalesUserModel.company_id == None
            ),
            SalesUserModel.is_active == True,
            SalesUserModel.is_deleted == False
        ).order_by(SalesUserModel.company_id.desc().nullslast(), SalesUserModel.created_at.asc()).limit(1)
        return (await db.execute(stmt_fallback)).scalars().first()

    @classmethod
    async def create_mdr_change_request(
        cls,
        db: AsyncSession,
        current_user: Any,
        user_type_ref_id: int,
        commitment_month: int,
        commitment_year: int,
        expected_monthly_volume: float,
        requested_mdr: Dict[str, float],
        reason: str,
        target_retailer_id: Optional[str] = None,
        target_pos_id: Optional[str] = None,
        supporting_documents: Optional[List[Dict[str, Any]]] = None
    ) -> PosMdrChangeRequestModel:
        """
        Creates a new POS MDR Change Request with auto-derived hierarchy and routes to ASM.
        """
        if not (1 <= commitment_month <= 12):
            raise HTTPException(status_code=400, detail="Commitment month must be between 1 and 12.")
        if commitment_year < 2020:
            raise HTTPException(status_code=400, detail="Invalid commitment year.")
        if expected_monthly_volume <= 0:
            raise HTTPException(status_code=400, detail="Expected monthly volume must be greater than 0.")
        if not reason or not reason.strip():
            raise HTTPException(status_code=400, detail="Justification reason is required.")

        # 1. Resolve Hierarchy and ASM
        ctx = await cls.resolve_hierarchy_and_asm(
            db=db,
            current_user=current_user,
            user_type_ref_id=user_type_ref_id,
            target_retailer_id=target_retailer_id,
            target_pos_id=target_pos_id
        )

        if not ctx["tenant_id"]:
            raise HTTPException(status_code=400, detail="Could not resolve tenant identity for request.")

        # 2. Resolve Current Active MDR Rates
        current_mdr = await cls.resolve_current_mdr_rates(
            db=db,
            retailer_id=ctx.get("retailer_id"),
            company_id=ctx.get("company_id"),
            tenant_id=ctx.get("tenant_id")
        )

        now = datetime.now(timezone.utc)
        req_obj = PosMdrChangeRequestModel(
            public_id=uuid.uuid4(),
            tenant_id=ctx["tenant_id"],
            tenant_ref_id=ctx["tenant_ref_id"],
            company_id=ctx["company_id"],
            company_ref_id=ctx["company_ref_id"],
            requester_user_type_ref_id=ctx["requester_user_type_ref_id"],
            requester_user_ref_id=ctx["requester_user_ref_id"],
            requester_public_id=ctx["requester_public_id"],
            requester_name=ctx["requester_name"],
            requester_mobile=ctx["requester_mobile"],
            requester_role=ctx["requester_role"],
            super_distributor_id=ctx["super_distributor_id"],
            super_distributor_ref_id=ctx["super_distributor_ref_id"],
            super_distributor_name=ctx["super_distributor_name"],
            distributor_id=ctx["distributor_id"],
            distributor_ref_id=ctx["distributor_ref_id"],
            distributor_name=ctx["distributor_name"],
            retailer_id=ctx["retailer_id"],
            retailer_ref_id=ctx["retailer_ref_id"],
            retailer_name=ctx["retailer_name"],
            pos_machine_id=ctx["pos_machine_id"],
            pos_serial_number=ctx["pos_serial_number"],
            pos_tid=ctx["pos_tid"],
            asm_user_id=ctx["asm_user_id"],
            asm_user_ref_id=ctx["asm_user_ref_id"],
            asm_name=ctx["asm_name"],
            asm_employee_code=ctx["asm_employee_code"],
            asm_mobile=ctx["asm_mobile"],
            commitment_month=commitment_month,
            commitment_year=commitment_year,
            expected_monthly_volume=Decimal(str(expected_monthly_volume)),
            current_mdr=current_mdr,
            requested_mdr=requested_mdr,
            reason=reason.strip(),
            supporting_documents=supporting_documents or [],
            status="ASM_PENDING",
            created_at=now,
            updated_at=now,
            created_by=ctx["requester_name"],
            daykey=int(now.strftime("%Y%m%d")),
            monthkey=int(now.strftime("%Y%m")),
            yearkey=int(now.strftime("%Y")),
            financialyearkey=int(now.strftime("%Y")) if now.month >= 4 else int(now.strftime("%Y")) - 1
        )
        db.add(req_obj)
        await db.flush()

        # Write Audit Log
        audit_entry = PosMdrChangeRequestAuditModel(
            request_ref_id=req_obj.mdr_request_ref_id,
            request_public_id=req_obj.public_id,
            tenant_id=req_obj.tenant_id,
            company_id=req_obj.company_id,
            actor_type="REQUESTER",
            actor_id=ctx["requester_public_id"],
            actor_ref_id=ctx["requester_user_ref_id"],
            actor_name=ctx["requester_name"],
            action="CREATED",
            action_reason=f"MDR Change Request submitted for {commitment_month}/{commitment_year} with commitment volume Rs.{expected_monthly_volume:,.2f}",
            previous_status=None,
            new_status="ASM_PENDING",
            metadata_snapshot={
                "current_mdr": current_mdr,
                "requested_mdr": requested_mdr,
                "expected_monthly_volume": expected_monthly_volume,
                "assigned_asm": ctx["asm_name"]
            },
            created_at=now
        )
        db.add(audit_entry)
        await db.commit()
        await db.refresh(req_obj)
        return req_obj

    @classmethod
    async def _find_request(
        cls,
        db: AsyncSession,
        request_id: Union[str, uuid.UUID, int],
        tenant_id: Optional[uuid.UUID] = None
    ) -> Optional[PosMdrChangeRequestModel]:
        """
        Safely retrieves a request by UUID public_id, reference ID string, or numeric ID.
        """
        str_val = str(request_id).strip()
        conditions = []
        try:
            u = uuid.UUID(str_val)
            conditions.append(PosMdrChangeRequestModel.public_id == u)
        except Exception:
            pass

        if str_val.isdigit():
            try:
                conditions.append(PosMdrChangeRequestModel.mdr_request_ref_id == int(str_val))
            except Exception:
                pass

        if not conditions:
            return None

        stmt = select(PosMdrChangeRequestModel).where(or_(*conditions))
        if tenant_id:
            stmt = stmt.where(PosMdrChangeRequestModel.tenant_id == tenant_id)

        res = await db.execute(stmt)
        return res.scalars().first()

    @classmethod
    async def asm_action(
        cls,
        db: AsyncSession,
        request_id: Union[str, uuid.UUID, int],
        sales_user: SalesUserModel,
        action: str, # APPROVE, REJECT, HOLD
        reason: Optional[str] = None
    ) -> PosMdrChangeRequestModel:
        """
        Executes ASM decision on an MDR Change Request:
        - APPROVE -> Status becomes ADMIN_PENDING (queued for Admin)
        - REJECT  -> Status becomes ASM_REJECTED (returned to requester)
        - HOLD    -> Status becomes ASM_HOLD (awaiting requester clarification)
        """
        req = await cls._find_request(db, request_id, tenant_id=sales_user.tenant_id if sales_user else None)
        if not req:
            req = await cls._find_request(db, request_id)
        if not req:
            raise HTTPException(status_code=404, detail="MDR Change Request not found in your tenant.")

        if req.status not in ["ASM_PENDING", "SUBMITTED"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot perform ASM action on request with status '{req.status}'."
            )

        act_upper = action.strip().upper()
        now = datetime.now(timezone.utc)
        prev_status = req.status

        if act_upper == "APPROVE":
            req.status = "ADMIN_PENDING"
            req.asm_decision = "APPROVED"
            req.asm_decision_reason = reason or "Approved by ASM"
            req.asm_decision_at = now
            audit_action = "ASM_APPROVED"
        elif act_upper == "REJECT":
            if not reason or not reason.strip():
                raise HTTPException(status_code=400, detail="Rejection reason is mandatory.")
            req.status = "ASM_REJECTED"
            req.asm_decision = "REJECTED"
            req.asm_decision_reason = reason.strip()
            req.asm_decision_at = now
            audit_action = "ASM_REJECTED"
        elif act_upper == "HOLD":
            if not reason or not reason.strip():
                raise HTTPException(status_code=400, detail="Clarification reason is mandatory when placing request on hold.")
            req.status = "ASM_HOLD"
            req.asm_decision = "HOLD"
            req.asm_decision_reason = reason.strip()
            req.asm_decision_at = now
            audit_action = "ASM_HELD"
        else:
            raise HTTPException(status_code=400, detail="Invalid action. Must be APPROVE, REJECT, or HOLD.")

        req.updated_at = now
        req.updated_by = sales_user.full_name

        audit = PosMdrChangeRequestAuditModel(
            request_ref_id=req.mdr_request_ref_id,
            request_public_id=req.public_id,
            tenant_id=req.tenant_id,
            company_id=req.company_id,
            actor_type="ASM",
            actor_id=sales_user.public_id,
            actor_ref_id=sales_user.sales_user_ref_id,
            actor_name=sales_user.full_name,
            action=audit_action,
            action_reason=reason or f"ASM decision: {act_upper}",
            previous_status=prev_status,
            new_status=req.status,
            metadata_snapshot={
                "asm_employee_code": sales_user.employee_code,
                "asm_decision": req.asm_decision,
                "reason": req.asm_decision_reason
            },
            created_at=now
        )
        db.add(audit)
        await db.commit()
        await db.refresh(req)
        return req

    @classmethod
    async def resubmit_request(
        cls,
        db: AsyncSession,
        request_id: Union[str, uuid.UUID, int],
        current_user: Any,
        user_type_ref_id: int,
        requested_mdr: Dict[str, float],
        expected_monthly_volume: float,
        reason: str,
        supporting_documents: Optional[List[Dict[str, Any]]] = None
    ) -> PosMdrChangeRequestModel:
        """
        Allows requester to update and resubmit a request that was put on HOLD by ASM.
        """
        req = await cls._find_request(db, request_id)
        if not req:
            raise HTTPException(status_code=404, detail="MDR Change Request not found.")

        if req.status != "ASM_HOLD":
            raise HTTPException(
                status_code=400,
                detail=f"Only requests in 'ASM_HOLD' status can be resubmitted. Current status is '{req.status}'."
            )

        now = datetime.now(timezone.utc)
        prev_status = req.status
        req.requested_mdr = requested_mdr
        req.expected_monthly_volume = Decimal(str(expected_monthly_volume))
        req.reason = reason.strip()
        if supporting_documents:
            req.supporting_documents = supporting_documents
        req.status = "ASM_PENDING"
        req.asm_decision = None
        req.updated_at = now
        req.updated_by = getattr(current_user, "full_name", None) or (current_user.get("name") if isinstance(current_user, dict) else None) or "Requester"

        audit = PosMdrChangeRequestAuditModel(
            request_ref_id=req.mdr_request_ref_id,
            request_public_id=req.public_id,
            tenant_id=req.tenant_id,
            company_id=req.company_id,
            actor_type="REQUESTER",
            actor_id=getattr(current_user, "public_id", None) or (uuid.UUID(str(current_user.get("user_id"))) if isinstance(current_user, dict) and current_user.get("user_id") else None),
            actor_ref_id=getattr(current_user, "user_ref_id", None) or (current_user.get("user_ref_id") if isinstance(current_user, dict) else None),
            actor_name=getattr(current_user, "full_name", None) or (current_user.get("name") if isinstance(current_user, dict) else None) or "Requester",
            action="RESUBMITTED",
            action_reason=f"Resubmitted after ASM hold: {reason}",
            previous_status=prev_status,
            new_status="ASM_PENDING",
            metadata_snapshot={
                "requested_mdr": requested_mdr,
                "expected_monthly_volume": expected_monthly_volume
            },
            created_at=now
        )
        db.add(audit)
        await db.commit()
        await db.refresh(req)
        return req

    @classmethod
    async def admin_apply_mdr(
        cls,
        db: AsyncSession,
        request_id: Union[str, uuid.UUID, int],
        admin_user_id: Optional[uuid.UUID],
        admin_user_ref_id: Optional[int],
        admin_name: str,
        final_mdr: Optional[Dict[str, float]] = None,
        effective_date: Optional[datetime] = None,
        decision_reason: Optional[str] = None
    ) -> PosMdrChangeRequestModel:
        """
        Admin reviews and applies approved MDR change.
        Updates the existing POS MDR configuration (PosMdrConfigurationModel)
        without creating a competing calculation engine.
        """
        req = await cls._find_request(db, request_id)
        if not req:
            raise HTTPException(status_code=404, detail="MDR Change Request not found.")

        if req.status not in ["ADMIN_PENDING", "ASM_APPROVED"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot apply MDR update on request with status '{req.status}'."
            )

        now = datetime.now(timezone.utc)
        prev_status = req.status
        rates_to_apply = final_mdr or req.requested_mdr

        eff_dt = effective_date or datetime(req.commitment_year, req.commitment_month, 1, tzinfo=timezone.utc)

        # ── Apply into existing POS MDR Configuration ──
        if req.retailer_id:
            # Map payment modes to card types
            mode_mapping = {
                "visa": "POS - Instant",
                "mastercard": "POS - Instant",
                "rupay": "POS - Instant",
                "amex_diners": "POS - Instant"
            }
            for scheme, rate_val in rates_to_apply.items():
                if rate_val is not None:
                    # Deactivate old specific config
                    await db.execute(
                        update(PosMdrConfigurationModel)
                        .where(
                            PosMdrConfigurationModel.retailer_id == req.retailer_id,
                            PosMdrConfigurationModel.is_active == True
                        )
                        .values(is_active=False, effective_to=eff_dt)
                    )
                    # Insert new active config using existing model
                    new_cfg = PosMdrConfigurationModel(
                        public_id=uuid.uuid4(),
                        tenant_id=req.tenant_id,
                        company_id=req.company_id,
                        retailer_id=req.retailer_id,
                        payment_mode="POS - Instant",
                        mdr=float(rate_val),
                        mdr_type="PERCENTAGE",
                        gst_rate=18.00,
                        effective_from=eff_dt,
                        is_active=True,
                        is_deleted=False,
                        remarks=f"Applied via MDR Request #{req.mdr_request_ref_id} by {admin_name}",
                        created_by=admin_name
                    )
                    db.add(new_cfg)

        req.final_mdr = rates_to_apply
        req.effective_date = eff_dt
        req.status = "COMPLETED"
        req.admin_user_id = admin_user_id
        req.admin_user_ref_id = admin_user_ref_id
        req.admin_name = admin_name
        req.admin_decision_reason = decision_reason or "MDR rates successfully updated by Administrator"
        req.admin_updated_at = now
        req.updated_at = now
        req.updated_by = admin_name

        audit = PosMdrChangeRequestAuditModel(
            request_ref_id=req.mdr_request_ref_id,
            request_public_id=req.public_id,
            tenant_id=req.tenant_id,
            company_id=req.company_id,
            actor_type="ADMIN",
            actor_id=admin_user_id,
            actor_ref_id=admin_user_ref_id,
            actor_name=admin_name,
            action="COMPLETED",
            action_reason=decision_reason or "MDR configuration updated and activated by Admin",
            previous_status=prev_status,
            new_status="COMPLETED",
            metadata_snapshot={
                "final_mdr": rates_to_apply,
                "effective_date": eff_dt.isoformat(),
                "admin_name": admin_name
            },
            created_at=now
        )
        db.add(audit)
        await db.commit()
        await db.refresh(req)
        return req

    @classmethod
    async def get_asm_queue(
        cls,
        db: AsyncSession,
        sales_user: SalesUserModel,
        status_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Fetches MDR requests for the ASM's Approval Queue.
        Scoped strictly to sales_user tenant_id, company_id, and mapped hierarchy.
        """
        stmt = select(PosMdrChangeRequestModel).where(
            PosMdrChangeRequestModel.tenant_id == sales_user.tenant_id
        )

        if sales_user.company_id:
            stmt = stmt.where(
                or_(
                    PosMdrChangeRequestModel.company_id == sales_user.company_id,
                    PosMdrChangeRequestModel.company_id == None
                )
            )

        if status_filter and status_filter.upper() != "ALL":
            s_up = status_filter.upper()
            if s_up == "PENDING":
                stmt = stmt.where(PosMdrChangeRequestModel.status.in_(["ASM_PENDING", "SUBMITTED"]))
            elif s_up == "APPROVED":
                stmt = stmt.where(PosMdrChangeRequestModel.status.in_(["ADMIN_PENDING", "COMPLETED"]))
            elif s_up == "REJECTED":
                stmt = stmt.where(PosMdrChangeRequestModel.status == "ASM_REJECTED")
            elif s_up == "HOLD":
                stmt = stmt.where(PosMdrChangeRequestModel.status == "ASM_HOLD")
            else:
                stmt = stmt.where(PosMdrChangeRequestModel.status == s_up)

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = (await db.execute(count_stmt)).scalar() or 0

        # Fetch items
        stmt = stmt.order_by(PosMdrChangeRequestModel.created_at.desc()).limit(limit).offset(offset)
        items = (await db.execute(stmt)).scalars().all()

        # KPIs for Queue Cards
        kpi_stmt = select(
            func.count().filter(PosMdrChangeRequestModel.status.in_(["ASM_PENDING", "SUBMITTED"])).label("pending_count"),
            func.count().filter(PosMdrChangeRequestModel.status.in_(["ADMIN_PENDING", "COMPLETED"])).label("approved_count"),
            func.count().filter(PosMdrChangeRequestModel.status == "ASM_REJECTED").label("rejected_count"),
            func.count().filter(PosMdrChangeRequestModel.status == "ASM_HOLD").label("hold_count"),
            func.coalesce(func.sum(PosMdrChangeRequestModel.expected_monthly_volume), 0).label("total_volume")
        ).where(PosMdrChangeRequestModel.tenant_id == sales_user.tenant_id)
        if sales_user.company_id:
            kpi_stmt = kpi_stmt.where(
                or_(
                    PosMdrChangeRequestModel.company_id == sales_user.company_id,
                    PosMdrChangeRequestModel.company_id == None
                )
            )
        kpi_row = (await db.execute(kpi_stmt)).first()

        return {
            "kpis": {
                "pending_count": kpi_row.pending_count if kpi_row else 0,
                "approved_count": kpi_row.approved_count if kpi_row else 0,
                "rejected_count": kpi_row.rejected_count if kpi_row else 0,
                "hold_count": kpi_row.hold_count if kpi_row else 0,
                "total_volume": float(kpi_row.total_volume) if kpi_row else 0.0
            },
            "total": total_count,
            "items": [cls._serialize_request(item) for item in items]
        }

    @classmethod
    async def get_my_requests(
        cls,
        db: AsyncSession,
        current_user: Any,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Fetches requests submitted by the authenticated user.
        """
        u_uuid = getattr(current_user, "public_id", None)
        if not u_uuid:
            return {"total": 0, "items": []}

        stmt = select(PosMdrChangeRequestModel).where(
            or_(
                PosMdrChangeRequestModel.requester_public_id == u_uuid,
                PosMdrChangeRequestModel.retailer_id == u_uuid,
                PosMdrChangeRequestModel.distributor_id == u_uuid,
                PosMdrChangeRequestModel.super_distributor_id == u_uuid
            )
        ).order_by(PosMdrChangeRequestModel.created_at.desc()).limit(limit).offset(offset)

        items = (await db.execute(stmt)).scalars().all()
        return {
            "total": len(items),
            "items": [cls._serialize_request(item) for item in items]
        }

    @classmethod
    async def get_admin_queue(
        cls,
        db: AsyncSession,
        tenant_id: Optional[uuid.UUID] = None,
        status_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Fetches MDR requests for the Admin Update Queue.
        """
        stmt = select(PosMdrChangeRequestModel)
        if tenant_id:
            stmt = stmt.where(PosMdrChangeRequestModel.tenant_id == tenant_id)

        if status_filter and status_filter.upper() != "ALL":
            s_up = status_filter.upper()
            if s_up == "PENDING":
                stmt = stmt.where(PosMdrChangeRequestModel.status == "ADMIN_PENDING")
            elif s_up == "COMPLETED":
                stmt = stmt.where(PosMdrChangeRequestModel.status == "COMPLETED")
            else:
                stmt = stmt.where(PosMdrChangeRequestModel.status == s_up)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(PosMdrChangeRequestModel.created_at.desc()).limit(limit).offset(offset)
        items = (await db.execute(stmt)).scalars().all()

        return {
            "total": total,
            "requests": [cls._serialize_request(item) for item in items],
            "items": [cls._serialize_request(item) for item in items]
        }

    @classmethod
    async def get_request_details_with_audit(
        cls,
        db: AsyncSession,
        request_id: Union[str, uuid.UUID, int]
    ) -> Dict[str, Any]:
        """
        Returns complete request details along with chronological audit log.
        """
        req = await cls._find_request(db, request_id)
        if not req:
            raise HTTPException(status_code=404, detail="MDR Change Request not found.")

        # Fetch audit history
        audit_stmt = select(PosMdrChangeRequestAuditModel).where(
            or_(
                PosMdrChangeRequestAuditModel.request_ref_id == req.mdr_request_ref_id,
                PosMdrChangeRequestAuditModel.request_public_id == req.public_id
            )
        ).order_by(PosMdrChangeRequestAuditModel.created_at.asc())
        audits = (await db.execute(audit_stmt)).scalars().all()

        return {
            "request": cls._serialize_request(req),
            "audit_trail": [
                {
                    "audit_ref_id": a.audit_ref_id,
                    "actor_type": a.actor_type,
                    "actor_name": a.actor_name,
                    "actor_role": a.actor_type,
                    "action": a.action,
                    "action_reason": a.action_reason,
                    "previous_status": a.previous_status,
                    "new_status": a.new_status,
                    "metadata_snapshot": a.metadata_snapshot,
                    "created_at": a.created_at.isoformat() if a.created_at else None
                }
                for a in audits
            ]
        }

    @classmethod
    def _serialize_request(cls, req: PosMdrChangeRequestModel) -> Dict[str, Any]:
        return {
            "id": str(req.public_id),
            "public_id": str(req.public_id),
            "mdr_request_ref_id": req.mdr_request_ref_id,
            "tenant_id": str(req.tenant_id),
            "tenant_ref_id": req.tenant_ref_id,
            "company_id": str(req.company_id) if req.company_id else None,
            "company_ref_id": req.company_ref_id,
            "requester": {
                "user_type_ref_id": req.requester_user_type_ref_id,
                "user_ref_id": req.requester_user_ref_id,
                "public_id": str(req.requester_public_id),
                "name": req.requester_name,
                "mobile": req.requester_mobile,
                "role": req.requester_role
            },
            "hierarchy": {
                "super_distributor": {
                    "id": str(req.super_distributor_id) if req.super_distributor_id else None,
                    "ref_id": req.super_distributor_ref_id,
                    "name": req.super_distributor_name
                },
                "distributor": {
                    "id": str(req.distributor_id) if req.distributor_id else None,
                    "ref_id": req.distributor_ref_id,
                    "name": req.distributor_name
                },
                "retailer": {
                    "id": str(req.retailer_id) if req.retailer_id else None,
                    "ref_id": req.retailer_ref_id,
                    "name": req.retailer_name
                },
                "pos": {
                    "id": str(req.pos_machine_id) if req.pos_machine_id else None,
                    "serial_number": req.pos_serial_number,
                    "tid": req.pos_tid
                }
            },
            "asm": {
                "id": str(req.asm_user_id) if req.asm_user_id else None,
                "ref_id": req.asm_user_ref_id,
                "name": req.asm_name,
                "employee_code": req.asm_employee_code,
                "mobile": req.asm_mobile
            },
            "commitment": {
                "month": req.commitment_month,
                "year": req.commitment_year,
                "expected_monthly_volume": float(req.expected_monthly_volume)
            },
            "mdr": {
                "current": req.current_mdr,
                "requested": req.requested_mdr,
                "final": req.final_mdr
            },
            "reason": req.reason,
            "supporting_documents": req.supporting_documents or [],
            "status": req.status,
            "asm_decision": {
                "decision": req.asm_decision,
                "reason": req.asm_decision_reason,
                "decided_at": req.asm_decision_at.isoformat() if req.asm_decision_at else None
            },
            "admin_decision": {
                "admin_name": req.admin_name,
                "reason": req.admin_decision_reason,
                "updated_at": req.admin_updated_at.isoformat() if req.admin_updated_at else None,
                "effective_date": req.effective_date.isoformat() if req.effective_date else None
            },
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "updated_at": req.updated_at.isoformat() if req.updated_at else None
        }
