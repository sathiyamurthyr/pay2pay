from app.application.storage_service import BackblazeStorageService
api_obj, bucket = BackblazeStorageService._get_api()
import inspect
print("download_file_by_name sig:", inspect.signature(bucket.download_file_by_name))
print("get_download_url sig:", inspect.signature(bucket.get_download_url))
print("get_download_authorization sig:", inspect.signature(bucket.get_download_authorization))
