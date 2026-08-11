import zipfile, os

zip_path = "/home/ubuntu/pay2pay/frontend_prod.zip"
target_dir = "/home/ubuntu/pay2pay/frontend/.next"

# Remove existing .next directory
import shutil
if os.path.exists(target_dir):
    shutil.rmtree(target_dir)

os.makedirs(target_dir, exist_ok=True)

with zipfile.ZipFile(zip_path, 'r') as z:
    for member in z.infolist():
        # Replace backslashes with forward slashes
        clean_name = member.filename.replace('\\', '/')
        if clean_name.startswith('/'):
            clean_name = clean_name[1:]
        
        target_path = os.path.join("/home/ubuntu/pay2pay/frontend", clean_name)
        
        if member.is_dir() or clean_name.endswith('/'):
            os.makedirs(target_path, exist_ok=True)
        else:
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            with z.open(member) as source, open(target_path, "wb") as target:
                shutil.copyfileobj(source, target)

print("Properly unzipped with normalized path separators!")
