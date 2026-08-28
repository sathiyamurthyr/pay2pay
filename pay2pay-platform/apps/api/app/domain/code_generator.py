import random
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.db.models import RetailerModel, DistributorModel, SuperDistributorModel


def generate_retailer_code() -> str:
    """Generates a unique retailer code format: P2P-R<Random 6-digit number>"""
    return f"P2P-R{random.randint(100000, 999999)}"


def generate_distributor_code() -> str:
    """Generates a unique distributor code format: P2P-D<Random 6-digit number>"""
    return f"P2P-D{random.randint(100000, 999999)}"


def generate_super_distributor_code() -> str:
    """Generates a unique super distributor code format: P2P-SD<Random 6-digit number>"""
    return f"P2P-SD{random.randint(100000, 999999)}"


async def generate_unique_retailer_code(db: AsyncSession) -> str:
    for _ in range(25):
        code = generate_retailer_code()
        exists = (await db.execute(select(RetailerModel.id).where(RetailerModel.retailer_code == code))).scalar_one_or_none()
        if not exists:
            return code
    return f"P2P-R{random.randint(1000000, 9999999)}"


async def generate_unique_distributor_code(db: AsyncSession) -> str:
    for _ in range(25):
        code = generate_distributor_code()
        exists = (await db.execute(select(DistributorModel.id).where(DistributorModel.distributor_code == code))).scalar_one_or_none()
        if not exists:
            return code
    return f"P2P-D{random.randint(1000000, 9999999)}"


async def generate_unique_super_distributor_code(db: AsyncSession) -> str:
    for _ in range(25):
        code = generate_super_distributor_code()
        exists = (await db.execute(select(SuperDistributorModel.id).where(SuperDistributorModel.super_distributor_code == code))).scalar_one_or_none()
        if not exists:
            return code
    return f"P2P-SD{random.randint(1000000, 9999999)}"
