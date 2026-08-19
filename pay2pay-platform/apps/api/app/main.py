from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.database import settings, engine, Base
from app.core.exceptions import DomainException
from app.presentation.api.v1 import (
    auth, tenants, companies, users, roles, permissions, audit, settings as sys_settings, profile, dashboard, organization, retailers, machines, settlements, developer, compliance, financial_config, settlement_intake, settlement_processing, wallet_ledger, payouts, reporting, operations, crm, fraud, finance_accounting, bpm, eip, notifications, customer, beneficiary, policy, dmt, aeps, audio, secrets, upload, verification, retailer_services, payout_workflow, ekyc, epic014_beneficiary_router, customer_mpin
)
import app.infrastructure.db.models  # Register all models with Base.metadata
import app.infrastructure.db.payout_workflow_models
import app.infrastructure.db.ekyc_models
import app.infrastructure.db.epic014_models
import app.infrastructure.db.beneficiary_verification_models
import app.infrastructure.db.error_management_models as _error_management_models
import app.infrastructure.db.enterprise_payout_models as _enterprise_payout_models
import app.infrastructure.db.swipe_settlement_models as _swipe_settlement_models
import app.infrastructure.db.registration_models  # Registration Draft & KYC tables for progressive onboarding
import app.infrastructure.db.session_security_models  # Session security & PIN authentication tables
from app.presentation.api.v1 import beneficiary_verification
from app.presentation.api.v1 import enterprise_payout_execution_router
from app.presentation.api.v1 import payout_report_router
from app.presentation.api.v1 import payout_ledger_report_router
from app.presentation.api.v1 import swipe_settlement_report_router
from app.presentation.api.v1 import retailer_dashboard_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

import os
import asyncio
from pathlib import Path
from fastapi.staticfiles import StaticFiles

# Ensure uploads directory exists and mount it
uploads_dir = Path("uploads")
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

async def background_pending_reconciliation_poller():
    """
    Background job executing every 60 seconds (1 minute).
    Polls vendor status API for all PENDING transactions, updates DB status,
    and notifies retailer automatically on completion.
    """
    while True:
        try:
            await asyncio.sleep(60)
            from app.core.database import AsyncSessionLocal
            from app.application.enterprise_payout_execution_service import EnterprisePayoutExecutionService
            async with AsyncSessionLocal() as db:
                await EnterprisePayoutExecutionService.reconcile_pending_transactions(db)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[BACKGROUND POLLER WARNING] Pending reconciliation loop error: {str(e)}")

@app.on_event("startup")
async def startup_db():
    # Reload trigger for bank master 1000 limit
    print("ALL REGISTERED ROUTES:", [r.path for r in app.routes if hasattr(r, 'path')])
    try:
        async def _create_tables():
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        await asyncio.wait_for(_create_tables(), timeout=5.0)
    except asyncio.TimeoutError:
        print("[STARTUP DB WARNING] Table creation timed out (DB may be locked) — continuing startup.")
    except Exception as e:
        print(f"[STARTUP DB WARNING] Table creation notice: {str(e)}")
    asyncio.create_task(background_pending_reconciliation_poller())


# Enterprise CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.exception_handler(DomainException)
async def domain_exception_handler(request: Request, exc: DomainException):
    return JSONResponse(
        status_code=400,
        content={"success": False, "code": exc.code, "message": exc.message}
    )


# Register API v1 Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(tenants.router, prefix=settings.API_V1_STR)
app.include_router(companies.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(roles.router, prefix=settings.API_V1_STR)
app.include_router(permissions.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(sys_settings.router, prefix=settings.API_V1_STR)
app.include_router(profile.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(organization.router, prefix=settings.API_V1_STR)
app.include_router(retailers.router, prefix=settings.API_V1_STR)
app.include_router(machines.router, prefix=settings.API_V1_STR)
app.include_router(settlements.router, prefix=settings.API_V1_STR)
app.include_router(developer.router, prefix=settings.API_V1_STR)
app.include_router(compliance.router, prefix=settings.API_V1_STR)
app.include_router(financial_config.router, prefix=settings.API_V1_STR)
app.include_router(settlement_intake.router, prefix=settings.API_V1_STR)
app.include_router(settlement_processing.router, prefix=settings.API_V1_STR)
app.include_router(wallet_ledger.router, prefix=settings.API_V1_STR)
app.include_router(wallet_ledger.router, prefix="/api")
app.include_router(wallet_ledger.router, prefix="")
app.include_router(payouts.router, prefix=settings.API_V1_STR)
app.include_router(reporting.router, prefix=settings.API_V1_STR)
app.include_router(operations.router, prefix=settings.API_V1_STR)
app.include_router(crm.router, prefix=settings.API_V1_STR)
app.include_router(fraud.router, prefix=settings.API_V1_STR)
app.include_router(finance_accounting.router, prefix=settings.API_V1_STR)
app.include_router(bpm.router, prefix=settings.API_V1_STR)
app.include_router(eip.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(customer.router, prefix=settings.API_V1_STR)
app.include_router(beneficiary.router, prefix=settings.API_V1_STR)
app.include_router(beneficiary.router, prefix=f"{settings.API_V1_STR}/beneficiary", tags=["Beneficiary Context"])
app.include_router(policy.router, prefix=settings.API_V1_STR)
app.include_router(dmt.router, prefix=settings.API_V1_STR)
app.include_router(aeps.router, prefix=settings.API_V1_STR)
app.include_router(audio.router, prefix=settings.API_V1_STR)
app.include_router(secrets.router, prefix=settings.API_V1_STR)
app.include_router(upload.router, prefix=settings.API_V1_STR)
app.include_router(verification.router, prefix=settings.API_V1_STR)
app.include_router(retailer_services.router, prefix=settings.API_V1_STR)
app.include_router(payout_workflow.router, prefix=settings.API_V1_STR)
app.include_router(ekyc.router, prefix=settings.API_V1_STR)
app.include_router(epic014_beneficiary_router.router, prefix=settings.API_V1_STR)
app.include_router(customer_mpin.router, prefix=settings.API_V1_STR)
from app.presentation.api.v1 import reverse_penny_drop_router
from app.presentation.api.v1 import bulkpe_payout_router
from app.presentation.api.v1 import wowpe_payout_router
from app.presentation.api.v1 import utkaldigital_payout_router
from app.presentation.api.v1 import admin_payout_routing_router
from app.presentation.api.v1 import admin_error_management_router
from app.presentation.api.v1 import enterprise_auth_router
from app.presentation.api.v1 import transaction_router
app.include_router(beneficiary_verification.router, prefix=settings.API_V1_STR)
app.include_router(reverse_penny_drop_router.router, prefix=settings.API_V1_STR)
app.include_router(bulkpe_payout_router.router, prefix=settings.API_V1_STR)
app.include_router(wowpe_payout_router.router, prefix=settings.API_V1_STR)
app.include_router(wowpe_payout_router.notify_router)
app.include_router(utkaldigital_payout_router.router, prefix=settings.API_V1_STR)
app.include_router(utkaldigital_payout_router.router, prefix="/api")
app.include_router(admin_payout_routing_router.router, prefix=settings.API_V1_STR)
app.include_router(admin_payout_routing_router.router, prefix="/api")
app.include_router(transaction_router.router, prefix=settings.API_V1_STR)
app.include_router(transaction_router.router, prefix="/api")
app.include_router(enterprise_auth_router.router, prefix=settings.API_V1_STR)
app.include_router(enterprise_auth_router.router, prefix="/api")
app.include_router(enterprise_auth_router.router, prefix="")
app.include_router(admin_error_management_router.router, prefix=settings.API_V1_STR)
app.include_router(enterprise_payout_execution_router.router, prefix=settings.API_V1_STR)
app.include_router(payout_report_router.router, prefix=f"{settings.API_V1_STR}/payout")
app.include_router(payout_ledger_report_router.router, prefix=f"{settings.API_V1_STR}/payout")
from app.presentation.api.v1 import retailer_verification_router
from app.presentation.api.v1 import company_onboarding_router
from app.presentation.api.v1 import admin_reports_router
from app.presentation.api.v1 import portal_reports_router
from app.presentation.api.v1 import session_security_router
from app.presentation.api.v1 import report_center_router
from app.presentation.api.v1 import progressive_onboarding_router
from app.presentation.api.v1 import admin_verification_router
from app.presentation.api.v1 import announcements_router
from app.presentation.api.v1 import admin_retailer_controller

app.include_router(announcements_router.router, prefix=settings.API_V1_STR)
app.include_router(announcements_router.router, prefix="/api")
app.include_router(announcements_router.router, prefix="")
app.include_router(retailer_dashboard_router.router, prefix=settings.API_V1_STR)
app.include_router(session_security_router.router, prefix=settings.API_V1_STR)
app.include_router(report_center_router.router, prefix=settings.API_V1_STR)
app.include_router(progressive_onboarding_router.router, prefix=settings.API_V1_STR)
app.include_router(admin_verification_router.router, prefix=settings.API_V1_STR)
app.include_router(retailer_verification_router.router, prefix=settings.API_V1_STR)
app.include_router(company_onboarding_router.router, prefix=settings.API_V1_STR)
app.include_router(admin_reports_router.router, prefix=settings.API_V1_STR)
app.include_router(portal_reports_router.router, prefix=settings.API_V1_STR)
app.include_router(admin_retailer_controller.router, prefix=settings.API_V1_STR)
app.include_router(admin_retailer_controller.router, prefix="/api")
app.include_router(admin_retailer_controller.router, prefix="")
app.include_router(retailer_dashboard_router.router, prefix=f"{settings.API_V1_STR}/payout")
app.include_router(report_center_router.router, prefix=f"{settings.API_V1_STR}/payout")
app.include_router(progressive_onboarding_router.router, prefix=settings.API_V1_STR)
from app.presentation.api.v1 import retailer_profile_router
app.include_router(retailer_profile_router.router, prefix=settings.API_V1_STR)
app.include_router(retailer_profile_router.router, prefix="/api")
app.include_router(retailer_profile_router.router, prefix="")



@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/payout-workflow/health", tags=["Health"])
async def health_check():
    return {
        "status": "HEALTHY",
        "api_status": "ONLINE",
        "db_status": "HEALTHY",
        "auth_required": False,
        "search_endpoint": "/customers/?query=",
        "version": settings.VERSION
    }
