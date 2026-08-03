"""
Backblaze B2 Upload Script for sathus-pay2pay
==============================================
Uploads sample documents directly to Backblaze B2 bucket 'sathus-pay2pay' following the specified folder conventions:
  - cmp/sd/{year}/{month}/{day}/{filename}
  - cmp/dist/{year}/{month}/{day}/{filename}
  - cmp/ret/{year}/{month}/{day}/{filename}
  - cmp/{year}/{month}/{day}/{filename}
"""

import sys
import asyncio
import os
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.application.storage_service import BackblazeStorageService
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.models import (
    SuperDistributorModel, DistributorModel, RetailerModel, RetailerKycModel
)
from sqlalchemy import select

# Minimal valid 1-page sample PDF bytes
SAMPLE_PDF_BYTES = b"""%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kinds [] /Count 1 /Kids [3 0 R]>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R>> endobj
4 0 obj <</Length 55>> stream
BT
/Helvetica 14 Tf
100 700 TD
(Pay2Pay Sathus Sample Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000062 00000 n 
0000000013 00000 n 
0000000200 00000 n 
trailer <</Size 5 /Root 1 0 R>>
startxref
310
%%EOF"""


async def main():
    print("==========================================================")
    print("  Backblaze B2 Direct Upload Script (Bucket: sathus-pay2pay)")
    print("==========================================================")

    # 1. Upload SD document
    print("\n1. Uploading Super Distributor (SD) document...")
    sd_res = await BackblazeStorageService.upload_document(
        file_bytes=SAMPLE_PDF_BYTES,
        original_filename="sathus_sd_pan_card.pdf",
        entity_type="SD",
        content_type="application/pdf"
    )
    print(f"   [SUCCESS] Uploaded SD Document:")
    print(f"   • Path: {sd_res['path']}")
    print(f"   • URL : {sd_res['url']}")

    # 2. Upload Distributor document
    print("\n2. Uploading Distributor (DIST) document...")
    dist_res = await BackblazeStorageService.upload_document(
        file_bytes=SAMPLE_PDF_BYTES,
        original_filename="sathus_dist_gst_certificate.pdf",
        entity_type="DIST",
        content_type="application/pdf"
    )
    print(f"   [SUCCESS] Uploaded Distributor Document:")
    print(f"   • Path: {dist_res['path']}")
    print(f"   • URL : {dist_res['url']}")

    # 3. Upload Retailer documents
    print("\n3. Uploading Retailer (RET) Aadhaar & PAN documents...")
    ret_aadhaar_res = await BackblazeStorageService.upload_document(
        file_bytes=SAMPLE_PDF_BYTES,
        original_filename="sathus_ret_aadhaar_front.pdf",
        entity_type="RET",
        content_type="application/pdf"
    )
    print(f"   [SUCCESS] Uploaded Retailer Aadhaar:")
    print(f"   • Path: {ret_aadhaar_res['path']}")
    print(f"   • URL : {ret_aadhaar_res['url']}")

    ret_pan_res = await BackblazeStorageService.upload_document(
        file_bytes=SAMPLE_PDF_BYTES,
        original_filename="sathus_ret_pan_card.pdf",
        entity_type="RET",
        content_type="application/pdf"
    )
    print(f"   [SUCCESS] Uploaded Retailer PAN:")
    print(f"   • Path: {ret_pan_res['path']}")

    # 4. Upload Company document
    print("\n4. Uploading Company (CMP) document...")
    cmp_res = await BackblazeStorageService.upload_document(
        file_bytes=SAMPLE_PDF_BYTES,
        original_filename="sathus_company_incorporation.pdf",
        entity_type="CMP",
        content_type="application/pdf"
    )
    print(f"   [SUCCESS] Uploaded Company Document:")
    print(f"   • Path: {cmp_res['path']}")

    # Update database records with actual uploaded B2 URLs
    async with AsyncSessionLocal() as db:
        sd = (await db.execute(select(SuperDistributorModel).where(SuperDistributorModel.business_name == "sathus-SD"))).scalar_one_or_none()
        if sd:
            sd.notes = f"KYC Doc B2: {sd_res['url']}"

        dist = (await db.execute(select(DistributorModel).where(DistributorModel.business_name == "sathus-Dist"))).scalar_one_or_none()
        if dist:
            dist.notes = f"KYC Doc B2: {dist_res['url']}"

        ret = (await db.execute(select(RetailerModel).where(RetailerModel.retailer_code == "sathus-Ret"))).scalar_one_or_none()
        if ret:
            kyc = (await db.execute(select(RetailerKycModel).where(RetailerKycModel.retailer_id == ret.public_id))).scalar_one_or_none()
            if kyc:
                kyc.aadhaar_front_url = ret_aadhaar_res['url']
                kyc.business_proof_url = ret_pan_res['url']

        await db.commit()
        print("\n==========================================================")
        print("  UPDATED DATABASE RECORDS WITH REAL B2 STORAGE URLS")
        print("==========================================================")

if __name__ == "__main__":
    asyncio.run(main())
