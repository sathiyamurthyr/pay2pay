import zipfile, os

z = zipfile.ZipFile('/home/ubuntu/pay2pay/frontend_prod.zip')
extract_dir = '/home/ubuntu/pay2pay/frontend_extracted'
os.makedirs(extract_dir, exist_ok=True)
z.extractall(extract_dir)
files = z.namelist()
z.close()
print(f'Extracted {len(files)} files to {extract_dir}')
import subprocess
result = subprocess.run(['ls', extract_dir], capture_output=True, text=True)
print(result.stdout)
