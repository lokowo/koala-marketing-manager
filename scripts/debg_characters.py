#!/usr/bin/env python3
"""
Remove white background from OLA character images using four-corner
seed flood fill + tolerance + 1px feathered edge.

Usage:
    python3 scripts/debg_characters.py

Reads .env.local for Supabase credentials. Downloads originals,
processes them, saves to out/, then uploads to ola-assets bucket.
"""

import os, sys, io, re, json
from pathlib import Path
from urllib.request import Request, urlopen
from collections import deque

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env.local"

ASSET_IDS = [
    "c-04-boss-trenchcoat",
    "c-04-boss-trenchcoat-half",
]

BUCKET = "ola-assets"
STORAGE_PREFIX = "characters"
TOLERANCE = 30
FEATHER_PX = 1


def load_env():
    env = {}
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            m = re.match(r"^([A-Z_]+)=(.*)$", line)
            if m:
                env[m.group(1)] = m.group(2).strip("\"'")
    return env


def supabase_headers(service_key: str):
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }


def fetch_json(url: str, headers: dict):
    req = Request(url, headers=headers)
    with urlopen(req) as resp:
        return json.loads(resp.read())


def download_image(url: str) -> Image.Image:
    req = Request(url)
    with urlopen(req) as resp:
        return Image.open(io.BytesIO(resp.read())).convert("RGBA")


def flood_fill_remove(img: Image.Image, tolerance: int) -> Image.Image:
    """Four-corner seed flood fill to remove background white pixels."""
    w, h = img.size
    pixels = img.load()
    visited = [[False] * h for _ in range(w)]
    to_clear = set()

    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]

    def is_white_ish(r, g, b, a):
        if a < 128:
            return False
        return (255 - r) <= tolerance and (255 - g) <= tolerance and (255 - b) <= tolerance

    for sx, sy in seeds:
        r, g, b, a = pixels[sx, sy]
        if not is_white_ish(r, g, b, a):
            continue
        q = deque()
        q.append((sx, sy))
        visited[sx][sy] = True
        while q:
            x, y = q.popleft()
            pr, pg, pb, pa = pixels[x, y]
            if not is_white_ish(pr, pg, pb, pa):
                continue
            to_clear.add((x, y))
            for nx, ny in ((x-1, y), (x+1, y), (x, y-1), (x, y+1)):
                if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                    visited[nx][ny] = True
                    q.append((nx, ny))

    alpha = img.split()[3]
    alpha_data = list(alpha.getdata())
    edge_pixels = set()

    for (x, y) in to_clear:
        idx = y * w + x
        alpha_data[idx] = 0
        for nx, ny in ((x-1, y), (x+1, y), (x, y-1), (x, y+1)):
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in to_clear:
                edge_pixels.add((nx, ny))

    for (x, y) in edge_pixels:
        idx = y * w + x
        cur = alpha_data[idx]
        alpha_data[idx] = max(0, int(cur * 0.5))

    new_alpha = Image.new("L", (w, h))
    new_alpha.putdata(alpha_data)
    img.putalpha(new_alpha)
    return img


def upload_to_supabase(file_path: Path, storage_path: str, base_url: str, service_key: str) -> str:
    headers = supabase_headers(service_key)
    headers["Content-Type"] = "image/png"

    upload_url = f"{base_url}/storage/v1/object/{BUCKET}/{storage_path}"

    data = file_path.read_bytes()
    req = Request(upload_url, data=data, headers=headers, method="POST")
    try:
        with urlopen(req) as resp:
            resp.read()
    except Exception as e:
        if "Duplicate" in str(e) or "409" in str(e):
            req2 = Request(upload_url, data=data, headers=headers, method="PUT")
            with urlopen(req2) as resp:
                resp.read()
        else:
            raise

    public_url = f"{base_url}/storage/v1/object/public/{BUCKET}/{storage_path}"
    return public_url


def main():
    env = load_env()
    base_url = env["NEXT_PUBLIC_SUPABASE_URL"]
    service_key = env["SUPABASE_SERVICE_ROLE_KEY"]
    headers = supabase_headers(service_key)

    ids_param = ",".join(f'"{aid}"' for aid in ASSET_IDS)
    query_url = (
        f"{base_url}/rest/v1/ola_assets"
        f"?asset_id=in.({','.join(ASSET_IDS)})"
        f"&select=asset_id,image_url,name"
    )
    rows = fetch_json(query_url, headers)

    if not rows:
        print("No rows found for asset_ids:", ASSET_IDS)
        sys.exit(1)

    print(f"Found {len(rows)} assets to process\n")

    out_dir = ROOT / "out"
    out_dir.mkdir(exist_ok=True)

    results = []

    for row in rows:
        asset_id = row["asset_id"]
        image_url = row["image_url"]
        print(f"Downloading {asset_id} …")
        img = download_image(image_url)
        print(f"  Original size: {img.size[0]}x{img.size[1]}")

        print(f"  Removing white background (tolerance={TOLERANCE}) …")
        img = flood_fill_remove(img, TOLERANCE)

        out_name = f"{asset_id}-nobg.png"
        out_path = out_dir / out_name
        img.save(out_path, "PNG")
        print(f"  Saved → {out_path}")

        storage_path = f"{STORAGE_PREFIX}/{out_name}"
        print(f"  Uploading to {BUCKET}/{storage_path} …")
        public_url = upload_to_supabase(out_path, storage_path, base_url, service_key)
        print(f"  ✓ {public_url}\n")

        results.append((asset_id, public_url))

    print("=" * 60)
    print("Done! New images (DB NOT updated):")
    for aid, url in results:
        print(f"  {aid}-nobg → {url}")
    print("=" * 60)


if __name__ == "__main__":
    main()
