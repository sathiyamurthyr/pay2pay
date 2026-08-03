"""
Test script to verify Backblaze B2 document upload to bucket `sathus-pay2pay`.
"""
import sys
import asyncio
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).parent))

from app.application.storage_service import BackblazeStorageService, B2_KEY_ID, B2_APP_KEY, B2_BUCKET_NAME

async def main():
    print("==================================================")
    print("  Backblaze B2 Upload Test - Pay2Pay Storage Service")
    print("==================================================")
    print(f"Key ID     : {B2_KEY_ID[:8]}...")
    print(f"Bucket Name : {B2_BUCKET_NAME}")
    
    sample_content = b"PDF-1.4 %... Sample KYC Verification Document for Pay2Pay Merchant Onboarding."
    sample_filename = "sample_kyc_verification_doc.pdf"
    entity_type = "SD"

    print(f"\nUploading sample document ({len(sample_content)} bytes) to bucket '{B2_BUCKET_NAME}'...")
    try:
        res = await BackblazeStorageService.upload_document(
            file_bytes=sample_content,
            original_filename=sample_filename,
            entity_type=entity_type,
            content_type="application/pdf",
        )
        print("\n[SUCCESS] Upload Succeeded!")
        print(f"  * File Name  : {res['filename']}")
        print(f"  * B2 Path    : {res['path']}")
        print(f"  * Entity Type: {res['entity_type']}")
        print(f"  * Size       : {res['size_bytes']} bytes")
        print(f"  * Download URL: {res['url']}")
    except Exception as e:
        print(f"\n[ERROR] Upload Error: {e}")
        raise e

if __name__ == "__main__":
    asyncio.run(main())
