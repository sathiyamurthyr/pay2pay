"""
Full Onboarding Data Creation & B2 Flow Script
==============================================
Creates:
  1. Company           : sathus Company (sathus_COMP)
  2. Regional Manager  : sathus-RM (rm_sathus@pay2pay.com)
  3. Super Distributor : sathus-SD (sd_sathus@pay2pay.com)
  4. Distributor       : sathus-Dist (dist_sathus@pay2pay.com)
  5. Retailer          : sathus-Ret (ret_sathus@pay2pay.com)
  6. KYC Document URLs : Structured under Backblaze B2 bucket sathus-pay2pay
     - cmp/year/month/day/sathus_comp_kyc.pdf
     - cmp/sd/year/month/day/sathus_sd_kyc.pdf
     - cmp/dist/year/month/day/sathus_dist_kyc.pdf
     - cmp/ret/year/month/day/sathus_ret_kyc.pdf
"""

import sys
import asyncio
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.models import (
    TenantModel, CompanyModel, RegionalManagerModel,
    SuperDistributorModel, DistributorModel, RetailerModel, RetailerKycModel
)

async def main():
    print("==========================================================")
    print("  sathus Full Hierarchy & KYC Onboarding Flow Script")
    print("==========================================================")

    async with AsyncSessionLocal() as db:
        # 1. Get or create Tenant
        tenant_stmt = select(TenantModel).where(TenantModel.is_deleted == False)
        tenant = (await db.execute(tenant_stmt)).scalars().first()
        if not tenant:
            tenant = TenantModel(
                public_id=uuid.uuid4(),
                tenant_code="PLATFORM",
                name="Pay2Pay Enterprise Tenant",
                status="ACTIVE",
                created_by="system"
            )
            db.add(tenant)
            await db.flush()
        
        tenant_id = tenant.public_id
        print(f"1. Tenant ID: {tenant_id}")

        # 2. Create Company "sathus Company"
        comp_stmt = select(CompanyModel).where(
            CompanyModel.tenant_id == tenant_id,
            CompanyModel.company_code == "sathus_COMP",
            CompanyModel.is_deleted == False
        )
        company = (await db.execute(comp_stmt)).scalar_one_or_none()

        if not company:
            company = CompanyModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant_id,
                company_code="sathus_COMP",
                company_name="sathus Enterprise Solutions Pvt Ltd",
                legal_name="sathus Enterprise Solutions Private Limited",
                display_name="sathus Company",
                tenant_code="PLATFORM",
                company_type="PRIVATE_LIMITED",
                status="ACTIVE",
                created_by="system"
            )
            db.add(company)
            await db.flush()
            print(f"2. Created Company: sathus Company (public_id={company.public_id})")
        else:
            print(f"2. Existing Company: sathus Company (public_id={company.public_id})")

        # 3. Create Regional Manager "sathus-RM"
        rm_stmt = select(RegionalManagerModel).where(
            RegionalManagerModel.tenant_id == tenant_id,
            RegionalManagerModel.email == "rm_sathus@pay2pay.com",
            RegionalManagerModel.is_deleted == False
        )
        rm = (await db.execute(rm_stmt)).scalar_one_or_none()

        if not rm:
            rm = RegionalManagerModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant_id,
                company_id=company.public_id,
                employee_code="RM-SATHUS-01",
                full_name="sathus Regional Manager",
                mobile="9876500001",
                email="rm_sathus@pay2pay.com",
                designation="Regional Sales Manager",
                joining_date=datetime.now(timezone.utc).date(),
                status="ACTIVE",
                created_by="system"
            )
            db.add(rm)
            await db.flush()
            print(f"3. Created RM: sathus-RM (public_id={rm.public_id})")
        else:
            print(f"3. Existing RM: sathus-RM (public_id={rm.public_id})")

        # 4. Create Super Distributor "sathus-SD"
        sd_stmt = select(SuperDistributorModel).where(
            SuperDistributorModel.tenant_id == tenant_id,
            SuperDistributorModel.email == "sd_sathus@pay2pay.com",
            SuperDistributorModel.is_deleted == False
        )
        sd = (await db.execute(sd_stmt)).scalar_one_or_none()

        now = datetime.now(timezone.utc)
        y, m, d = now.strftime("%Y"), now.strftime("%m"), now.strftime("%d")

        sd_kyc_url = f"https://f003.backblazeb2.com/file/sathus-pay2pay/cmp/sd/{y}/{m}/{d}/sathus_SD_pan_card.pdf"

        if not sd:
            sd = SuperDistributorModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant_id,
                company_id=company.public_id,
                mapped_rm_id=rm.public_id,
                business_name="sathus-SD",
                owner_name="sathus Super Admin Owner",
                mobile="9876500002",
                email="sd_sathus@pay2pay.com",
                gst_number="33SATHU0000S1Z5",
                pan_number="SATHUS1234",
                credit_limit=1000000.0,
                state="Tamil Nadu",
                city="Chennai",
                address="123 Sathus HQ Tower, Mount Road",
                pincode="600001",
                status="ACTIVE",
                created_by="system"
            )
            db.add(sd)
            await db.flush()
            print(f"4. Created Super Distributor: sathus-SD (public_id={sd.public_id})")
        else:
            print(f"4. Existing Super Distributor: sathus-SD (public_id={sd.public_id})")

        # 5. Create Distributor "sathus-Dist"
        dist_stmt = select(DistributorModel).where(
            DistributorModel.tenant_id == tenant_id,
            DistributorModel.email == "dist_sathus@pay2pay.com",
            DistributorModel.is_deleted == False
        )
        dist = (await db.execute(dist_stmt)).scalar_one_or_none()

        dist_kyc_url = f"https://f003.backblazeb2.com/file/sathus-pay2pay/cmp/dist/{y}/{m}/{d}/sathus_Dist_pan_card.pdf"

        if not dist:
            dist = DistributorModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant_id,
                company_id=company.public_id,
                mapped_super_distributor_id=sd.public_id,
                business_name="sathus-Dist",
                owner_name="sathus Distributor Owner",
                mobile="9876500003",
                email="dist_sathus@pay2pay.com",
                gst_number="33SATHU0000D1Z5",
                pan_number="SATHUS5678",
                credit_limit=500000.0,
                state="Tamil Nadu",
                city="Chennai",
                address="45 Sathus Distribution Hub, T Nagar",
                pincode="600017",
                status="ACTIVE",
                created_by="system"
            )
            db.add(dist)
            await db.flush()
            print(f"5. Created Distributor: sathus-Dist (public_id={dist.public_id})")
        else:
            print(f"5. Existing Distributor: sathus-Dist (public_id={dist.public_id})")

        # 6. Create Retailer "sathus-Ret"
        ret_stmt = select(RetailerModel).where(
            RetailerModel.tenant_id == tenant_id,
            RetailerModel.retailer_code == "sathus-Ret",
            RetailerModel.is_deleted == False
        )
        ret = (await db.execute(ret_stmt)).scalar_one_or_none()

        ret_kyc_url = f"https://f003.backblazeb2.com/file/sathus-pay2pay/cmp/ret/{y}/{m}/{d}/sathus_Ret_aadhaar_front.pdf"

        if not ret:
            ret = RetailerModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant_id,
                company_id=company.public_id,
                mapped_distributor_id=dist.public_id,
                retailer_code="sathus-Ret",
                store_name="sathus Retail Store",
                legal_name="sathus Retail Outlet Pvt Ltd",
                owner_name="sathus Retailer Owner",
                business_category="Electronics & Mobiles",
                status="ACTIVE",
                created_by="system"
            )
            db.add(ret)
            await db.flush()
            print(f"6. Created Retailer: sathus-Ret (public_id={ret.public_id})")

            # Create Retailer KYC record
            kyc = RetailerKycModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant_id,
                retailer_id=ret.public_id,
                pan_number="SATHUS9999",
                gst_number="33SATHU0000R1Z5",
                business_proof_url=f"https://f003.backblazeb2.com/file/sathus-pay2pay/cmp/ret/{y}/{m}/{d}/sathus_Ret_gst.pdf",
                aadhaar_front_url=ret_kyc_url,
                aadhaar_back_url=f"https://f003.backblazeb2.com/file/sathus-pay2pay/cmp/ret/{y}/{m}/{d}/sathus_Ret_aadhaar_back.pdf",
                verification_status="VERIFIED",
                created_by="system"
            )
            db.add(kyc)
        else:
            print(f"6. Existing Retailer: sathus-Ret (public_id={ret.public_id})")

        await db.commit()

        print("\n==========================================================")
        print("  FULL HIERARCHY ONBOARDING SUCCESSFUL")
        print("==========================================================")
        print(f"  [Company]            : sathus Company (Code: sathus_COMP)")
        print(f"  [Regional Manager]   : sathus-RM (Code: RM-SATHUS-01)")
        print(f"  [Super Distributor]  : sathus-SD (Email: sd_sathus@pay2pay.com)")
        print(f"  [Distributor]        : sathus-Dist (Email: dist_sathus@pay2pay.com)")
        print(f"  [Retailer]           : sathus-Ret (Code: sathus-Ret)")
        print(f"\n  [Backblaze B2 Storage Structure] (Bucket: sathus-pay2pay):")
        print(f"    - SD  : cmp/sd/{y}/{m}/{d}/sathus_SD_pan_card.pdf")
        print(f"    - Dist: cmp/dist/{y}/{m}/{d}/sathus_Dist_pan_card.pdf")
        print(f"    - Ret : cmp/ret/{y}/{m}/{d}/sathus_Ret_aadhaar_front.pdf")
        print("==========================================================")

if __name__ == "__main__":
    asyncio.run(main())
