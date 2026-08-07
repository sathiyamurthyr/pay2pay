from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.database import settings, engine, Base
from app.core.exceptions import DomainException
from app.presentation.api.v1 import (
    auth, tenants, companies, users, roles, permissions, audit, settings as sys_settings, profile, dashboard, organization, retailers, machines, settlements, developer, compliance, financial_config, settlement_intake, settlement_processing, wallet_ledger, payouts, reporting, operations, crm, fraud, finance_accounting, bpm, eip, notifications, customer, beneficiary, policy, dmt, aeps, audio, secrets, upload, verification, retailer_services, payout_workflow, ekyc, epic014_beneficiary_router
)
import app.infrastructure.db.models  # Register all models with Base.metadata
import app.infrastructure.db.payout_workflow_models
import app.infrastructure.db.ekyc_models
import app.infrastructure.db.epic014_models
import app.infrastructure.db.beneficiary_verification_models
from app.presentation.api.v1 import beneficiary_verification

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

@app.on_event("startup")
async def startup_db():
    print("ALL REGISTERED ROUTES:", [r.path for r in app.routes if hasattr(r, 'path')])
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# Enterprise CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
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
from app.presentation.api.v1 import reverse_penny_drop_router
app.include_router(beneficiary_verification.router, prefix=settings.API_V1_STR)
app.include_router(reverse_penny_drop_router.router, prefix=settings.API_V1_STR)


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
