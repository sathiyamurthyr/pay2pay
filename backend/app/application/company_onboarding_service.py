import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.infrastructure.db.registration_models import CompanyOnboardingModel

TOTAL_ONBOARDING_STEPS = 10


class CompanyOnboardingService:
    """P0 Single Source of Truth Service for Enterprise Onboarding Persistence."""

    @classmethod
    async def get_or_create_status(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        company_id: uuid.UUID,
        workspace_id: Optional[uuid.UUID] = None
    ) -> CompanyOnboardingModel:
        """Loads onboarding status from PostgreSQL database. Creates initial record if none exists."""
        stmt = select(CompanyOnboardingModel).where(
            CompanyOnboardingModel.tenant_id == tenant_id,
            CompanyOnboardingModel.company_id == company_id,
            CompanyOnboardingModel.is_deleted == False
        )
        res = await db.execute(stmt)
        record = res.scalars().first()

        if not record:
            now = datetime.now(timezone.utc)
            record = CompanyOnboardingModel(
                tenant_id=tenant_id,
                company_id=company_id,
                workspace_id=workspace_id,
                current_step=1,
                completed_steps=[],
                progress_percentage=0.0,
                status="DRAFT",
                started_at=now,
                last_saved_at=now,
                version=1,
                draft_data={}
            )
            db.add(record)
            await db.commit()
            await db.refresh(record)

        return record

    @classmethod
    async def save_step_progress(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        company_id: uuid.UUID,
        step_number: int,
        step_data: Dict[str, Any],
        is_completed: bool = True,
        is_final: bool = False,
        updated_by: Optional[uuid.UUID] = None
    ) -> CompanyOnboardingModel:
        """
        Saves step payload to database immediately on step completion.
        Recalculates progress percentage, advances current_step, and increments version.
        """
        record = await cls.get_or_create_status(db, tenant_id, company_id)

        # 1. Update draft_data snapshot
        draft_dict = dict(record.draft_data or {})
        draft_dict[f"step_{step_number}"] = step_data
        record.draft_data = draft_dict

        # 2. Update completed_steps list
        completed_set = set(record.completed_steps or [])
        if is_completed:
            completed_set.add(step_number)

        completed_list = sorted(list(completed_set))
        record.completed_steps = completed_list

        # 3. Calculate progress percentage
        progress = round((len(completed_list) / float(TOTAL_ONBOARDING_STEPS)) * 100.0, 2)
        record.progress_percentage = min(progress, 100.0)

        # 4. Advance current_step
        if is_completed and not is_final:
            next_step = step_number + 1
            if next_step > record.current_step and next_step <= TOTAL_ONBOARDING_STEPS:
                record.current_step = next_step
            if record.status in ("DRAFT", "RESET"):
                record.status = "IN_PROGRESS"

        # 5. Final Step / Completion
        if is_final or len(completed_list) >= TOTAL_ONBOARDING_STEPS or step_number >= TOTAL_ONBOARDING_STEPS:
            record.status = "COMPLETED"
            record.progress_percentage = 100.0
            record.completed_at = datetime.now(timezone.utc)

        # 6. Version & Audit Metadata
        record.version += 1
        record.last_saved_at = datetime.now(timezone.utc)
        if updated_by:
            record.updated_by = updated_by

        await db.commit()
        await db.refresh(record)
        return record

    @classmethod
    async def admin_reset_onboarding(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        company_id: uuid.UUID,
        updated_by: Optional[uuid.UUID] = None
    ) -> CompanyOnboardingModel:
        """Admin Action ONLY: Resets onboarding progress to Step 1."""
        record = await cls.get_or_create_status(db, tenant_id, company_id)
        
        now = datetime.now(timezone.utc)
        record.current_step = 1
        record.completed_steps = []
        record.progress_percentage = 0.0
        record.status = "RESET"
        record.draft_data = {}
        record.completed_at = None
        record.last_saved_at = now
        record.version += 1
        if updated_by:
            record.updated_by = updated_by

        await db.commit()
        await db.refresh(record)
        return record
