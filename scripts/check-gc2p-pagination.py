"""Fictional render regression. Run with pdfplumber installed, folder argument."""
import json
import re
import sys
from pathlib import Path

import pdfplumber

folder = Path(sys.argv[1])
results = []
for fixture in json.loads((folder / "manifest.json").read_text()):
    with pdfplumber.open(folder / fixture["filename"]) as document:
        texts = [page.extract_text() or "" for page in document.pages]
        joined = re.sub(r"\s+", "", "\n".join(texts))
        for token in fixture["names"] + fixture["tokens"]:
            assert joined.count(token) == 1, (fixture["filename"], token, joined.count(token))
        if fixture["variant"] == "long-note":
            # Isolate Notes: full-page extraction interleaves neighboring
            # column text at the same baseline into otherwise intact prose.
            notes = re.sub(r"\s+", "", "\n".join(
                page.crop((630, 80, 792, 578)).extract_text() or ""
                for page in document.pages[1:]
            ))
            assert notes.count("Fictionalnarrativeretainedinfull.") == 110, (
                fixture["filename"], "full long-note narrative must remain intact, not just markers"
            )
        assert fixture["names"][0] in re.sub(r"\s+", "", texts[1]), (
            fixture["filename"], "page two must start the first donor, not just section labels"
        )
        for number, page in enumerate(document.pages, 1):
            body = [char for char in page.chars if 80 <= char["top"] < 578 and char["text"].strip()]
            assert len(body) > 20, (fixture["filename"], number, "blank body/end page")
            # The actual navy footer starts at y=578. Font glyph bounding
            # boxes extend a few points beyond Yoga's 554pt content baseline.
            assert max(char["bottom"] for char in body) < 578, (
                fixture["filename"], number, "body overlaps reserved footer space"
            )
            assert f"Page {number} of {len(texts)}" in texts[number - 1], (
                fixture["filename"], number, "footer missing"
            )
        results.append({
            "client": fixture["client"], "variant": fixture["variant"],
            "pages": len(texts), "pageTwoHasFirstDonor": True,
            "allContentExactlyOnce": True, "footerBounds": True,
        })
print(json.dumps(results, indent=2))
print(f"PASS {len(results)} actual-owner fictional PDFs: populated page2, content once, no blank ending pages, footer bounds")
