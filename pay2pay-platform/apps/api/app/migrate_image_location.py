import asyncio
import sys
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

SQL_STATEMENTS = [
    "ALTER TABLE public.registration_address ADD COLUMN IF NOT EXISTS exif_gps_available BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE public.registration_address ADD COLUMN IF NOT EXISTS exif_latitude DOUBLE PRECISION;",
    "ALTER TABLE public.registration_address ADD COLUMN IF NOT EXISTS exif_longitude DOUBLE PRECISION;",
    "ALTER TABLE public.registration_address ADD COLUMN IF NOT EXISTS exif_altitude DOUBLE PRECISION;",
    "ALTER TABLE public.registration_address ADD COLUMN IF NOT EXISTS exif_captured_at TIMESTAMPTZ;",
    "ALTER TABLE public.registration_address ADD COLUMN IF NOT EXISTS exif_reverse_address TEXT;",
    "ALTER TABLE public.registration_address ADD COLUMN IF NOT EXISTS ocr_location_available BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE public.registration_address ADD COLUMN IF NOT EXISTS ocr_raw_text TEXT;",
    "ALTER TABLE public.registration_address ADD COLUMN IF NOT EXISTS ocr_detected_address TEXT;",
    "ALTER TABLE public.registration_address ADD COLUMN IF NOT EXISTS ocr_detected_city VARCHAR(100);",
    "ALTER TABLE public.registration_address ADD COLUMN IF NOT EXISTS ocr_detected_state VARCHAR(100);",
    "ALTER TABLE public.registration_address ADD COLUMN IF NOT EXISTS ocr_detected_pincode VARCHAR(20);",
    "ALTER TABLE public.registration_address ADD COLUMN IF NOT EXISTS location_metadata JSONB;",

    "ALTER TABLE public.retailer_address ADD COLUMN IF NOT EXISTS exif_gps_available BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE public.retailer_address ADD COLUMN IF NOT EXISTS exif_latitude DOUBLE PRECISION;",
    "ALTER TABLE public.retailer_address ADD COLUMN IF NOT EXISTS exif_longitude DOUBLE PRECISION;",
    "ALTER TABLE public.retailer_address ADD COLUMN IF NOT EXISTS exif_altitude DOUBLE PRECISION;",
    "ALTER TABLE public.retailer_address ADD COLUMN IF NOT EXISTS exif_captured_at TIMESTAMPTZ;",
    "ALTER TABLE public.retailer_address ADD COLUMN IF NOT EXISTS exif_reverse_address TEXT;",
    "ALTER TABLE public.retailer_address ADD COLUMN IF NOT EXISTS ocr_location_available BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE public.retailer_address ADD COLUMN IF NOT EXISTS ocr_raw_text TEXT;",
    "ALTER TABLE public.retailer_address ADD COLUMN IF NOT EXISTS ocr_detected_address TEXT;",
    "ALTER TABLE public.retailer_address ADD COLUMN IF NOT EXISTS ocr_detected_city VARCHAR(100);",
    "ALTER TABLE public.retailer_address ADD COLUMN IF NOT EXISTS ocr_detected_state VARCHAR(100);",
    "ALTER TABLE public.retailer_address ADD COLUMN IF NOT EXISTS ocr_detected_pincode VARCHAR(20);",
    "ALTER TABLE public.retailer_address ADD COLUMN IF NOT EXISTS location_metadata JSONB;",
]

async def run_migration():
    print("Executing image location columns migration...")
    async with AsyncSessionLocal() as db:
        for stmt in SQL_STATEMENTS:
            await db.execute(text(stmt))
        await db.commit()
    print("Migration successfully applied!")

if __name__ == "__main__":
    asyncio.run(run_migration())
