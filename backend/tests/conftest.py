"""
Global Test Configuration and Fixtures

Provides shared fixtures and configuration for all tests.
Uses PostgreSQL with SQLAlchemy for database testing.
"""

# IMPORTANT: Filter deprecation warnings BEFORE any imports
# This is required to suppress various deprecation warnings raised during import time
import warnings
# Suppress ALL DeprecationWarnings during test collection and execution
# This prevents third-party library deprecations from blocking tests
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=PendingDeprecationWarning)
# passlib/crypt module deprecation (Python 3.11+)
warnings.filterwarnings("ignore", message="'crypt' is deprecated")
# Pydantic V1 style validators deprecation
warnings.filterwarnings("ignore", message=".*Pydantic V1 style.*")
# FastAPI on_event deprecation (use lifespan instead)
warnings.filterwarnings("ignore", message=".*on_event is deprecated.*")

import asyncio
import os
from typing import AsyncGenerator, Generator
from unittest.mock import MagicMock, patch, AsyncMock

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from redis import Redis

# IMPORTANT: Set test environment BEFORE importing app components
# This ensures Settings uses test configuration
os.environ["ENVIRONMENT"] = "test"

# Patch database initialization functions BEFORE importing app
# This prevents production database from being initialized during tests
_mock_init_db = AsyncMock(return_value=None)
_mock_init_redis = AsyncMock(return_value=None)
_mock_close_db = AsyncMock(return_value=None)
_mock_close_redis = AsyncMock(return_value=None)

_patch_init_db = patch('app.db.database.init_db', _mock_init_db)
_patch_init_redis = patch('app.db.redis.init_redis', _mock_init_redis)
_patch_close_db = patch('app.db.database.close_db', _mock_close_db)
_patch_close_redis = patch('app.db.redis.close_redis', _mock_close_redis)

_patch_init_db.start()
_patch_init_redis.start()
_patch_close_db.start()
_patch_close_redis.start()

from app.core.config import get_settings
from app.db.models.base import Base
from app.db.database import get_db
from app.api.v1.deps import get_db_session
from app.main import app

settings = get_settings()

# Configure pytest-asyncio
pytest_plugins = (
    'pytest_asyncio',
    'tests.fixtures.assistants',
)

def pytest_configure(config):
    """Configure pytest with asyncio settings."""
    config.option.asyncio_mode = "auto"


# =============================================================================
# PostgreSQL Database Fixtures
# =============================================================================

# Test database URL (use a separate test database)
TEST_DATABASE_URL = (
    f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
    f"@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}_test"
)


@pytest.fixture(scope="session")
def test_engine():
    """
    Create test database engine.
    """
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=NullPool,  # Use NullPool for tests to avoid connection issues
        echo=False,
    )
    return engine


@pytest_asyncio.fixture(scope="session")
async def setup_database(test_engine):
    """
    Setup test database - create all tables.
    """
    async with test_engine.begin() as conn:
        # Use checkfirst=True to avoid "already exists" errors
        await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn, checkfirst=True))

    yield

    # Cleanup: drop all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="session")
def test_session_factory(test_engine):
    """
    Create test session factory.
    """
    return async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )


@pytest_asyncio.fixture(scope="function")
async def db_session(test_session_factory, setup_database) -> AsyncGenerator[AsyncSession, None]:
    """
    Get test database session for each test.
    Wraps each test in a transaction that gets rolled back.
    """
    async with test_session_factory() as session:
        yield session
        # Rollback any uncommitted changes after each test
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def clean_db(db_session: AsyncSession):
    """
    Clean database before each test by truncating all tables.
    """
    # Truncate all tables (preserve schema)
    for table in reversed(Base.metadata.sorted_tables):
        await db_session.execute(table.delete())
    await db_session.commit()

    yield db_session


# =============================================================================
# Redis Fixtures
# =============================================================================

@pytest.fixture(scope="session")
def redis_client() -> Generator[Redis, None, None]:
    """
    Create Redis client for tests.
    """
    # Parse Redis URL or use defaults
    redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')

    # Use a different database for tests (db 15)
    client = Redis.from_url(
        redis_url.rsplit('/', 1)[0] + '/15',  # Use db 15 for tests
        decode_responses=True,
    )
    yield client
    # Cleanup: flush test database
    client.flushdb()
    client.close()


@pytest.fixture(scope="function")
def clean_redis(redis_client: Redis) -> Generator[Redis, None, None]:
    """
    Clean Redis before each test.
    """
    redis_client.flushdb()
    yield redis_client
    redis_client.flushdb()


# =============================================================================
# HTTP Client Fixtures
# =============================================================================

@pytest_asyncio.fixture(scope="function")
async def async_client(clean_db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Create async HTTP client for testing FastAPI endpoints.

    Overrides database dependencies to use clean test database session.
    The app's init_db/init_redis functions are already mocked at module level
    to prevent production database initialization.
    """
    # Override the database dependencies to use clean db session
    async def override_get_db():
        yield clean_db

    async def override_get_db_session():
        yield clean_db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_db_session] = override_get_db_session

    # Use AsyncClient with follow_redirects=True
    async with AsyncClient(
        app=app,
        base_url="http://test",
        follow_redirects=True
    ) as client:
        yield client

    # Clear overrides after test
    app.dependency_overrides.clear()


# =============================================================================
# Celery Fixtures
# =============================================================================

@pytest.fixture(scope="session")
def celery_config():
    """
    Celery configuration for tests.
    """
    return {
        "broker_url": getattr(settings, 'CELERY_BROKER_URL', 'redis://localhost:6379/1'),
        "result_backend": getattr(settings, 'CELERY_RESULT_BACKEND', 'redis://localhost:6379/1'),
        "task_always_eager": True,  # Execute tasks synchronously
        "task_eager_propagates": True,  # Propagate exceptions in eager mode
    }


@pytest.fixture(scope="session")
def mock_celery_app():
    """
    Mock Celery app for tests.
    """
    mock = MagicMock()
    mock.task.return_value = lambda f: f
    return mock


# =============================================================================
# User Fixtures
# =============================================================================

@pytest.fixture
def test_user_data():
    """
    Test user data.
    """
    return {
        "email": "test@example.com",
        "password": "xK9#mP2$vL5&wN8@qR4!",
        "full_name": "Test User",
        "is_active": True,
        "is_superuser": False,
        "is_verified": True,
    }


@pytest.fixture
def test_superuser_data():
    """
    Test superuser data.
    """
    return {
        "email": "admin@example.com",
        "password": "AdminPassword123!",
        "full_name": "Admin User",
        "is_active": True,
        "is_superuser": True,
        "is_verified": True,
    }


# =============================================================================
# Document Fixtures
# =============================================================================

@pytest.fixture
def test_document_data():
    """
    Test document data.
    """
    return {
        "original_filename": "test_document.pdf",
        "file_path": "/uploads/test_document.pdf",
        "file_size": 1024000,  # 1MB
        "file_hash": "abc123def456",
        "mime_type": "application/pdf",
        "status": "pending",
        "page_count": 10,
    }


@pytest.fixture
def test_processed_document_data():
    """
    Test processed document data.
    """
    return {
        "original_filename": "processed_document.pdf",
        "file_path": "/uploads/processed_document.pdf",
        "file_size": 2048000,  # 2MB
        "file_hash": "xyz789abc123",
        "mime_type": "application/pdf",
        "status": "completed",
        "page_count": 20,
        "extraction_result": {
            "text": "Sample extracted text",
            "confidence": 0.95,
            "metadata": {
                "author": "Test Author",
                "title": "Test Document",
            },
        },
    }


# =============================================================================
# Project Fixtures
# =============================================================================

@pytest.fixture
def test_project_data():
    """
    Test project data.
    """
    return {
        "name": "Test Project",
        "description": "A test project for unit tests",
        "settings": {
            "auto_process": True,
            "default_extraction_config": {
                "extract_tables": True,
                "extract_images": False,
            },
        },
    }


# =============================================================================
# API Key Fixtures
# =============================================================================

@pytest.fixture
def test_api_key_data():
    """
    Test API key data.
    """
    return {
        "name": "Test API Key",
        "key_prefix": "test_api",
        "is_active": True,
        "expires_at": None,
    }


# =============================================================================
# File Fixtures
# =============================================================================

@pytest.fixture
def test_pdf_file():
    """
    Create a test PDF file.
    """
    import io
    try:
        from reportlab.pdfgen import canvas

        buffer = io.BytesIO()
        p = canvas.Canvas(buffer)
        p.drawString(100, 750, "Test PDF Document")
        p.showPage()
        p.save()

        buffer.seek(0)
        return buffer
    except ImportError:
        # If reportlab is not installed, return a minimal PDF
        buffer = io.BytesIO()
        buffer.write(b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n")
        buffer.write(b"2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\n")
        buffer.write(b"xref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n")
        buffer.write(b"trailer<</Size 3/Root 1 0 R>>\nstartxref\n106\n%%EOF")
        buffer.seek(0)
        return buffer


@pytest.fixture
def test_image_file():
    """
    Create a test image file.
    """
    import io
    try:
        from PIL import Image

        image = Image.new('RGB', (100, 100), color='red')
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        buffer.seek(0)
        return buffer
    except ImportError:
        # If PIL is not installed, return a minimal PNG
        import struct
        import zlib

        buffer = io.BytesIO()

        def png_chunk(chunk_type, data):
            chunk_len = struct.pack('>I', len(data))
            chunk_crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)
            return chunk_len + chunk_type + data + chunk_crc

        # PNG signature
        buffer.write(b'\x89PNG\r\n\x1a\n')

        # IHDR chunk
        ihdr_data = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
        buffer.write(png_chunk(b'IHDR', ihdr_data))

        # IDAT chunk (1x1 red pixel)
        raw_data = b'\x00\xff\x00\x00'  # filter byte + RGB
        compressed = zlib.compress(raw_data)
        buffer.write(png_chunk(b'IDAT', compressed))

        # IEND chunk
        buffer.write(png_chunk(b'IEND', b''))

        buffer.seek(0)
        return buffer


# =============================================================================
# Mock Fixtures
# =============================================================================

@pytest.fixture
def mock_s3_client():
    """
    Mock S3 client for storage tests.
    """
    mock = MagicMock()
    mock.upload_fileobj.return_value = None
    mock.download_fileobj.return_value = None
    mock.delete_object.return_value = None
    return mock


@pytest.fixture
def mock_ocr_service():
    """
    Mock OCR service for document processing tests.
    """
    mock = MagicMock()
    mock.extract_text.return_value = {
        "text": "Sample extracted text",
        "confidence": 0.95,
        "metadata": {},
    }
    return mock


# =============================================================================
# Authentication Fixtures
# =============================================================================

@pytest_asyncio.fixture
async def test_user_token(async_client: AsyncClient, test_user_data: dict, clean_db: AsyncSession):
    """
    Create test user and return authentication token.
    Uses clean_db to ensure database is clean before each test.
    """
    from app.db.models.user import User
    from sqlalchemy import select

    # Register user (only send fields accepted by registration endpoint)
    register_data = {
        "email": test_user_data["email"],
        "password": test_user_data["password"],
        "full_name": test_user_data["full_name"],
    }
    response = await async_client.post(
        "/api/v1/auth/register",
        json=register_data,
    )
    if response.status_code != 201:
        print(f"\nRegistration failed with status {response.status_code}")
        print(f"Response body: {response.json()}")
    assert response.status_code == 201

    # Verify the user (required for endpoints using get_current_verified_user)
    result = await clean_db.execute(
        select(User).where(User.email == test_user_data["email"])
    )
    user = result.scalar_one()
    user.is_verified = True
    await clean_db.commit()
    await clean_db.refresh(user)

    # Login
    login_response = await async_client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user_data["email"],
            "password": test_user_data["password"],
        },
    )
    if login_response.status_code != 200:
        print(f"\nLogin failed with status {login_response.status_code}")
        print(f"Response body: {login_response.json()}")
    assert login_response.status_code == 200

    token_data = login_response.json()
    return token_data["data"]["access_token"]


@pytest_asyncio.fixture
async def test_superuser_token(async_client: AsyncClient, test_superuser_data: dict):
    """
    Create test superuser and return authentication token.
    """
    # Register superuser
    response = await async_client.post(
        "/api/v1/auth/register",
        json=test_superuser_data,
    )
    assert response.status_code == 201

    # Login
    login_response = await async_client.post(
        "/api/v1/auth/login",
        data={
            "username": test_superuser_data["email"],
            "password": test_superuser_data["password"],
        },
    )
    assert login_response.status_code == 200

    token_data = login_response.json()
    return token_data["data"]["access_token"]


@pytest.fixture
def auth_headers(test_user_token: str):
    """
    Get authentication headers with token.
    """
    return {"Authorization": f"Bearer {test_user_token}"}


@pytest.fixture
def superuser_headers(test_superuser_token: str):
    """
    Get authentication headers with superuser token.
    """
    return {"Authorization": f"Bearer {test_superuser_token}"}


@pytest.fixture
def other_user_data():
    """
    Test data for a second user (for testing unauthorized access).
    """
    return {
        "email": "other@example.com",
        "password": "yJ8#nQ3$wM6&vP9@rS5!",
        "full_name": "Other User",
        "is_active": True,
        "is_superuser": False,
        "is_verified": True,
    }


@pytest_asyncio.fixture
async def other_user_token(async_client: AsyncClient, other_user_data: dict, clean_db: AsyncSession):
    """
    Create second test user and return authentication token.
    Uses clean_db to ensure database is clean before each test.
    """
    from app.db.models.user import User
    from sqlalchemy import select

    # Register user (only send fields accepted by registration endpoint)
    register_data = {
        "email": other_user_data["email"],
        "password": other_user_data["password"],
        "full_name": other_user_data["full_name"],
    }
    response = await async_client.post(
        "/api/v1/auth/register",
        json=register_data,
    )
    assert response.status_code == 201

    # Verify the user (required for endpoints using get_current_verified_user)
    result = await clean_db.execute(
        select(User).where(User.email == other_user_data["email"])
    )
    user = result.scalar_one()
    user.is_verified = True
    await clean_db.commit()
    await clean_db.refresh(user)

    # Login
    login_response = await async_client.post(
        "/api/v1/auth/login",
        json={
            "email": other_user_data["email"],
            "password": other_user_data["password"],
        },
    )
    assert login_response.status_code == 200

    token_data = login_response.json()
    return token_data["data"]["access_token"]


@pytest.fixture
def other_user_headers(other_user_token: str):
    """
    Get authentication headers with other user token.
    """
    return {"Authorization": f"Bearer {other_user_token}"}


# =============================================================================
# Document Instance Fixtures
# =============================================================================

@pytest_asyncio.fixture
async def test_completed_document(clean_db: AsyncSession, test_user_token: str, test_user_data: dict):
    """
    Create a completed document in the database.
    Depends on test_user_token to ensure user is created first.
    Uses clean_db to ensure database is clean before each test.
    """
    from app.db.models.document import Document
    from app.db.models.user import User
    from sqlalchemy import select
    from datetime import datetime

    # Get the existing user created by test_user_token (already verified)
    result = await clean_db.execute(
        select(User).where(User.email == test_user_data["email"])
    )
    user = result.scalar_one()

    # Create completed document
    document = Document(
        user_id=user.id,
        title="Completed Test Document",
        original_filename="completed_test.pdf",
        file_path="/uploads/completed_test.pdf",
        file_type="application/pdf",
        file_size=1024000,
        file_hash="abc123completed",
        status="completed",
        page_count=10,
        extracted_text="Sample extracted text",
        extracted_data={
            "invoice_number": "INV-2024-001",
            "date": "2024-01-15",
            "total": 1200.00,
        },
        processing_completed_at=datetime.utcnow(),
    )
    clean_db.add(document)
    await clean_db.commit()
    await clean_db.refresh(document)

    return document


@pytest_asyncio.fixture
async def test_pending_document(clean_db: AsyncSession, test_user_token: str, test_user_data: dict):
    """
    Create a pending document in the database.
    Depends on test_user_token to ensure user is created first.
    Uses clean_db to ensure database is clean before each test.
    """
    from app.db.models.document import Document
    from app.db.models.user import User
    from sqlalchemy import select

    # Get the existing user created by test_user_token
    result = await clean_db.execute(
        select(User).where(User.email == test_user_data["email"])
    )
    user = result.scalar_one()

    # Create pending document
    document = Document(
        user_id=user.id,
        title="Pending Test Document",
        original_filename="pending_test.pdf",
        file_path="/uploads/pending_test.pdf",
        file_type="application/pdf",
        file_size=512000,
        file_hash="xyz789pending",
        status="pending",
        page_count=5,
    )
    clean_db.add(document)
    await clean_db.commit()
    await clean_db.refresh(document)

    return document


@pytest_asyncio.fixture
async def test_document_with_file(clean_db: AsyncSession, test_user_token: str, test_user_data: dict, tmp_path_factory):
    """
    Create a document in the database with an actual file on disk.
    Used for testing preview and download endpoints.
    """
    from app.db.models.document import Document
    from app.db.models.user import User
    from sqlalchemy import select
    from datetime import datetime
    import os

    # Get the existing user created by test_user_token
    result = await clean_db.execute(
        select(User).where(User.email == test_user_data["email"])
    )
    user = result.scalar_one()

    # Create a real file on disk
    upload_dir = tmp_path_factory.mktemp("uploads")
    file_path = os.path.join(str(upload_dir), "test_preview.pdf")

    # Write minimal PDF content
    with open(file_path, "wb") as f:
        f.write(b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n")
        f.write(b"2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\n")
        f.write(b"xref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n")
        f.write(b"trailer<</Size 3/Root 1 0 R>>\nstartxref\n106\n%%EOF")

    file_size = os.path.getsize(file_path)

    # Create document record pointing to real file
    document = Document(
        user_id=user.id,
        title="Preview Test Document",
        original_filename="test_preview.pdf",
        file_path=file_path,
        file_type="application/pdf",
        file_size=file_size,
        file_hash="preview123hash",
        status="completed",
        page_count=1,
        extracted_text="Sample text",
        extracted_data={"test": "data"},
        processing_completed_at=datetime.utcnow(),
    )
    clean_db.add(document)
    await clean_db.commit()
    await clean_db.refresh(document)

    return document


@pytest_asyncio.fixture
async def test_confirmed_document(clean_db: AsyncSession, test_user_token: str, test_user_data: dict):
    """
    Create a confirmed document in the database.
    Depends on test_user_token to ensure user is created first.
    Uses clean_db to ensure database is clean before each test.
    """
    from app.db.models.document import Document
    from app.db.models.user import User
    from sqlalchemy import select
    from datetime import datetime

    # Get the existing user created by test_user_token
    result = await clean_db.execute(
        select(User).where(User.email == test_user_data["email"])
    )
    user = result.scalar_one()

    # Create confirmed document
    document = Document(
        user_id=user.id,
        title="Confirmed Test Document",
        original_filename="confirmed_test.pdf",
        file_path="/uploads/confirmed_test.pdf",
        file_type="application/pdf",
        file_size=2048000,
        file_hash="def456confirmed",
        status="completed",
        page_count=15,
        extracted_text="Sample extracted text",
        extracted_data={
            "invoice_number": "INV-2024-002",
            "date": "2024-01-20",
            "total": 1500.00,
        },
        user_corrected_data={
            "invoice_number": "INV-2024-002-CORRECTED",
            "date": "2024-01-20",
            "total": 1500.00,
        },
        processing_completed_at=datetime.utcnow(),
        confirmed_at=datetime.utcnow(),
        confirmed_by=user.id,
    )
    clean_db.add(document)
    await clean_db.commit()
    await clean_db.refresh(document)

    return document
