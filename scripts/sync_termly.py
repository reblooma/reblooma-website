#!/usr/bin/env python3
"""Copy Reblooma's published Termly policies into the website.

Run by .github/workflows/termly-sync.yml once a day, or by hand:
    python3 scripts/sync_termly.py

For each policy in legal/termly-policies.json that has a "uuid":
  1. Download the published text from Termly.
  2. Check it looks complete. If not, keep the page we already have.
  3. Remove Termly's own styles, so the page uses Reblooma's design.
  4. Apply the wording fixes in FIXES.
  5. Put it inside legal/_template.html and write <slug>.html,
     but only when the text actually changed.

A policy with an empty "uuid" is skipped and its page is left alone. Fill in
the uuid after the policy is published in Termly (Add to website > URL).

Exit code 1 means at least one policy could not be fetched or checked. The
pages that did sync are still written, and a failed one keeps its last copy,
so the website never shows a blank policy.
"""
import html
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POLICIES = ROOT / "legal" / "termly-policies.json"
TEMPLATE = ROOT / "legal" / "_template.html"
API = "https://app.termly.io/api/v1/consumer/policies/{uuid}/content"
MIN_LENGTH = 3000  # a real policy is tens of thousands of characters

# Wording we always change after download. (old, new) pairs, applied in order.
_GAP = r"((?:\s|&nbsp;|<[^>]+>)*)"   # spaces, &nbsp; and tags Termly puts between words
FIXES = [
    # Joyce 11/11/2026: the El Camino Real address is a mailing address,
    # not the registered address. Keep the registered address off the site.
    # The tags between the words are kept, so the HTML stays balanced.
    (r"a company registered in" + _GAP + r"California" + _GAP + r"," + _GAP + r"United States" + _GAP + r"at ",
     r"a company registered in\1California\2,\3United States, with a mailing address\4at "),
    # Joyce 11/11/2026: Termly leaves the children contact email blank, and
    # has no question in its editor that fills it. Use our support inbox.
    (r"please contact us at" + _GAP + r"_{3,}",
     r'please contact us at\1<a href="mailto:support@reblooma.com">support@reblooma.com</a>'),
]

# Text that must never appear after FIXES. If it does, the page is not written.
FORBIDDEN = [
    (r"registered in California, United States at ", "the address is still called the registered address"),
    (r"_{3,}", "a fill-in blank (____) was left empty in Termly"),
]


def fetch(uuid):
    req = urllib.request.Request(API.format(uuid=uuid),
                                 headers={"User-Agent": "reblooma-website-sync"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
    return data.get("content") or ""


def clean(raw):
    s = re.sub(r"<style\b.*?</style>", "", raw, flags=re.S | re.I)
    s = re.sub(r"<script\b.*?</script>", "", s, flags=re.S | re.I)
    s = re.sub(r'\sstyle="[^"]*"', "", s)                     # Termly's inline colors and fonts
    s = re.sub(r"</?bdt\b[^>]*>", "", s)                      # Termly's placeholder tags
    s = re.sub(r"(<div>\s*<br\s*/?>\s*</div>\s*){2,}", "<div><br></div>", s)
    s = re.sub(r"(<table\b)", r'<div class="scroll">\1', s)
    s = s.replace("</table>", "</table></div>")
    for old, new in FIXES:
        s = re.sub(old, new, s)
    return s.strip()


def looks_complete(text, title):
    if len(text) < MIN_LENGTH:
        return False, f"only {len(text)} characters"
    plain = " ".join(html.unescape(re.sub(r"<[^>]+>", " ", text)).split())
    plain = re.sub(r"\s+([,.])", r"\1", plain)
    if title.lower() not in plain.lower():
        return False, f'"{title}" not found in the text'
    for pattern, why in FORBIDDEN:
        if re.search(pattern, plain):
            return False, why
    return True, ""


def strip_note(page):
    # The source note carries the sync time, so ignore it when comparing.
    return re.sub(r"<!-- Synced from Termly.*?-->", "", page, flags=re.S)


def main():
    template = TEMPLATE.read_text(encoding="utf-8")
    failed, changed = [], []
    for p in json.loads(POLICIES.read_text(encoding="utf-8")):
        slug, title, uuid = p["slug"], p["title"], p.get("uuid", "").strip()
        if not uuid:
            print(f"skip   {slug}: no Termly uuid yet")
            continue
        try:
            text = clean(fetch(uuid))
        except Exception as exc:  # network, HTTP or JSON error
            print(f"FAIL   {slug}: could not download ({exc}); keeping the current page")
            failed.append(slug)
            continue
        ok, why = looks_complete(text, title)
        if not ok:
            print(f"FAIL   {slug}: download looks wrong ({why}); keeping the current page")
            failed.append(slug)
            continue
        stamp = datetime.now(timezone.utc).strftime("%m/%d/%Y %H:%M UTC")
        page = (template
                .replace("{{TITLE}}", html.escape(title))
                .replace("{{DESCRIPTION}}", html.escape(p["description"]))
                .replace("{{SLUG}}", slug)
                .replace("<!-- {{SOURCE_NOTE}} -->",
                         f"<!-- Synced from Termly policy {uuid} on {stamp} by "
                         f"scripts/sync_termly.py. Do not edit by hand: change the "
                         f"policy in Termly, or the template and FIXES. -->")
                .replace("{{POLICY_HTML}}", text))
        page = page.replace("<!-- Template for Termly-synced legal pages. Edit this file, not the generated pages. -->\n", "")
        out = ROOT / f"{slug}.html"
        old = out.read_text(encoding="utf-8") if out.exists() else ""
        if strip_note(old) == strip_note(page):
            print(f"same   {slug}.html")
            continue
        out.write_text(page, encoding="utf-8")
        changed.append(slug)
        print(f"update {slug}.html")
    print(f"done: {len(changed)} updated, {len(failed)} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
