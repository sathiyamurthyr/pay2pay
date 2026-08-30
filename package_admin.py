import os
import shutil
import zipfile

staging_dir = "d:/pay2pay/admin_deploy_staging"
if os.path.exists(staging_dir):
    shutil.rmtree(staging_dir)
os.makedirs(staging_dir, exist_ok=True)

# 1. Copy standalone content
standalone_dir = "d:/pay2pay/pay2pay-platform/apps/admin/.next/standalone"
for item in os.listdir(standalone_dir):
    s = os.path.join(standalone_dir, item)
    d = os.path.join(staging_dir, item)
    if os.path.isdir(s):
        shutil.copytree(s, d)
    else:
        shutil.copy2(s, d)

# 2. Copy static to apps/admin/.next/static
static_src = "d:/pay2pay/pay2pay-platform/apps/admin/.next/static"
static_dst = os.path.join(staging_dir, "apps/admin/.next/static")
if os.path.exists(static_src):
    shutil.copytree(static_src, static_dst, dirs_exist_ok=True)

# 3. Copy public to apps/admin/public if exists
public_src = "d:/pay2pay/pay2pay-platform/apps/admin/public"
if os.path.exists(public_src):
    public_dst = os.path.join(staging_dir, "apps/admin/public")
    shutil.copytree(public_src, public_dst, dirs_exist_ok=True)

# 4. Zip staging
zip_path = "d:/pay2pay/admin_deploy.zip"
if os.path.exists(zip_path):
    os.remove(zip_path)

print("Zipping admin deploy...")
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(staging_dir):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, staging_dir)
            zipf.write(file_path, arcname)

print(f"Done! Size: {os.path.getsize(zip_path)} bytes")
