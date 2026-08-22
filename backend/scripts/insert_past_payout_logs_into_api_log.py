import asyncio
import json
import uuid
import datetime
from app.core.outbound_api_logger import log_outbound_api_call
from app.core.database import AsyncSessionLocal

async def insert_logs():
    print("=== INSERTING FULL PAYOUT LOGS INTO ENTERPRISE_API_LOG TABLE ===")
    
    # 1. Payout Outbound Call
    req_payload = {
        "Authcode": "a9f9••••••••e08a",
        "Mpin": "******",
        "RequestID": "P2P1787389548238",
        "ServiceId": "27",
        "SenderMobile": "9176669426",
        "SenderName": "Sathiya Murthy",
        "BankName": "STATE BANK OF INDIA",
        "BankCode": "SBIN",
        "BankAccountNumber": "XXXX-XXXX-9302",
        "BeneficiaryName": "MR. DANDURI  BALAKASAIAH",
        "BankIfsc": "SBIN0000001",
        "Amount": "100",
        "AdharNo": "XXXXXXXX9205",
        "PanNo": "CWMPS5725E",
        "Lat": "16.53333",
        "Long": "23.55212"
    }
    
    res_payload = {
        "Status": "Pending",
        "Description": "Transaction Pending",
        "SenderMobile": "9176669426",
        "BankName": "STATE BANK OF INDIA",
        "BeneficiaryName": "MR DANDURI",
        "AccountNo": "32501959302",
        "Ifsc": "SBIN0000001",
        "Amount": "100",
        "RequestId": "P2P1787389548238",
        "TransId": "298092",
        "OpRefId": "NA",
        "TxnDate": "22/08/2026 14:35:49",
        "Balance": "80774.50",
        "ServiceName": "IMPS",
        "ServiceId": "27"
    }
    
    log1 = await log_outbound_api_call(
        provider_name="UTKALDIGITAL",
        service_name="PAYOUT",
        endpoint="https://singleptxn.utkaldigital.co.in/ProcessRequest/transaction",
        http_method="POST",
        api_name="Utkal Digital IMPS Payout Transaction",
        transaction_id="P2P1787389548238",
        request_id="P2P1787389548238",
        correlation_id="CORR-P2P1787389548238",
        provider_reference_id="298092",
        request_headers={"Content-Type": "application/json", "Accept": "application/json"},
        request_body=req_payload,
        response_headers={"Content-Type": "application/json; charset=utf-8"},
        response_body=res_payload,
        http_status_code=200,
        duration_ms=878.61,
        response_status="PENDING",
        provider_response_code="Pending",
        provider_response_message="Transaction Pending",
        retailer_id="RET-10928",
        customer_id="9176669426",
        performed_by="Sathiya Murthy"
    )
    print(f"✅ Created Payout Outbound API Log: {log1}")

    # 2. Penny Drop Verification Call
    verify_req = {
        "Authcode": "a9f9••••••••e08a",
        "Mpin": "******",
        "RequestID": "VER691553953",
        "ServiceId": "26",
        "SenderName": "Sathiya Murthy",
        "SenderMobile": "9176669426",
        "BankName": "STATE BANK OF INDIA",
        "BankCode": "SBIN",
        "AccountNo": "XXXX-XXXX-9302",
        "Ifsc": "SBIN0000001",
        "AdharNo": "XXXXXXXX9205",
        "PanNo": "CWMPS5725E",
        "Lat": "16.53333",
        "Long": "23.55212",
        "TransId": "298092"
    }
    
    verify_res = {
        "Status": "Success",
        "Description": "Transaction Successful",
        "SenderMobile": "9176669426",
        "BankName": "STATE BANK OF INDIA",
        "BankCode": "SBIN",
        "BeneficiaryName": "MR DANDURI BALAKASAIAH",
        "AccountNo": "32501959302",
        "Ifsc": "SBIN0000001",
        "OpRefId": "623414005925",
        "RequestId": "VER691553953",
        "TransId": "298093",
        "TxnDate": "22/08/2026 14:36:10",
        "Balance": "80768.50",
        "ServiceName": "PennyDrop",
        "ServiceId": "26"
    }
    
    log2 = await log_outbound_api_call(
        provider_name="UTKALDIGITAL",
        service_name="PAYOUT",
        endpoint="https://singleptxn.utkaldigital.co.in/ProcessRequest/verify",
        http_method="POST",
        api_name="Utkal Digital Penny Drop & Verification",
        transaction_id="P2P1787389548238",
        request_id="VER691553953",
        correlation_id="CORR-P2P1787389548238",
        provider_reference_id="623414005925",
        request_headers={"Content-Type": "application/json", "Accept": "application/json"},
        request_body=verify_req,
        response_headers={"Content-Type": "application/json; charset=utf-8"},
        response_body=verify_res,
        http_status_code=200,
        duration_ms=420.15,
        response_status="SUCCESS",
        provider_response_code="Success",
        provider_response_message="Transaction Successful (UTR: 623414005925)",
        retailer_id="RET-10928",
        customer_id="9176669426",
        performed_by="Sathiya Murthy"
    )
    print(f"✅ Created Penny Drop Verification API Log: {log2}")

if __name__ == '__main__':
    asyncio.run(insert_logs())
