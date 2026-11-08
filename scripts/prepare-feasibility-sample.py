#!/usr/bin/env python3
"""Run off-repo: python prepare-feasibility-sample.py source.pdf /private/output.
Requires pypdfium2 + Pillow. Never write assets into this public repository.
"""
import hashlib
import json
from pathlib import Path
import shutil
import sys
import pypdfium2 as pdfium

source, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
repo = Path(__file__).resolve().parents[1]
if out == repo or repo in out.parents:
    raise SystemExit("Choose an output directory outside the repository.")
digest = hashlib.sha256(source.read_bytes()).hexdigest()
assert digest == "18cd8d1f5cbdf10e8d18575ec1c33a94ac95623aa34b93a63364ae752d0372f9"
doc = pdfium.PdfDocument(source)
assert len(doc) == 126
out.mkdir(parents=True, exist_ok=True)
shutil.copyfile(source, out / "document.pdf")
for i, page in enumerate(doc):
    # 200 dpi: ~1700 x 2200 for legible 2x zoom, compact WebP for delivery.
    bitmap = page.render(scale=200/72)
    bitmap.to_pil().convert("RGB").save(out / f"page-{i+1:03}.webp", "WEBP", quality=88, method=6)
    bitmap.close()
    page.close()
files = {}
for p in sorted(out.iterdir()):
    if p.suffix not in (".pdf", ".webp"):
        continue
    b = p.read_bytes()
    files[p.name] = {"bytes": len(b), "sha256": hashlib.sha256(b).hexdigest()}
(out / "asset-manifest.json").write_text(json.dumps(files, indent=2) + "\n")
print(json.dumps({"pages": len(doc), "files": len(files), "bytes": sum(x["bytes"] for x in files.values()), "pdfSha256": digest}))
