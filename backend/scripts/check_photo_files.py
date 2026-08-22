import os
from pathlib import Path

uploads_dir = Path("d:/pay2pay/uploads")
backend_uploads = Path("d:/pay2pay/backend/uploads")

for p in [
    uploads_dir / "cmp/ret/aadhaar/REG-4E92DB60_photo.jpg",
    backend_uploads / "cmp/ret/aadhaar/REG-4E92DB60_photo.jpg",
    uploads_dir / "cmp/ret/aadhaar/REG-74B73A9485_photo.jpg",
    backend_uploads / "cmp/ret/aadhaar/REG-74B73A9485_photo.jpg"
]:
    print(f"Path {p} exists: {p.exists()} (size: {p.stat().st_size if p.exists() else 0})")
