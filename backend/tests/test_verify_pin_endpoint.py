import pytest
import uuid
from unittest.mock import AsyncMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import get_db
from app.application.dependencies import get_current_token_payload
from app.core.security import hash_password
from app.infrastructure.db.models import RetailerModel
from app.infrastructure.db.session_security_models import UserSecuritySettingsModel


class MockScalars:
    def __init__(self, items):
        self._items = items

    def all(self):
        return list(self._items)

    def first(self):
        return self._items[0] if self._items else None


class MockResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return MockScalars(self._items)

    def scalar_one_or_none(self):
        return self._items[0] if self._items else None

    def mappings(self):
        class MockMappings:
            def __init__(self, items):
                self._items = items
            def first(self):
                return self._items[0] if self._items else None
        return MockMappings(self._items)


@pytest.fixture(autouse=True)
def cleanup_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_verify_pin_invalid_format():
    user_id = str(uuid.uuid4())
    app.dependency_overrides[get_current_token_payload] = lambda: {
        "sub": user_id,
        "retailer_code": "RET001",
        "role": "RETAILER"
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        # Less than 4 digits
        res = await ac.post("/api/v1/auth/verify-pin", json={"mpin": "12"})
        assert res.status_code == 400
        assert "Security PIN must be exactly 4 numeric digits" in res.json()["detail"]

        # Non-numeric
        res2 = await ac.post("/api/v1/auth/verify-pin", json={"mpin": "abcd"})
        assert res2.status_code == 400
        assert "Security PIN must be exactly 4 numeric digits" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_verify_pin_success_existing_pin():
    user_id = uuid.uuid4()
    correct_pin = "1234"
    pin_hash = hash_password(correct_pin)

    mock_retailer = RetailerModel(
        public_id=user_id,
        retailer_code="RET001",
        mpin_hash=pin_hash,
        mpin_locked=False,
        mpin_failed_attempts=0,
        mpin_max_attempts=5,
        status="LOCKED",
        is_deleted=False
    )

    mock_db = AsyncMock()

    async def mock_execute(stmt, *args, **kwargs):
        s_str = str(stmt)
        if "retailer" in s_str.lower():
            return MockResult([mock_retailer])
        return MockResult([])

    mock_db.execute = AsyncMock(side_effect=mock_execute)
    mock_db.commit = AsyncMock()
    mock_db.add = lambda x: None

    app.dependency_overrides[get_current_token_payload] = lambda: {
        "sub": str(user_id),
        "retailer_code": "RET001",
        "role": "RETAILER"
    }
    app.dependency_overrides[get_db] = lambda: mock_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        res = await ac.post("/api/v1/auth/verify-pin", json={"mpin": correct_pin})
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "UNLOCKED"
        assert data["unlocked"] is True
        assert mock_retailer.status == "ACTIVE"
        assert mock_retailer.mpin_failed_attempts == 0


@pytest.mark.asyncio
async def test_verify_pin_auto_setup_when_no_pin():
    user_id = uuid.uuid4()
    test_pin = "4321"

    mock_retailer = RetailerModel(
        public_id=user_id,
        retailer_code="RET001",
        mpin_hash=None,
        mpin_locked=False,
        mpin_failed_attempts=0,
        mpin_max_attempts=5,
        status="LOCKED",
        is_deleted=False
    )

    mock_db = AsyncMock()

    async def mock_execute(stmt, *args, **kwargs):
        s_str = str(stmt)
        if "retailer" in s_str.lower():
            return MockResult([mock_retailer])
        return MockResult([])

    mock_db.execute = AsyncMock(side_effect=mock_execute)
    mock_db.commit = AsyncMock()
    mock_db.add = lambda x: None

    app.dependency_overrides[get_current_token_payload] = lambda: {
        "sub": str(user_id),
        "retailer_code": "RET001",
        "role": "RETAILER"
    }
    app.dependency_overrides[get_db] = lambda: mock_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        res = await ac.post("/api/v1/auth/verify-pin", json={"mpin": test_pin})
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "UNLOCKED"
        assert data["unlocked"] is True
        assert mock_retailer.mpin_hash is not None
        assert mock_retailer.status == "ACTIVE"


@pytest.mark.asyncio
async def test_verify_pin_incorrect_pin():
    user_id = uuid.uuid4()
    pin_hash = hash_password("1234")

    mock_retailer = RetailerModel(
        public_id=user_id,
        retailer_code="RET001",
        mpin_hash=pin_hash,
        mpin_locked=False,
        mpin_failed_attempts=1,
        mpin_max_attempts=5,
        status="ACTIVE",
        is_deleted=False
    )

    mock_db = AsyncMock()

    async def mock_execute(stmt, *args, **kwargs):
        s_str = str(stmt)
        if "retailer" in s_str.lower():
            return MockResult([mock_retailer])
        return MockResult([])

    mock_db.execute = AsyncMock(side_effect=mock_execute)
    mock_db.commit = AsyncMock()
    mock_db.add = lambda x: None

    app.dependency_overrides[get_current_token_payload] = lambda: {
        "sub": str(user_id),
        "retailer_code": "RET001",
        "role": "RETAILER"
    }
    app.dependency_overrides[get_db] = lambda: mock_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        res = await ac.post("/api/v1/auth/verify-pin", json={"mpin": "9999"})
        assert res.status_code == 400
        assert "Incorrect Security PIN" in res.json()["detail"]
        assert mock_retailer.mpin_failed_attempts == 2


@pytest.mark.asyncio
async def test_verify_pin_locked_out():
    user_id = uuid.uuid4()
    pin_hash = hash_password("1234")

    mock_retailer = RetailerModel(
        public_id=user_id,
        retailer_code="RET001",
        mpin_hash=pin_hash,
        mpin_locked=True,
        mpin_failed_attempts=5,
        mpin_max_attempts=5,
        status="LOCKED",
        is_deleted=False
    )

    mock_db = AsyncMock()

    async def mock_execute(stmt, *args, **kwargs):
        s_str = str(stmt)
        if "retailer" in s_str.lower():
            return MockResult([mock_retailer])
        return MockResult([])

    mock_db.execute = AsyncMock(side_effect=mock_execute)
    mock_db.commit = AsyncMock()
    mock_db.add = lambda x: None

    app.dependency_overrides[get_current_token_payload] = lambda: {
        "sub": str(user_id),
        "retailer_code": "RET001",
        "role": "RETAILER"
    }
    app.dependency_overrides[get_db] = lambda: mock_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        res = await ac.post("/api/v1/auth/verify-pin", json={"mpin": "1234"})
        assert res.status_code == 403
        assert "Transaction PIN is locked" in res.json()["detail"]
