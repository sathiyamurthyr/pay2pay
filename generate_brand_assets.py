import os
import shutil
from pathlib import Path
from PIL import Image

def generate_assets():
    base_dir = Path(r"c:\Users\Sathyamoorthy\.gemini\antigravity\worktrees\pay2pay\fix_role_based_routing")
    source_logo = base_dir / "frontend" / "public" / "logo.png"

    if not source_logo.exists():
        raise FileNotFoundError(f"Source logo not found: {source_logo}")

    print(f"Loading source logo from {source_logo}...")
    im = Image.open(source_logo).convert("RGBA")

    # Target folders to update
    target_dirs = [
        base_dir / "frontend" / "public",
        base_dir / "frontend" / "public" / "branding",
        base_dir / "frontend" / "public" / "images",
        base_dir / "frontend" / "public" / "brand",
        base_dir / "pay2pay-platform" / "apps" / "retailer" / "public",
        base_dir / "pay2pay-platform" / "apps" / "retailer" / "public" / "branding",
        base_dir / "pay2pay-platform" / "apps" / "retailer" / "public" / "images",
        base_dir / "pay2pay-platform" / "apps" / "admin" / "public",
        base_dir / "pay2pay-platform" / "apps" / "admin" / "public" / "branding",
        base_dir / "pay2pay-platform" / "apps" / "admin" / "public" / "images",
    ]

    # Create square version with aspect ratio preserved on transparent background
    def make_square_icon(size):
        icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        # Scale preserving aspect ratio
        thumb = im.copy()
        thumb.thumbnail((size, size), Image.Resampling.LANCZOS)
        # Center thumb in square
        x = (size - thumb.width) // 2
        y = (size - thumb.height) // 2
        icon.paste(thumb, (x, y), thumb)
        return icon

    sizes = {
        "favicon-16x16.png": 16,
        "favicon-32x32.png": 32,
        "favicon-48x48.png": 48,
        "favicon.png": 32,
        "apple-touch-icon.png": 180,
        "icon.png": 192,
        "icon-192.png": 192,
        "icon-512.png": 512,
        "icon-1024.png": 1024,
    }

    cached_icons = {}
    for filename, size in sizes.items():
        if size not in cached_icons:
            cached_icons[size] = make_square_icon(size)
        print(f"Rendered icon size {size}x{size}")

    # Generate multi-size .ico
    ico_sizes = [16, 32, 48, 64, 128, 256]
    ico_images = [make_square_icon(s) for s in ico_sizes]

    manifest_content = """{
  "name": "Near4You FinTech Platform",
  "short_name": "Near4You",
  "icons": [
    {
      "src": "/favicon-16x16.png",
      "sizes": "16x16",
      "type": "image/png"
    },
    {
      "src": "/favicon-32x32.png",
      "sizes": "32x32",
      "type": "image/png"
    },
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "theme_color": "#0F172A",
  "background_color": "#0F172A",
  "display": "standalone"
}
"""

    for t_dir in target_dirs:
        t_dir.mkdir(parents=True, exist_ok=True)
        print(f"\nWriting brand assets to {t_dir}...")

        # Save all png icons
        for filename, size in sizes.items():
            out_file = t_dir / filename
            cached_icons[size].save(out_file, "PNG", optimize=True)

        # Save favicon.ico
        ico_file = t_dir / "favicon.ico"
        ico_images[1].save(
            ico_file,
            format="ICO",
            sizes=[(s, s) for s in ico_sizes],
            append_images=ico_images
        )

        # Also overwrite legacy pay2pay image names so legacy references render Near4You
        legacy_names = [
            "pay2pay-logo.png",
            "pay2pay-logo.jpg",
            "logo.jpg",
            "logo_opaque.png",
            "logo_transparent.png",
        ]
        for leg in legacy_names:
            target_leg = t_dir / leg
            if leg.endswith(".jpg"):
                rgb_im = im.convert("RGB")
                rgb_im.save(target_leg, "JPEG", quality=95)
            else:
                im.save(target_leg, "PNG", optimize=True)

        # Write site.webmanifest
        manifest_file = t_dir / "site.webmanifest"
        manifest_file.write_text(manifest_content, encoding="utf-8")

    print("\n✅ All favicons, icons, and web manifests generated successfully!")

if __name__ == "__main__":
    generate_assets()
