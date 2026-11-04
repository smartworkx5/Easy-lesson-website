#!/usr/bin/env python3
"""Easy Lesson — batch article builder.

Mirrors the Schoolify/Crypto engines. Takes a batch file and publishes it
locally (writes posts/*.md, generates thumbnails + diagrams, runs
`node build.js`, verifies output). It does NOT push to GitHub — see
push_batch.py for the push step.

Batch file format: gen/batch_0NN.py with BATCH_0NN = [post, ...], each post:
  {
    "slug": "how-to-study-effectively-without-cramming",
    "title": "How to Study Effectively Without Cramming",
    "seo_title": "...",            # 50-60 chars
    "meta_description": "...",     # 150-160 chars
    "focus_keyword": "how to study effectively",
    "category": "Study Tips",      # one of the 5 site categories
    "tags": ["study-tips", ...],   # 3-4 lowercase hyphenated tags
    "featured_image_alt": "One plain sentence describing the thumbnail.",
    "body": "...",                 # full Markdown body (see rules below)
    "diagrams": [                  # 1-2 diagram specs (mandatory)
      {"file": "diagram-1.svg", "type": "flowchart",
       "title": "The Study Loop",
       "items": ["Step 1 ...", "Step 2 ..."]},
    ],
  }

Body rules (all enforced by validation):
- 700+ words of genuinely useful content. No fluff, no repetition.
- 5+ "## " headings (level 2). FAQ section near the end: "## FAQ" with
  4+ "### " questions, each followed by a paragraph answer.
- Conclusion ends with the CTA link: [Try the free AI lesson solver](/#tool)
- Internal links: only /blog/<slug>.html pages that EXIST (in posts/ or
  in this batch). Never link to a future/unwritten article.
- 1-2 diagram image lines, one per spec:
    ![<alt text>](/assets/images/blog/<slug>-diagram-1.svg)
- NO MUSE AI SECTION (user order 2026-11-04): do NOT add any
  "AI Help: Muse AI" section, invite code, or Muse paragraph to any
  article. The old bridge rule is cancelled.
- Worldwide English audience. NEVER frame as Pakistan-only or any single
  country. No specific country/curriculum/board/exam. No fabricated
  statistics, testimonials, reviews, or numbers. No keyword stuffing.

Usage:
  python3 build_batch.py batch_0NN BATCH_0NN   # validate + write + build + verify
  python3 build_batch.py --mark-done slug1 slug2 ...
"""
import importlib.util
import re
import subprocess
import sys
from datetime import date
from html import escape as xesc
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = HERE.parent
POSTS_DIR = SITE / "posts"
IMG_DIR = SITE / "assets" / "images" / "blog"

CATEGORIES = {"AI Study Tools", "Homework Help", "How-To Guides", "Study Tips", "For Teachers"}
CTA = "[Try the free AI lesson solver](/#tool)"
DIAGRAM_TYPES = {"flowchart", "comparison", "timeline", "concept-map", "labelled"}

ERRORS = []


def err(msg):
    ERRORS.append(msg)
    print(f"  FAIL: {msg}")


def strip_md(text):
    t = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"\1", text)
    t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", t)
    t = re.sub(r"[#>*`_]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def word_count(text):
    return len([w for w in strip_md(text).split(" ") if w])


def wrap(text, width):
    words, lines, cur = str(text).split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 <= width:
            cur = (cur + " " + w).strip()
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def fm_quote(val):
    if '"' in val or "\n" in val:
        raise ValueError(f"Frontmatter value must not contain quotes/newlines: {val[:60]}")
    return f'"{val}"'


# ---------------- SVG generators ----------------
PALETTE = ["#2563eb", "#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626"]


def svg_open(w, h):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
            f'viewBox="0 0 {w} {h}" font-family="Arial, Helvetica, sans-serif">')


def thumb_svg(title, category):
    lines = wrap(title, 26)[:3]
    y = 250
    text = "".join(
        f'<text x="70" y="{y + i * 72}" font-size="58" font-weight="800" fill="#ffffff">{xesc(l)}</text>'
        for i, l in enumerate(lines)
    )
    return (
        svg_open(1200, 630)
        + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#2563eb"/>'
        "</linearGradient></defs>"
        '<rect width="1200" height="630" fill="url(#g)"/>'
        '<circle cx="1080" cy="90" r="150" fill="#ffffff" opacity="0.08"/>'
        '<circle cx="1050" cy="560" r="180" fill="#ffffff" opacity="0.06"/>'
        f'<text x="70" y="90" font-size="34" font-weight="700" fill="#93c5fd">Easy Lesson</text>'
        f'<rect x="70" y="130" width="{34 + len(category) * 15}" height="46" rx="23" fill="#fbbf24"/>'
        f'<text x="92" y="161" font-size="24" font-weight="700" fill="#1e3a8a">{xesc(category)}</text>'
        + text
        + '<text x="70" y="560" font-size="26" fill="#bfdbfe">Snap a photo. Learn step by step.</text>'
        "</svg>"
    )


def diagram_svg(spec):
    dtype = spec["type"]
    title = spec["title"]
    items = spec["items"]
    W = 1000
    title_lines = wrap(title, 52)[:2]
    title_h = 40 + len(title_lines) * 30

    def title_block(h):
        out = svg_open(W, h) + f'<rect width="{W}" height="{h}" fill="#ffffff"/>'
        for i, l in enumerate(title_lines):
            out += f'<text x="40" y="{38 + i * 30}" font-size="26" font-weight="700" fill="#1e293b">{xesc(l)}</text>'
        return out

    if dtype == "flowchart":
        if not (2 <= len(items) <= 6):
            raise ValueError("flowchart needs 2-6 items")
        h = title_h + len(items) * 96 + 20
        out = title_block(h)
        y = title_h + 10
        for i, item in enumerate(items):
            color = PALETTE[i % len(PALETTE)]
            out += f'<rect x="180" y="{y}" width="640" height="64" rx="14" fill="{color}"/>'
            for j, l in enumerate(wrap(item, 42)[:2]):
                out += f'<text x="500" y="{y + 30 + j * 22}" font-size="21" font-weight="600" fill="#ffffff" text-anchor="middle">{xesc(l)}</text>'
            if i < len(items) - 1:
                out += (f'<line x1="500" y1="{y + 64}" x2="500" y2="{y + 96}" stroke="#64748b" stroke-width="3"/>'
                        f'<polygon points="500,{y + 96} 490,{y + 82} 510,{y + 82}" fill="#64748b"/>')
            y += 96
        return out + "</svg>"

    if dtype == "comparison":
        if len(items) != 2 or not all(isinstance(c, dict) and "label" in c and "points" in c for c in items):
            raise ValueError("comparison needs 2 columns {label, points}")
        max_rows = max(len(c["points"]) for c in items)
        h = title_h + 70 + max_rows * 40 + 30
        out = title_block(h)
        for ci, col in enumerate(items):
            x = 40 + ci * 490
            color = PALETTE[ci % len(PALETTE)]
            out += f'<rect x="{x}" y="{title_h}" width="460" height="52" rx="10" fill="{color}"/>'
            out += f'<text x="{x + 230}" y="{title_h + 34}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">{xesc(col["label"])}</text>'
            for ri, pt in enumerate(col["points"]):
                yy = title_h + 82 + ri * 40
                out += f'<circle cx="{x + 16}" cy="{yy - 6}" r="6" fill="{color}"/>'
                for j, l in enumerate(wrap(pt, 36)[:1]):
                    out += f'<text x="{x + 34}" y="{yy}" font-size="20" fill="#334155">{xesc(l)}</text>'
        return out + "</svg>"

    if dtype == "timeline":
        if not (2 <= len(items) <= 6):
            raise ValueError("timeline needs 2-6 items")
        h = title_h + 240
        out = title_block(h)
        n = len(items)
        y_line = title_h + 120
        out += f'<line x1="80" y1="{y_line}" x2="920" y2="{y_line}" stroke="#2563eb" stroke-width="4"/>'
        for i, item in enumerate(items):
            x = 80 + i * (840 / (n - 1))
            color = PALETTE[i % len(PALETTE)]
            out += f'<circle cx="{x}" cy="{y_line}" r="14" fill="{color}"/>'
            above = i % 2 == 0
            for j, l in enumerate(wrap(item, 18)[:2]):
                yy = (y_line - 30 - (1 - j) * 24) if above else (y_line + 40 + j * 24)
                out += f'<text x="{x}" y="{yy}" font-size="19" fill="#334155" text-anchor="middle">{xesc(l)}</text>'
        return out + "</svg>"

    if dtype == "concept-map":
        if not (2 <= len(items) <= 6):
            raise ValueError("concept-map needs 2-6 items")
        h = title_h + 420
        out = title_block(h)
        cx, cy = 500, title_h + 210
        out += f'<circle cx="{cx}" cy="{cy}" r="86" fill="#2563eb"/>'
        for j, l in enumerate(wrap("Main idea", 12)[:2]):
            out += f'<text x="{cx}" y="{cy - 8 + j * 22}" font-size="20" font-weight="700" fill="#ffffff" text-anchor="middle">{l}</text>'
        positions = [(170, 90), (500, 60), (830, 90), (170, 330), (500, 360), (830, 330)]
        for i, item in enumerate(items):
            px, py = positions[i][0], positions[i][1] + title_h
            color = PALETTE[i % len(PALETTE)]
            out += f'<line x1="{cx}" y1="{cy}" x2="{px}" y2="{py}" stroke="{color}" stroke-width="2.5"/>'
            out += f'<rect x="{px - 130}" y="{py - 30}" width="260" height="60" rx="12" fill="#eff6ff" stroke="{color}" stroke-width="2"/>'
            for j, l in enumerate(wrap(item, 24)[:2]):
                out += f'<text x="{px}" y="{py - 2 + j * 20}" font-size="19" fill="#1e293b" text-anchor="middle">{xesc(l)}</text>'
        return out + "</svg>"

    if dtype == "labelled":
        if not (2 <= len(items) <= 6):
            raise ValueError("labelled needs 2-6 items")
        h = title_h + len(items) * 64 + 20
        out = title_block(h)
        y = title_h + 10
        out += f'<rect x="60" y="{y}" width="300" height="{len(items) * 64 - 8}" rx="16" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>'
        out += f'<text x="210" y="{y + (len(items) * 64) // 2}" font-size="22" font-weight="700" fill="#1e3a8a" text-anchor="middle">Diagram</text>'
        for i, item in enumerate(items):
            yy = y + i * 64
            color = PALETTE[i % len(PALETTE)]
            out += f'<line x1="360" y1="{yy + 28}" x2="420" y2="{yy + 28}" stroke="{color}" stroke-width="2.5"/>'
            out += f'<circle cx="400" cy="{yy + 28}" r="15" fill="{color}"/>'
            out += f'<text x="400" y="{yy + 35}" font-size="17" font-weight="700" fill="#ffffff" text-anchor="middle">{i + 1}</text>'
            for j, l in enumerate(wrap(item, 34)[:2]):
                out += f'<text x="440" y="{yy + 24 + j * 22}" font-size="20" fill="#334155">{xesc(l)}</text>'
        return out + "</svg>"

    raise ValueError(f"Unknown diagram type: {dtype}")


# ---------------- Muse bridge guard (user order 2026-11-04) ----------------
def strip_muse_bridge(body):
    """Remove any 'AI Help: Muse AI' section / LTGSWD invite text.

    The bridge rule is CANCELLED (2026-11-04). This runs on every batch
    before validation so the section can never come back, even if a batch
    file still contains it; validate_batch then hard-fails on any residue.
    """
    body = re.sub(r"\n## AI Help: Muse AI\n.*?(?=\n## |\Z)", "\n", body, flags=re.S)
    body = "\n".join(l for l in body.splitlines() if "LTGSWD" not in l)
    return body


# ---------------- validation ----------------
def validate_batch(posts, existing_slugs):
    global ERRORS
    ERRORS = []
    seen = set()
    batch_slugs = {p.get("slug", "") for p in posts}
    for p in posts:
        slug = p.get("slug", "")
        tag = f"[{slug or '?'}]"
        for key in ("slug", "title", "seo_title", "meta_description", "focus_keyword",
                    "category", "tags", "featured_image_alt", "body", "diagrams"):
            if key not in p or p[key] in (None, "", []):
                err(f"{tag} missing/empty field: {key}")
        if not slug or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
            err(f"{tag} slug must be lowercase hyphenated")
        if slug in seen:
            err(f"{tag} duplicate slug inside batch")
        seen.add(slug)
        if slug in existing_slugs:
            err(f"{tag} slug already exists in posts/")
        if "seo_title" in p and not (50 <= len(p["seo_title"]) <= 60):
            err(f"{tag} seo_title is {len(p.get('seo_title', ''))} chars (need 50-60)")
        if "meta_description" in p and not (150 <= len(p["meta_description"]) <= 160):
            err(f"{tag} meta_description is {len(p.get('meta_description', ''))} chars (need 150-160)")
        if "category" in p and p["category"] not in CATEGORIES:
            err(f"{tag} category must be one of {sorted(CATEGORIES)}")
        if "tags" in p and not (3 <= len(p["tags"]) <= 4 and all(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", t) for t in p["tags"])):
            err(f"{tag} tags must be 3-4 lowercase hyphenated")
        body = p.get("body", "")
        if "LTGSWD" in body or "AI Help: Muse AI" in body:
            err(f"{tag} contains the removed Muse AI bridge (LTGSWD / 'AI Help: Muse AI') — banned since 2026-11-04")
        wc = word_count(body)
        if wc < 700:
            err(f"{tag} body is {wc} words (need 700+)")
        h2 = re.findall(r"^## (?!#)", body, re.M)
        if len(h2) < 5:
            err(f"{tag} has {len(h2)} H2 headings (need 5+)")
        m = re.search(r"^## FAQ\s*$", body, re.M)
        if not m:
            err(f"{tag} missing '## FAQ' section")
        else:
            faqs = re.findall(r"^### ", body[m.start():], re.M)
            if len(faqs) < 4:
                err(f"{tag} has {len(faqs)} FAQ questions (need 4+)")
        if CTA not in body:
            err(f"{tag} missing conclusion CTA link to /#tool")
        # internal links
        for link in set(re.findall(r"/blog/([a-z0-9-]+)\.html", body)):
            if link != slug and link not in existing_slugs and link not in batch_slugs:
                err(f"{tag} internal link to non-existent /blog/{link}.html")
            if link == slug:
                err(f"{tag} self-link to itself")
        # diagrams
        diags = p.get("diagrams", [])
        if not (1 <= len(diags) <= 2):
            err(f"{tag} needs 1-2 diagrams, got {len(diags)}")
        for d in diags:
            if not isinstance(d, dict) or set(d) != {"file", "type", "title", "items"}:
                err(f"{tag} diagram spec must have exactly file/type/title/items")
                continue
            if d["type"] not in DIAGRAM_TYPES:
                err(f"{tag} unknown diagram type {d['type']}")
            if d["file"] not in ("diagram-1.svg", "diagram-2.svg"):
                err(f"{tag} diagram file must be diagram-1.svg or diagram-2.svg")
            if not (2 <= len(d["items"]) <= 6) and d["type"] != "comparison":
                err(f"{tag} diagram {d['file']} needs 2-6 items")
            ref = f"/assets/images/blog/{slug}-{d['file']}"
            if ref not in body:
                err(f"{tag} body does not reference diagram {ref}")
    return not ERRORS


def write_post(p, today):
    fm_lines = [
        "---",
        f"title: {fm_quote(p['title'])}",
        f"slug: {fm_quote(p['slug'])}",
        f"seo_title: {fm_quote(p['seo_title'])}",
        f"meta_description: {fm_quote(p['meta_description'])}",
        f"focus_keyword: {fm_quote(p['focus_keyword'])}",
        f"date: {fm_quote(today)}",
        f"updated: {fm_quote(today)}",
        'author: "Tasleem Sanjrani"',
        f"categories: [{fm_quote(p['category'])}]",
        "tags: [" + ", ".join(fm_quote(t) for t in p["tags"]) + "]",
        f"featured_image: \"/assets/images/blog/{p['slug']}-thumb.svg\"",
        f"featured_image_alt: {fm_quote(p['featured_image_alt'])}",
        'status: "published"',
        "---",
        "",
    ]
    (POSTS_DIR / f"{p['slug']}.md").write_text("\n".join(fm_lines) + p["body"].strip() + "\n", encoding="utf-8")


def build(batch_file, attr):
    spec = importlib.util.spec_from_file_location("batch_mod", batch_file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    posts = getattr(mod, attr)
    for p in posts:
        if isinstance(p.get("body"), str):
            p["body"] = strip_muse_bridge(p["body"])
    print(f"Loaded {len(posts)} post(s) from {batch_file}::{attr}")
    existing = {f.stem for f in POSTS_DIR.glob("*.md")}
    if not validate_batch(posts, existing):
        print(f"VALIDATION FAILED ({len(ERRORS)} error(s)) — nothing written.")
        return 1
    print("Validation passed.")
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()
    for p in posts:
        (IMG_DIR / f"{p['slug']}-thumb.svg").write_text(
            thumb_svg(p["title"], p["category"]), encoding="utf-8")
        for d in p["diagrams"]:
            (IMG_DIR / f"{p['slug']}-{d['file']}").write_text(
                diagram_svg(d), encoding="utf-8")
        write_post(p, today)
        print(f"  wrote posts/{p['slug']}.md + thumb + {len(p['diagrams'])} diagram(s)")
    print("Running node build.js ...")
    res = subprocess.run(["node", "build.js"], cwd=SITE, capture_output=True, text=True, timeout=600)
    print(res.stdout.strip())
    if res.returncode != 0:
        print("build.js FAILED:\n" + res.stderr[-2000:])
        return 1
    # verify outputs
    sitemap = (SITE / "sitemap.xml").read_text(encoding="utf-8")
    ok = True
    for p in posts:
        page = SITE / "blog" / f"{p['slug']}.html"
        if not page.exists():
            print(f"  FAIL: missing blog/{p['slug']}.html")
            ok = False
        if f"/blog/{p['slug']}.html" not in sitemap:
            print(f"  FAIL: slug missing from sitemap.xml: {p['slug']}")
            ok = False
    if not ok:
        print("VERIFICATION FAILED.")
        return 1
    print(f"BUILD OK — {len(posts)} article(s) live locally (blog/ + sitemap.xml + rss.xml rebuilt).")
    return 0


def mark_done(slugs):
    path = HERE / "topics_300.py"
    lines = path.read_text(encoding="utf-8").splitlines()
    done = 0
    for slug in slugs:
        for i, line in enumerate(lines):
            if f'"slug": "{slug}"' in line and '"status": "todo"' in line:
                lines[i] = line.replace('"status": "todo"', '"status": "done"')
                done += 1
                break
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Marked {done}/{len(slugs)} topic(s) done in topics_300.py.")
    return 0


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "--mark-done":
        sys.exit(mark_done(sys.argv[2:]))
    if len(sys.argv) != 3:
        print("usage: build_batch.py batch_0NN BATCH_0NN | build_batch.py --mark-done slug...")
        sys.exit(2)
    sys.exit(build(sys.argv[1], sys.argv[2]))
