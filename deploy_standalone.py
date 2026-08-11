import zipfile, os, shutil

zip_path = "/home/ubuntu/pay2pay/frontend_standalone.zip"
target_dir = "/home/ubuntu/pay2pay/frontend"

with zipfile.ZipFile(zip_path, 'r') as z:
    for member in z.infolist():
        clean_name = member.filename.replace('\\', '/')
        if clean_name.startswith('/'):
            clean_name = clean_name[1:]
        
        target_path = os.path.join(target_dir, clean_name)
        
        if member.is_dir() or clean_name.endswith('/'):
            os.makedirs(target_path, exist_ok=True)
        else:
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            with z.open(member) as source, open(target_path, "wb") as target:
                shutil.copyfileobj(source, target)

print("Successfully unzipped standalone build into /home/ubuntu/pay2pay/frontend!")
