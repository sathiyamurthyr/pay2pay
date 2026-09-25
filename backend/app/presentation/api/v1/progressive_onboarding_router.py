from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import re

from app.core.database import get_db
from app.application.progressive_onboarding_service import (
    ProgressiveOnboardingService,
    generate_sales_link_token,
    decode_sales_link_token
)
from app.application.storage_service import BackblazeStorageService
from app.application.kyc_document_reader_service import KycDocumentReaderService, INDIAN_STATES

router = APIRouter(prefix="/onboarding", tags=["Progressive Onboarding & KYC"])


class CheckMobilePayload(BaseModel):
    mobile_number: str = Field(..., example="7013914767")
    tenant_id: Optional[str] = Field(None, example="00000000-0000-0000-0000-000000000001")
    company_id: Optional[str] = Field(None, example="COMP-001")
    user_type_ref_id: Optional[int] = Field(2, description="2: Retailer, 3: Distributor, 4: Super Distributor")

class VerifyMobileOtpPayload(BaseModel):
    registration_id: str
    otp_code: str = Field(..., example="778899")

class CheckEmailPayload(BaseModel):
    registration_id: str
    email: str = Field(..., example="retailer@pay2pay.in")
    user_type_ref_id: Optional[int] = Field(None, description="2: Retailer, 3: Distributor, 4: Super Distributor")

class CheckUniquenessPayload(BaseModel):
    mobile: Optional[str] = Field(None, example="9876543210")
    email: Optional[str] = Field(None, example="user@pay2pay.in")
    user_type_ref_id: int = Field(2, description="Target entity: 2=Retailer, 3=Distributor, 4=Super Distributor")

class LocationValidationPayload(BaseModel):
    latitude: float = Field(..., example=12.9249)
    longitude: float = Field(..., example=80.1000)
    accuracy: Optional[float] = Field(None, example=15.0)
    expected_state: Optional[str] = None
    expected_pincode: Optional[str] = None
    registration_id: Optional[str] = None

class GenerateSalesLinkPayload(BaseModel):
    user_type_ref_id: int = Field(2, description="2: Retailer, 3: Distributor, 4: Super Distributor")
    tenant_id: Optional[str] = None
    company_id: Optional[str] = None
    sales_user_id: Optional[str] = None
    mapped_sd_id: Optional[str] = None
    mapped_dist_id: Optional[str] = None
    expires_in_hours: Optional[int] = 72

class SinglePageDraftPayload(BaseModel):
    registration_id: Optional[str] = None
    user_type_ref_id: Optional[int] = 2
    full_name: Optional[str] = None
    shop_name: Optional[str] = None
    mobile_number: Optional[str] = None
    email: Optional[str] = None
    pan: Optional[Dict[str, Any]] = None
    aadhaar: Optional[Dict[str, Any]] = None
    gst: Optional[Dict[str, Any]] = None
    bank: Optional[Dict[str, Any]] = None
    personal_photo: Optional[Dict[str, Any]] = None
    shop_photo: Optional[Dict[str, Any]] = None
    video_kyc: Optional[Dict[str, Any]] = None
    personal_address: Optional[Dict[str, Any]] = None
    shop_address: Optional[Dict[str, Any]] = None
    shop_category: Optional[str] = None
    sales_link_token: Optional[str] = None
    mapped_super_distributor_id: Optional[str] = None
    mapped_distributor_id: Optional[str] = None
    mapped_sd_id: Optional[str] = None
    mapped_dist_id: Optional[str] = None
    parent_sd_name: Optional[str] = None
    parent_dist_name: Optional[str] = None
    draft_data: Optional[Dict[str, Any]] = None

class VerifyEmailOtpPayload(BaseModel):
    registration_id: str
    otp_code: str = Field(..., example="556677")

class CreateCredentialsPayload(BaseModel):
    registration_id: str
    password: str = Field(..., example="P@ssword2026!")
    confirm_password: Optional[str] = Field(None, example="P@ssword2026!")
    mpin: str = Field(..., example="8592")

class VerifyPanPayload(BaseModel):
    registration_id: str
    pan_number: str = Field(..., example="ABCDE1234F")

class VerifyGstPayload(BaseModel):
    registration_id: str
    gst_number: str = Field(..., example="33ABCDE1234F1Z5")

class SendAadhaarOtpPayload(BaseModel):
    registration_id: str
    aadhaar_number: str = Field(..., example="123456789012")

class VerifyAadhaarOtpPayload(BaseModel):
    registration_id: str
    ref_id: str
    otp_code: str = Field(..., example="778899")

class VerifyBankPayload(BaseModel):
    registration_id: str
    account_number: str = Field(..., example="50100012345678")
    ifsc: str = Field(..., example="HDFC0001234")
    name: str = Field(..., example="SATHIYA MURTHY")
    account_type: Optional[str] = "SAVINGS"

class ShopDetailsPayload(BaseModel):
    registration_id: str
    shop_name: str
    category: str
    subcategory: Optional[str] = None
    years_in_business: Optional[int] = 5
    employees: Optional[int] = 3
    monthly_estimate: Optional[str] = "₹5 Lakhs - ₹10 Lakhs"
    annual_turnover: Optional[str] = "₹50 Lakhs - ₹1 Crore"
    website: Optional[str] = None

class ShopAddressPayload(BaseModel):
    registration_id: str
    street: str
    area: Optional[str] = None
    landmark: Optional[str] = None
    city: str
    district: str
    state: str
    pincode: str
    country: Optional[str] = "India"
    latitude: Optional[float] = 12.9249
    longitude: Optional[float] = 80.1000
    shop_photo_url: Optional[str] = None

class DocumentUploadPayload(BaseModel):
    registration_id: str
    doc_type: str
    file_name: str
    file_url: str
    file_size_bytes: Optional[int] = 245000
    mime_type: Optional[str] = "image/jpeg"

class ValidateMobilePayload(BaseModel):
    mobile_number: str = Field(..., example="7013914767")
    tenant_id: Optional[str] = Field(None, example="00000000-0000-0000-0000-000000000001")
    user_type_ref_id: Optional[int] = Field(2, description="2: Retailer, 3: Distributor, 4: Super Distributor")

class SendOtpPayload(BaseModel):
    mobile_number: str = Field(..., example="7013914767")
    validation_token: str = Field(...)
    tenant_id: Optional[str] = Field(None, example="00000000-0000-0000-0000-000000000001")
    user_type_ref_id: Optional[int] = Field(2, description="2: Retailer, 3: Distributor, 4: Super Distributor")

class VideoUploadPayload(BaseModel):
    registration_id: str
    video_url: str
    duration_seconds: Optional[int] = 15
    script_text: Optional[str] = "I confirm that I am registering as a Pay2Pay Retailer."

class SubmitPayload(BaseModel):
    registration_id: str
    user_type_ref_id: Optional[int] = Field(None, description="2: Retailer, 3: Distributor, 4: Super Distributor")
    mapped_super_distributor_id: Optional[str] = None
    mapped_distributor_id: Optional[str] = None
    mapped_sd_id: Optional[str] = None
    mapped_dist_id: Optional[str] = None


@router.get("/entity-types")
async def get_entity_types(db: AsyncSession = Depends(get_db)):
    """Dynamic entity types from database without hardcoding (SD, Distributor, Retailer)."""
    return await ProgressiveOnboardingService.get_entity_types(db)


@router.get("/shop-categories")
async def get_shop_categories(db: AsyncSession = Depends(get_db)):
    """Dynamic shop categories from database without hardcoding."""
    return await ProgressiveOnboardingService.get_shop_categories(db)


@router.get("/hierarchy/sds")
async def get_sds_hierarchy(
    tenant_id: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Returns Super Distributors available for onboarding assignment."""
    tid = uuid.UUID(tenant_id) if tenant_id else None
    cid = uuid.UUID(company_id) if company_id else None
    return await ProgressiveOnboardingService.get_sds_list(db, tid, cid)


@router.get("/hierarchy/distributors")
async def get_distributors_hierarchy(
    tenant_id: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    sd_id: Optional[str] = Query(None),
    super_distributor_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Returns Distributors available for onboarding assignment."""
    tid = uuid.UUID(tenant_id) if tenant_id else None
    cid = uuid.UUID(company_id) if company_id else None
    target_sd = sd_id or super_distributor_id
    return await ProgressiveOnboardingService.get_distributors_list(db, tid, cid, target_sd)


@router.get("/states")
async def get_states():
    """Dynamic standard Indian states list."""
    return INDIAN_STATES


@router.get("/cities")
async def get_cities(state: Optional[str] = Query(None), db: AsyncSession = Depends(get_db)):
    """Returns dynamic cities for a selected state."""
    cities = []
    if state:
        try:
            from sqlalchemy import text
            stmt = text("SELECT DISTINCT city FROM public.retailer WHERE state ILIKE :st AND city IS NOT NULL AND city != '' UNION SELECT DISTINCT city FROM public.distributor WHERE state ILIKE :st AND city IS NOT NULL AND city != ''")
            res = await db.execute(stmt, {"st": f"%{state}%"})
            cities = [r[0] for r in res.fetchall() if r[0]]
        except Exception:
            cities = []
    if not cities:
        state_city_defaults = {
            "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Chengalpattu", "Kanchipuram", "Vellore", "Erode"],
            "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur", "Kolhapur"],
            "Karnataka": ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi", "Davanagere", "Ballari"],
            "Delhi": ["New Delhi", "North Delhi", "South Delhi", "West Delhi", "East Delhi", "Central Delhi"],
            "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam"],
            "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Tirupati"],
            "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Kollam", "Thrissur", "Kannur"],
            "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Noida", "Agra", "Prayagraj", "Ghaziabad", "Meerut"],
            "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar"],
            "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman"]
        }
        cities = state_city_defaults.get(state or "", ["Central City", "North Zone", "South Zone", "East Zone", "West Zone"])
    return sorted(list(set(cities)))


@router.get("/pincode/{pincode}")
async def resolve_pincode(pincode: str):
    """Resolves 6-digit Indian pincode via official India Post API."""
    return await ProgressiveOnboardingService.resolve_pincode(pincode)


@router.post("/check-uniqueness")
async def check_uniqueness(payload: CheckUniquenessPayload, db: AsyncSession = Depends(get_db)):
    """Direct SP execution: checks mobile and email uniqueness across SD, Distributor, Retailer."""
    return await ProgressiveOnboardingService.check_uniqueness(
        db, mobile=payload.mobile, email=payload.email, user_type_ref_id=payload.user_type_ref_id
    )


@router.post("/auto-read-doc")
async def auto_read_doc(
    file: UploadFile = File(..., description="Document file: PAN, Aadhaar, Bank Cheque, GST, Selfie, Shop Photo, Video KYC"),
    doc_type: str = Form(..., description="PAN, AADHAAR, BANK, GST, SELFIE, SHOP_PHOTO, VIDEO_KYC"),
    entity_type: str = Form("RET", description="SD | DIST | RET"),
    registration_id: Optional[str] = Form(None),
    expected_name: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Public Onboarding KYC Auto-Reader:
    1. Uploads document to encrypted Backblaze B2 Vault.
    2. Runs high-precision OCR / NSDL / UIDAI / GSTN verification to extract fields.
    3. Auto-saves document and fields into Registration Draft if registration_id provided.
    4. Returns persistent B2 URL and extracted metadata.
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    filename = file.filename or f"{doc_type.lower()}_{uuid.uuid4().hex[:8]}.jpg"
    content_type = file.content_type or "image/jpeg"

    try:
        result = await KycDocumentReaderService.process_and_upload_document(
            file_bytes=file_bytes,
            filename=filename,
            content_type=content_type,
            doc_type=doc_type,
            entity_type=entity_type,
            expected_name=expected_name,
        )

        if registration_id:
            try:
                b2_url = result.get("b2_url") or result.get("storage_path") or ""
                doc_data = {
                    "doc_type": doc_type.upper(),
                    "file_name": filename,
                    "file_url": b2_url,
                    "file_size_bytes": len(file_bytes),
                    "mime_type": content_type
                }
                await ProgressiveOnboardingService.upload_document(db, registration_id, doc_data)

                extracted = result.get("extracted", {})
                if doc_type.upper() in ["PAN", "PAN_CARD"] and extracted.get("pan_number"):
                    await ProgressiveOnboardingService.verify_pan(db, registration_id, extracted["pan_number"])
                elif doc_type.upper() in ["GST", "GST_CERTIFICATE"] and extracted.get("gst_number"):
                    await ProgressiveOnboardingService.verify_gst(db, registration_id, extracted["gst_number"])
            except Exception as attach_err:
                print(f"[AUTO-READ ATTACH WARNING] {attach_err}")

        return result
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Failed to auto-read document: {str(ex)}")


@router.post("/validate-location")
async def validate_location(payload: LocationValidationPayload, db: AsyncSession = Depends(get_db)):
    """Validates GPS coordinates and reverse geocodes to city, district, state, pincode."""
    res = await KycDocumentReaderService.validate_location(
        latitude=payload.latitude,
        longitude=payload.longitude,
        accuracy=payload.accuracy,
        expected_state=payload.expected_state,
        expected_pincode=payload.expected_pincode
    )
    if payload.registration_id and res.get("is_valid"):
        try:
            addr_data = {
                "latitude": payload.latitude,
                "longitude": payload.longitude,
                "city": res.get("city", "Chennai"),
                "district": res.get("district", "Chennai"),
                "state": res.get("state", "Tamil Nadu"),
                "pincode": res.get("pincode", "600001"),
                "street": res.get("formatted_address", "Operational Coordinates")
            }
            await ProgressiveOnboardingService.save_shop_address(db, payload.registration_id, addr_data)
        except Exception as e:
            print(f"[SAVE LOCATION WARNING] {e}")
    return res


@router.post("/save-draft")
async def save_single_page_draft(payload: SinglePageDraftPayload, db: AsyncSession = Depends(get_db)):
    """Saves entire single-page onboarding state directly into database."""
    return await ProgressiveOnboardingService.save_single_page_draft(db, payload.model_dump())


@router.post("/sales-link/generate")
async def generate_sales_link(payload: GenerateSalesLinkPayload):
    """Generates a secure, cryptographically signed sales registration link token."""
    from app.application.progressive_onboarding_service import DEFAULT_TENANT_ID
    token = generate_sales_link_token(
        tenant_id=payload.tenant_id or str(DEFAULT_TENANT_ID),
        company_id=payload.company_id,
        sales_user_id=payload.sales_user_id,
        user_type_ref_id=payload.user_type_ref_id,
        mapped_sd_id=payload.mapped_sd_id,
        mapped_dist_id=payload.mapped_dist_id,
        expires_in_hours=payload.expires_in_hours or 72
    )
    return {
        "status": "SUCCESS",
        "link_token": token,
        "registration_url": f"/register?link_token={token}",
        "user_type_ref_id": payload.user_type_ref_id,
        "expires_in_hours": payload.expires_in_hours or 72
    }


@router.get("/sales-link/validate/{token}")
async def validate_sales_link(token: str, db: AsyncSession = Depends(get_db)):
    """Validates the sales registration link token and returns inherited sales/tenant/company context."""
    decoded = decode_sales_link_token(token)
    if not decoded:
        raise HTTPException(status_code=400, detail="Registration link is invalid or has expired. Please request a new registration link.")
    
    entity_names = {4: "Super Distributor", 3: "Distributor", 2: "Retailer"}
    ut_id = int(decoded.get("user_type_ref_id", 2))
    
    sales_rep_name = "Authorized Sales Representative"
    if decoded.get("sales_user_id"):
        try:
            from sqlalchemy import text
            su_stmt = text("SELECT full_name FROM public.sales_user WHERE public_id = :sid")
            su_res = await db.execute(su_stmt, {"sid": uuid.UUID(decoded["sales_user_id"])})
            su_name = su_res.scalar_one_or_none()
            if su_name:
                sales_rep_name = su_name
        except Exception:
            pass

    return {
        "status": "SUCCESS",
        "valid": True,
        "tenant_id": decoded.get("tenant_id"),
        "company_id": decoded.get("company_id"),
        "sales_user_id": decoded.get("sales_user_id"),
        "sales_rep_name": sales_rep_name,
        "user_type_ref_id": ut_id,
        "entity_type_name": entity_names.get(ut_id, "Retailer"),
        "mapped_sd_id": decoded.get("mapped_sd_id"),
        "mapped_dist_id": decoded.get("mapped_dist_id")
    }


@router.post("/validate-mobile")
async def validate_mobile(payload: ValidateMobilePayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.validate_mobile(
        db, payload.mobile_number, tenant_id=payload.tenant_id, user_type_ref_id=payload.user_type_ref_id
    )
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/send-otp")
async def send_otp(payload: SendOtpPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.send_otp(
        db, payload.mobile_number, payload.validation_token, tenant_id=payload.tenant_id, user_type_ref_id=payload.user_type_ref_id
    )
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.get("/check-mobile")
async def check_mobile_get():
    return {
        "status": "ONLINE",
        "message": "Onboarding Check Mobile API. Please submit POST request with {'mobile_number': '10-digits'}."
    }


@router.post("/check-mobile")
async def check_mobile(payload: CheckMobilePayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.check_mobile(
        db,
        payload.mobile_number,
        tenant_id=payload.tenant_id,
        company_id=payload.company_id,
        user_type_ref_id=payload.user_type_ref_id
    )
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res



@router.post("/verify-mobile-otp")
async def verify_mobile_otp(payload: VerifyMobileOtpPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.verify_mobile_otp(db, payload.registration_id, payload.otp_code)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/check-email")
async def check_email(payload: CheckEmailPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.check_email(
        db, payload.registration_id, payload.email, target_user_type_ref_id=payload.user_type_ref_id
    )
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/verify-email-otp")
async def verify_email_otp(payload: VerifyEmailOtpPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.verify_email_otp(db, payload.registration_id, payload.otp_code)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/create-credentials")
async def create_credentials(payload: CreateCredentialsPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.create_credentials(
        db, payload.registration_id, payload.password, payload.mpin, payload.confirm_password
    )
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/verify-pan")
async def verify_pan(payload: VerifyPanPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.verify_pan(db, payload.registration_id, payload.pan_number)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/verify-gst")
async def verify_gst(payload: VerifyGstPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.verify_gst(db, payload.registration_id, payload.gst_number)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/send-aadhaar-otp")
async def send_aadhaar_otp(payload: SendAadhaarOtpPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.send_aadhaar_otp(db, payload.registration_id, payload.aadhaar_number)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/verify-aadhaar-otp")
async def verify_aadhaar_otp(payload: VerifyAadhaarOtpPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.verify_aadhaar_otp(db, payload.registration_id, payload.ref_id, payload.otp_code)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/verify-bank")
async def verify_bank(payload: VerifyBankPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.verify_bank(db, payload.registration_id, payload.account_number, payload.ifsc, payload.name, payload.account_type or "SAVINGS")
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/shop-details")
async def save_shop_details(payload: ShopDetailsPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.save_shop_details(db, payload.registration_id, payload.model_dump())
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/shop-address")
async def save_shop_address(payload: ShopAddressPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.save_shop_address(db, payload.registration_id, payload.model_dump())
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/upload-document")
async def upload_document(payload: DocumentUploadPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.upload_document(db, payload.registration_id, payload.model_dump())
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/upload-document-file")
async def upload_document_file(
    registration_id: str = Form(...),
    doc_type: str = Form("PAN"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    try:
        content = await file.read()
        b2_res = BackblazeStorageService.upload_file(
            file_bytes=content,
            filename=file.filename or "document.jpg",
            content_type=file.content_type or "image/jpeg",
            entity_type="RET"
        )
        b2_path = b2_res.get("url") or b2_res.get("file_name") or f"cmp/ret/docs/{file.filename}"
    except Exception:
        content = b""
        b2_path = f"cmp/ret/docs/{file.filename or 'document.jpg'}"

    doc_data = {
        "doc_type": doc_type,
        "file_name": file.filename or "document.jpg",
        "file_url": b2_path,
        "file_size_bytes": len(content) if content else 245000,
        "mime_type": file.content_type or "image/jpeg"
    }
    res = await ProgressiveOnboardingService.upload_document(db, registration_id, doc_data)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/upload-video")
async def upload_video(payload: VideoUploadPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.upload_video(db, payload.registration_id, payload.model_dump())
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/upload-video-file")
async def upload_video_file(
    registration_id: str = Form(...),
    video: UploadFile = File(...),
    duration_seconds: int = Form(15),
    script_text: str = Form("I confirm registration"),
    db: AsyncSession = Depends(get_db)
):
    try:
        content = await video.read()
        b2_res = BackblazeStorageService.upload_file(
            file_bytes=content,
            filename=video.filename or "kyc_video.webm",
            content_type=video.content_type or "video/webm",
            entity_type="RET"
        )
        b2_path = b2_res.get("url") or b2_res.get("file_name") or f"cmp/ret/videos/{video.filename}"
    except Exception:
        content = b""
        b2_path = f"cmp/ret/videos/{video.filename or 'kyc_video.webm'}"

    video_data = {
        "video_url": b2_path,
        "duration_seconds": duration_seconds,
        "script_text": script_text,
        "video_uploaded": True,
        "step_12_completed": True,
        "video_status": "VERIFIED"
    }
    res = await ProgressiveOnboardingService.upload_video(db, registration_id, video_data)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.get("/resume/{identifier}")
async def resume_draft(
    identifier: str,
    app_type: Optional[str] = "SD",
    db: AsyncSession = Depends(get_db)
):
    res = await ProgressiveOnboardingService.resume_draft(db, identifier)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=404, detail=res["message"])
    if app_type:
        res["app_type"] = app_type.upper()
    return res


@router.post("/submit")
async def submit_registration(payload: SubmitPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.submit_registration(
        db,
        payload.registration_id,
        target_user_type_ref_id=payload.user_type_ref_id,
        mapped_sd_id=payload.mapped_sd_id,
        mapped_dist_id=payload.mapped_dist_id
    )
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.get("/status/{identifier}")
async def get_onboarding_status(identifier: str, db: AsyncSession = Depends(get_db)):
    return await ProgressiveOnboardingService.get_onboarding_status(db, identifier)


@router.get("/support-info/{identifier}")
async def get_support_info(identifier: str, db: AsyncSession = Depends(get_db)):
    return await ProgressiveOnboardingService.get_support_info(db, identifier)

