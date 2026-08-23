import asyncio
from app.application.storage_service import BackblazeStorageService, B2_BUCKET_NAME

api_obj, bucket = BackblazeStorageService._get_api()
print("api_obj:", api_obj)
print("bucket:", bucket)

file_path = "cmp/sd/2026/08/23/2b6a4d9d_sample_kyc_verification_doc.pdf"
if api_obj:
    try:
        url1 = api_obj.get_download_url_for_file_name(B2_BUCKET_NAME, file_path)
        print("api_obj.get_download_url_for_file_name:", url1)
    except Exception as e:
        print("url1 err:", e)
    
    try:
        url2 = bucket.get_download_url(file_path)
        print("bucket.get_download_url:", url2)
    except Exception as e:
        print("url2 err:", e)

    try:
        # Check bucket type
        print("bucket type:", bucket.type_)
    except Exception as e:
        print("type err:", e)
