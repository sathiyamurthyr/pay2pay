import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import get_db
from app.infrastructure.db.models import AnnouncementModel

def create_mock_announcement(
    ann_id: uuid.UUID = None,
    code: str = "ANN-2026-001",
    title: str = "Test Title",
    content: str = "Test Content",
    is_active: bool = True
) -> AnnouncementModel:
    ann = AnnouncementModel()
    ann.public_id = ann_id or uuid.uuid4()
    ann.announcement_code = code
    ann.title = title
    ann.content = content
    ann.links = [{"label": "Help", "url": "https://smspay.store"}]
    ann.display_type = "MODAL"
    ann.priority = 10
    ann.audience = "ALL_RETAILERS"
    ann.status = "ACTIVE" if is_active else "INACTIVE"
    ann.is_active = is_active
    ann.is_deleted = False
    ann.start_at = None
    ann.end_at = None
    ann.images = []
    ann.created_date = datetime.now(timezone.utc)
    ann.updated_date = datetime.now(timezone.utc)
    return ann

@pytest.fixture
def mock_db():
    session = AsyncMock()
    mock_ann = create_mock_announcement()

    # Mock execute result
    exec_result = MagicMock()
    exec_result.scalars.return_value.all.return_value = [mock_ann]
    exec_result.scalars.return_value.first.return_value = mock_ann
    session.execute.return_value = exec_result

    # Mock commit & refresh
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.add = MagicMock()
    return session, mock_ann

@pytest.mark.asyncio
async def test_get_active_announcements(mock_db):
    """Verify GET /api/v1/announcements/active returns 200 with list of active announcements."""
    session, mock_ann = mock_db
    app.dependency_overrides[get_db] = lambda: session
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/api/v1/announcements/active?audience=RETAILER")
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            assert len(data["data"]) == 1
            assert data["data"][0]["title"] == "Test Title"
    finally:
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_admin_list_announcements(mock_db):
    """Verify GET /api/v1/announcements/admin/list returns 200 with all metadata."""
    session, mock_ann = mock_db
    app.dependency_overrides[get_db] = lambda: session
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/api/v1/announcements/admin/list")
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            assert len(data["data"]) == 1
    finally:
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_admin_create_announcement(mock_db):
    """Verify POST /api/v1/announcements/admin/create creates new broadcast and returns 200."""
    session, mock_ann = mock_db
    app.dependency_overrides[get_db] = lambda: session
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "title": "New System Update",
                "header": "New System Update",
                "message": "Maintenance planned tonight",
                "body": "Maintenance planned tonight",
                "audience": "ALL_RETAILERS",
                "priority": 15,
                "display_type": "MODAL",
                "is_active": True,
                "status": "ACTIVE",
                "links": []
            }
            resp = await ac.post("/api/v1/announcements/admin/create", json=payload)
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            assert "data" in data
            assert session.add.called
            assert session.commit.called
    finally:
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_admin_toggle_announcement(mock_db):
    """Verify POST /api/v1/announcements/admin/{id}/toggle toggles active state."""
    session, mock_ann = mock_db
    app.dependency_overrides[get_db] = lambda: session
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(f"/api/v1/announcements/admin/{mock_ann.public_id}/toggle")
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            assert data["data"]["is_active"] is False  # Was True, toggled to False
            assert session.commit.called
    finally:
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_admin_enable_disable_endpoints(mock_db):
    """Verify POST enable and disable endpoints."""
    session, mock_ann = mock_db
    app.dependency_overrides[get_db] = lambda: session
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            # Enable
            enable_resp = await ac.post(f"/api/v1/announcements/admin/{mock_ann.public_id}/enable")
            assert enable_resp.status_code == 200
            assert enable_resp.json()["data"]["is_active"] is True

            # Disable
            disable_resp = await ac.post(f"/api/v1/announcements/admin/{mock_ann.public_id}/disable")
            assert disable_resp.status_code == 200
            assert disable_resp.json()["data"]["is_active"] is False
    finally:
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_admin_update_announcement(mock_db):
    """Verify PUT /api/v1/announcements/admin/{id} updates record."""
    session, mock_ann = mock_db
    app.dependency_overrides[get_db] = lambda: session
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            update_payload = {
                "title": "Updated Headline",
                "message": "Updated Content Message",
                "priority": 25,
                "is_active": True
            }
            resp = await ac.put(f"/api/v1/announcements/admin/{mock_ann.public_id}", json=update_payload)
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            assert data["data"]["title"] == "Updated Headline"
    finally:
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_admin_delete_announcement(mock_db):
    """Verify DELETE /api/v1/announcements/admin/{id} soft-deletes record."""
    session, mock_ann = mock_db
    app.dependency_overrides[get_db] = lambda: session
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.delete(f"/api/v1/announcements/admin/{mock_ann.public_id}")
            assert resp.status_code == 200
            assert resp.json()["success"] is True
            assert mock_ann.is_deleted is True
    finally:
        app.dependency_overrides.clear()
