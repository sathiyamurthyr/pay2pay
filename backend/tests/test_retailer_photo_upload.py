import io
import time
import uuid
from pathlib import Path
from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient

from app.application.storage_service import BackblazeStorageService
from app.core.database import get_db
from app.core.security import create_access_token
from app.infrastructure.db.registration_models import (
    RegistrationAadhaarModel,
    RegistrationDraftModel,
)
from app.infrastructure.db.verification_models import RetailerVerificationModel
from app.main import app


class _FakeMappings:
    def __init__(self, rows):
        self._rows = rows

    def first(self):
        return self._rows[0] if self._rows else None

    def all(self):
        return list(self._rows)


class _FakeScalars:
    def __init__(self, items):
        self._items = items

    def first(self):
        return self._items[0] if self._items else None

    def all(self):
        return list(self._items)


class _FakeResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return _FakeScalars(self._items)

    def mappings(self):
        return _FakeMappings(self._items)

    def scalar_one_or_none(self):
        return self._items[0] if self._items else None

    def fetchall(self):
        return list(self._items)


class _InMemoryPhotoDB:
    def __init__(self, drafts=None, aadhaars=None, verifs=None):
        self.drafts = list(drafts or [])
        self.aadhaars = list(aadhaars or [])
        self.verifs = list(verifs or [])
        self.committed = 0

    def add(self, obj):
        if isinstance(obj, RegistrationDraftModel) and obj not in self.drafts:
            self.drafts.append(obj)
        elif isinstance(obj, RegistrationAadhaarModel) and obj not in self.aadhaars:
            self.aadhaars.append(obj)

    async def commit(self):
        self.committed += 1

    async def rollback(self):
        pass

    async def refresh(self, obj):
        pass

    async def execute(self, stmt, params=None):
        sql = str(stmt)
        if "FROM registration_drafts" in sql:
            return _FakeResult(self.drafts)
        if "FROM registration_aadhaar" in sql:
            return _FakeResult(self.aadhaars)
        if "FROM retailer_verifications" in sql:
            return _FakeResult(self.verifs)
        if "FROM company_profile" in sql or "FROM company" in sql:
            return _FakeResult([])
        return _FakeResult([])


@pytest.mark.asyncio
async def test_b2_upload_document_times_out_without_blocking_event_loop(monkeypatch):
    def slow_sync_upload(*args, **kwargs):
        time.sleep(0.5)
        return {"url": "https://example.com/slow"}

    orig_failed = BackblazeStorageService._b2_failed
    orig_until = BackblazeStorageService._b2_failed_until
    orig_api = BackblazeStorageService._api
    orig_bucket = BackblazeStorageService._bucket

    monkeypatch.setattr(BackblazeStorageService, "_upload_document_sync", staticmethod(slow_sync_upload))

    try:
        t0 = time.monotonic()
        with pytest.raises(RuntimeError, match="timed out|unavailable|failed"):
            await BackblazeStorageService.upload_document(
                file_bytes=b"\x89PNG\r\n\x1a\nfake",
                original_filename="avatar.png",
                entity_type="RET",
                content_type="image/png",
                timeout_seconds=0.1,
            )
        elapsed = time.monotonic() - t0
        assert elapsed < 0.45
        assert BackblazeStorageService._b2_failed_until > time.time()
        assert BackblazeStorageService._api is None
        assert BackblazeStorageService._bucket is None
    finally:
        BackblazeStorageService._b2_failed = orig_failed
        BackblazeStorageService._b2_failed_until = orig_until
        BackblazeStorageService._api = orig_api
        BackblazeStorageService._bucket = orig_bucket


@pytest.mark.asyncio
async def test_retailer_profile_photo_upload_persists_without_b2_and_overrides_aadhaar(monkeypatch):
    reg_id = "REG-SMSP-TEST01"
    retailer_code = "SMSP-R100001"
    tenant_id = uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")

    verif = RetailerVerificationModel(
        registration_id=reg_id,
        retailer_id=retailer_code,
        mobile_number="9876543210",
        email="smspay@retailer.test",
        retailer_name="SMSPay Store",
        tenant_id=tenant_id,
        retailer_status="ACTIVE",
        account_status="ACTIVE",
    )
    draft = RegistrationDraftModel(
        registration_id=reg_id,
        mobile_number="9876543210",
        email="smspay@retailer.test",
        tenant_id=tenant_id,
        status="KYC_APPROVED",
        draft_data={"full_name": "SMSPay Store"},
    )
    aadhaar = RegistrationAadhaarModel(
        registration_id=reg_id,
        aadhaar_masked="XXXX-XXXX-1234",
        full_name="SMSPay Store",
        photo_url="https://stale-b2.example.com/old_aadhaar.jpg",
        tenant_id=tenant_id,
    )

    db = _InMemoryPhotoDB(drafts=[draft], aadhaars=[aadhaar], verifs=[verif])

    # Fail test immediately if upload_photo ever calls blocking B2 upload_document
    async def forbidden_b2(*args, **kwargs):
        raise AssertionError("upload_photo must not block on Backblaze B2")

    monkeypatch.setattr(BackblazeStorageService, "upload_document", forbidden_b2)

    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    token = create_access_token(
        subject=str(uuid.uuid4()),
        tenant_id=str(tenant_id),
        company_id="b1e02b56-7742-4549-a4ef-31f5378f00a8",
        roles=["RETAILER"],
        retailer_id=retailer_code,
        mobile="9876543210",
        email="smspay@retailer.test",
        company_ref_id=2,
        tenant_ref_id=39,
    )

    created_paths = []
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="https://login.smspay.store") as ac:
            resp = await ac.post(
                "/api/v1/retailer/profile/photo",
                headers={"Authorization": f"Bearer {token}"},
                files={"file": ("avatar.png", io.BytesIO(b"\x89PNG\r\n\x1a\n1234"), "image/png")},
            )
            assert resp.status_code == 200, resp.text
            body = resp.json()
            assert body["success"] is True
            assert body["photo_url"].startswith("/uploads/profiles/ret_")
            assert body["photo_url"].endswith(".png")
            created_paths.append(Path(body["photo_url"].lstrip("/")))

            assert draft.draft_data["photo_url"] == body["photo_url"]
            assert draft.draft_data["avatar_url"] == body["photo_url"]
            assert aadhaar.photo_url == body["photo_url"]

            # Verify GET /api/v1/retailer/profile prioritizes custom draft photo_url even if aadhaar has a different URL
            aadhaar.photo_url = "https://stale-b2.example.com/aadhaar_portrait.jpg"
            prof_resp = await ac.get(
                "/api/v1/retailer/profile",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert prof_resp.status_code == 200, prof_resp.text
            assert prof_resp.json()["data"]["photo"]["photo_url"] == body["photo_url"]

            # Unsupported content type rejected cleanly with 415
            bad_resp = await ac.post(
                "/api/v1/retailer/profile/photo",
                headers={"Authorization": f"Bearer {token}"},
                files={"file": ("doc.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
            )
            assert bad_resp.status_code == 415
    finally:
        app.dependency_overrides.clear()
        for p in created_paths:
            if p.exists():
                p.unlink()


@pytest.mark.asyncio
async def test_retailer_profile_photo_upload_creates_draft_when_missing():
    db = _InMemoryPhotoDB()

    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    token = create_access_token(
        subject=str(uuid.uuid4()),
        tenant_id="93538c98-0b19-493c-a247-4cdb02a46c68",
        company_id="c1111111-1111-1111-1111-111111111111",
        roles=["RETAILER"],
        retailer_id="N4U-R999999",
        mobile="9123456789",
        email="n4u@retailer.test",
        company_ref_id=1,
        tenant_ref_id=1,
    )

    created_paths = []
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="https://login.near4you.store") as ac:
            resp = await ac.post(
                "/api/v1/retailer/profile/photo",
                headers={"Authorization": f"Bearer {token}"},
                files={"file": ("photo.webp", io.BytesIO(b"RIFF1234WEBP"), "image/webp")},
            )
            assert resp.status_code == 200, resp.text
            body = resp.json()
            assert body["photo_url"].startswith("/uploads/profiles/ret_")
            assert body["photo_url"].endswith(".webp")
            created_paths.append(Path(body["photo_url"].lstrip("/")))

            assert len(db.drafts) == 1
            assert db.drafts[0].registration_id == "N4U-R999999"
            assert db.drafts[0].draft_data["photo_url"] == body["photo_url"]

            unauth_resp = await ac.post(
                "/api/v1/retailer/profile/photo",
                files={"file": ("photo.png", io.BytesIO(b"\x89PNG"), "image/png")},
            )
            assert unauth_resp.status_code == 401
    finally:
        app.dependency_overrides.clear()
        for p in created_paths:
            if p.exists():
                p.unlink()
