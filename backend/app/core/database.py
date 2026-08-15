from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool, NullPool

from app.core.config import settings

# SQLite uses NullPool (per-request connections, no shared pool) to prevent
# concurrent request deadlocks. PostgreSQL uses standard connection pooling.
_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# Detect Supabase transaction pooler (port 6543) — requires statement_cache_size=0
# because pgbouncer transaction mode does not support prepared statements.
_is_supabase_pooler = ":6543/" in settings.DATABASE_URL

import uuid

if _is_sqlite:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=NullPool,
    )
else:
    # Supabase Transaction Pooler (PgBouncer) & PostgreSQL asyncpg config
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        future=True,
        poolclass=NullPool,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid.uuid4().hex}__"
        },
    )


AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
