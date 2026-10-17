#!/usr/bin/env node
/**
 * Easy Lesson — static site builder (dependency-free Node).
 *
 * Reads Markdown posts from posts/ and generates:
 *   - blog/<slug>.html        (one page per post)
 *   - blog/index.html         (blog listing, page 1)
 *   - blog/page-N.html        (listing pagination, 9 posts per page)
 *   - sitemap.xml
 *   - rss.xml
 *   - Updates the "Latest blog posts" section of index.html (between LATEST_POSTS markers)
 *
 * Usage: node build.js
 * Run before every deploy after adding or editing posts.
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, "posts");
const BLOG_DIR = path.join(ROOT, "blog");
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "seo-config.json"), "utf8"));
const BASE = CONFIG.base_url.replace(/\/$/, "");
const PER_PAGE = 9;

/* ---------- helpers ---------- */
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}
function formatDate(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
function rfc822(iso) {
  return new Date(iso + "T00:00:00Z").toUTCString();
}
/* Dates must never be in the future: clamp any post date/updated to today.
   (Legacy seed posts once carried staggered future dates; the clamp keeps
   bylines, JSON-LD, sitemap lastmods and RSS pubDates honest.) */
const TODAY = new Date().toISOString().slice(0, 10);
function clampDate(iso) {
  const s = String(iso);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s > TODAY ? TODAY : s;
}
function stripMd(s) {
  return String(s).replace(/[#>*`\[\]()!]/g, "").replace(/\s+/g, " ").trim();
}
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error("Post is missing frontmatter (--- block).");
  const fm = {};
  m[1].split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf(":");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      try { fm[key] = JSON.parse(val); }
      catch { fm[key] = val.slice(1, -1).split(",").map((v) => v.trim().replace(/^"|"$/g, "")); }
    } else if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      fm[key] = val.slice(1, -1);
    } else fm[key] = val;
  });
  return { fm, body: m[2] };
}
function inlineMd(s) {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return out;
}
function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let para = [], list = null, quote = [];
  const flushPara = () => { if (para.length) { blocks.push("<p>" + inlineMd(para.join(" ")) + "</p>"); para = []; } };
  const flushList = () => { if (list) { blocks.push((list.ordered ? "<ol>" : "<ul>") + list.items.map((i) => "<li>" + inlineMd(i) + "</li>").join("") + (list.ordered ? "</ol>" : "</ul>")); list = null; } };
  const flushQuote = () => { if (quote.length) { blocks.push("<blockquote><p>" + inlineMd(quote.join(" ")) + "</p></blockquote>"); quote = []; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#{1,3}\s/.test(line)) {
      flushPara(); flushList(); flushQuote();
      const level = line.match(/^#+/)[0].length;
      const text = line.replace(/^#+\s*/, "");
      const id = slugify(text);
      blocks.push(level === 1 ? "<h1>" + inlineMd(text) + "</h1>" : `<h${level} id="${id}">` + inlineMd(text) + `</h${level}>`);
    } else if (/^\s*---\s*$/.test(line) && !para.length) {
      flushPara(); flushList(); flushQuote(); blocks.push("<hr>");
    } else if (/^[-*]\s+/.test(line)) {
      flushPara(); flushQuote();
      if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; }
      list.items.push(line.replace(/^[-*]\s+/, ""));
    } else if (/^\d+[.)]\s+/.test(line)) {
      flushPara(); flushQuote();
      if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [] }; }
      list.items.push(line.replace(/^\d+[.)]\s+/, ""));
    } else if (/^>\s?/.test(line)) {
      flushPara(); flushList(); quote.push(line.replace(/^>\s?/, ""));
    } else if (line.trim() === "") {
      flushPara(); flushList(); flushQuote();
    } else if (/^!\[([^\]]*)\]\(([^)]+)\)\s*$/.test(line)) {
      flushPara(); flushList(); flushQuote();
      const mm = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
      blocks.push(`<p><img src="${esc(mm[2])}" alt="${esc(mm[1])}" loading="lazy"></p>`);
    } else {
      para.push(line.trim());
    }
  }
  flushPara(); flushList(); flushQuote();
  return blocks;
}

/* ---------- shared chrome (must match the static pages) ---------- */
function header() {
  return `<a class="skip-link" href="#main">Skip to main content</a>
  <header class="site-header">
    <div class="container header-inner">
      <a class="logo" href="/" aria-label="Easy Lesson home"><span class="logo-mark">E</span> Easy Lesson</a>
      <button class="nav-toggle" id="nav-toggle" aria-label="Toggle menu" aria-expanded="false">☰</button>
      <nav class="main-nav" id="main-nav" aria-label="Main navigation">
        <a href="/">Home</a>
        <a href="/#how-it-works">How It Works</a>
        <a href="/#features">Features</a>
        <a href="/blog/">Blog</a>
        <a href="/about.html">About</a>
        <a href="/contact.html">Contact</a>
        <a href="/#tool" class="btn small">Use Tool</a>
        <button class="theme-toggle" id="theme-toggle" aria-label="Toggle dark mode">🌙</button>
      </nav>
    </div>
  </header>`;
}
function footer() {
  return `<footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a class="logo" href="/"><span class="logo-mark">E</span> Easy Lesson</a>
          <p class="small">Easy Lesson is a free AI lesson solver for learners worldwide. Snap a photo of any textbook page and get step-by-step exercise solutions, bullet notes, audio pronunciation and quizzes.</p>
          <div class="social">
            <a href="#" aria-label="Easy Lesson on X">X</a>
            <a href="#" aria-label="Easy Lesson on Facebook">f</a>
            <a href="#" aria-label="Easy Lesson on Instagram">IG</a>
            <a href="#" aria-label="Easy Lesson on YouTube">YT</a>
            <a href="#" aria-label="Easy Lesson on LinkedIn">in</a>
          </div>
          <!-- Social links are placeholders: replace # with real profile URLs in every page footer. -->
        </div>
        <div>
          <h3>Quick Links</h3>
          <ul>
            <li><a href="/#tool">Use the Tool</a></li>
            <li><a href="/#how-it-works">How It Works</a></li>
            <li><a href="/#features">Features</a></li>
            <li><a href="/blog/">Blog</a></li>
            <li><a href="/about.html">About Us</a></li>
            <li><a href="/contact.html">Contact</a></li>
          </ul>
        </div>
        <div>
          <h3>Blog Categories</h3>
          <ul>
            <li><a href="/blog/?category=AI%20Study%20Tools">AI Study Tools</a></li>
            <li><a href="/blog/?category=Homework%20Help">Homework Help</a></li>
            <li><a href="/blog/?category=How-To%20Guides">How-To Guides</a></li>
            <li><a href="/blog/?category=Study%20Tips">Study Tips</a></li>
            <li><a href="/blog/?category=For%20Teachers">For Teachers</a></li>
          </ul>
        </div>
        <div>
          <h3>Legal</h3>
          <ul>
            <li><a href="/privacy-policy.html">Privacy Policy</a></li>
            <li><a href="/terms.html">Terms &amp; Conditions</a></li>
            <li><a href="/disclaimer.html">Disclaimer</a></li>
            <li><a href="/cookie-policy.html">Cookie Policy</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        © <span id="year">2026</span> Easy Lesson. All rights reserved. Made for learners worldwide.
      </div>
    </div>
  </footer>

  <div class="cookie-banner" id="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie consent">
    <p><strong>We use cookies.</strong> Easy Lesson uses cookies to remember your preferences (such as dark mode) and, if you accept, to measure site traffic. We never sell your data. See our <a href="/cookie-policy.html">Cookie Policy</a>.</p>
    <div class="cookie-actions">
      <button class="btn small" id="cookie-accept">Accept</button>
      <button class="btn small outline" id="cookie-decline">Decline</button>
    </div>
  </div>

  <div class="sticky-ad ads-slot" id="sticky-ad" data-slot="sticky_mobile_bottom" data-format="mobile-banner" role="complementary" aria-label="Advertisement">
    <button class="close-ad" id="close-sticky-ad" aria-label="Dismiss advertisement">×</button>
    <div class="ads-label">Advertisement</div>
    <!-- ADSENSE_SLOT: sticky_mobile_bottom — see ads-config.json -->
  </div>

  <script src="/assets/js/main.js" defer></script>`;
}
function head({ title, description, canonical, ogType = "website" }) {
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(canonical)}">
  <meta name="robots" content="index, follow">
  <!-- ADSENSE_SCRIPT: ca-pub-XXXXXXXXXXXXXXXX -->
  <meta property="og:type" content="${ogType}">
  <meta property="og:site_name" content="Easy Lesson">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${BASE}/assets/images/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${BASE}/assets/images/og-image.png">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="#2563eb">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/style.css">`;
}

/* ---------- load posts ---------- */
if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });
const posts = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md")).map((file) => {
  const { fm, body } = parseFrontmatter(fs.readFileSync(path.join(POSTS_DIR, file), "utf8"));
  for (const req of ["title", "slug", "seo_title", "meta_description", "focus_keyword", "date", "author"]) {
    if (!fm[req]) throw new Error(`${file}: missing frontmatter field "${req}".`);
  }
  const words = stripMd(body).split(/\s+/).filter(Boolean).length;
  const blocks = markdownToHtml(body);
  const headings = blocks.filter((b) => /^<h2 id=/.test(b)).map((b) => {
    const m = b.match(/^<h2 id="([^"]+)">([\s\S]+?)<\/h2>$/);
    return { id: m[1], text: m[2].replace(/<[^>]+>/g, "") };
  });
  const firstParaLine = body.split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith("#") && !l.startsWith("---") && !l.startsWith(">") && !l.startsWith("-") && !l.startsWith("*") && !/^\d+[.)]\s/.test(l)) || "";
  const excerpt = stripMd(firstParaLine).slice(0, 160);
  return {
    ...fm,
    categories: Array.isArray(fm.categories) ? fm.categories : [fm.categories || "Uncategorized"],
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    date: clampDate(String(fm.date)), updated: clampDate(String(fm.updated || fm.date)),
    words, readingTime: Math.max(1, Math.ceil(words / 200)),
    blocks, headings, excerpt,
    url: `/blog/${fm.slug}.html`, absUrl: `${BASE}/blog/${fm.slug}.html`,
  };
});
posts.sort((a, b) => (a.date < b.date ? 1 : -1));
console.log(`Loaded ${posts.length} post(s) from posts/.`);

/* ---------- post pages ---------- */
if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, { recursive: true });
function relatedPosts(post) {
  return posts.filter((p) => p.slug !== post.slug).map((p) => {
    const sharedTags = p.tags.filter((t) => post.tags.includes(t)).length;
    const sharedCats = p.categories.filter((c) => post.categories.includes(c)).length;
    return { p, score: sharedTags * 2 + sharedCats };
  }).sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.p);
}
for (const post of posts) {
  const toc = post.headings.length
    ? `<nav class="toc" aria-label="Table of contents"><h2>On this page</h2><ul>${post.headings.map((h) => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join("")}</ul></nav>`
    : "";
  const mid = Math.floor(post.blocks.length / 2);
  const bodyWithAd = [...post.blocks];
  bodyWithAd.splice(mid, 0, `<div class="ads-slot" data-slot="blog_post_mid_article" data-format="rectangle" role="complementary" aria-label="Advertisement"><div class="ads-label">Advertisement</div><!-- ADSENSE_SLOT: blog_post_mid_article — see ads-config.json --></div>`);
  const bodyHtml = bodyWithAd.join("\n");
  const related = relatedPosts(post);
  const shareUrl = encodeURIComponent(post.absUrl);
  const shareText = encodeURIComponent(post.title);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.meta_description,
    image: BASE + (post.featured_image || "/assets/images/og-image.png"),
    datePublished: post.date,
    dateModified: post.updated,
    author: { "@type": "Organization", "name": post.author },
    publisher: { "@type": "Organization", "name": "Easy Lesson", "url": BASE + "/", "logo": { "@type": "ImageObject", "url": BASE + "/assets/images/og-image.png" } },
    mainEntityOfPage: { "@type": "WebPage", "@id": post.absUrl },
    inLanguage: "en",
    wordCount: post.words,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE + "/" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": BASE + "/blog/" },
      { "@type": "ListItem", "position": 3, "name": post.title, "item": post.absUrl },
    ],
  };
  const html = `${head({ title: post.seo_title, description: post.meta_description, canonical: post.absUrl, ogType: "article" })}
  <script type="application/ld+json">
  ${JSON.stringify(jsonLd, null, 2)}
  </script>
  <script type="application/ld+json">
  ${JSON.stringify(breadcrumbLd, null, 2)}
  </script>
</head>
<body>
${header()}
  <main id="main">
    <div class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/blog/">Blog</a></li><li aria-current="page">${esc(post.title)}</li></ol></nav>
    </div>
    <article class="section" style="padding-top:1.5rem">
      <div class="container">
        <p class="post-meta">${post.categories.map((c) => `<a href="/blog/?category=${encodeURIComponent(c)}">${esc(c)}</a>`).join(" · ")}</p>
        <h1>${esc(post.title)}</h1>
        <p class="post-meta">By ${esc(post.author)} · Published ${formatDate(post.date)}${post.updated !== post.date ? ` · Updated ${formatDate(post.updated)}` : ""} · ${post.readingTime} min read</p>
        <div class="ads-slot" data-slot="blog_post_top" data-format="horizontal" role="complementary" aria-label="Advertisement"><div class="ads-label">Advertisement</div><!-- ADSENSE_SLOT: blog_post_top — see ads-config.json --></div>
        <p><img class="post-featured" src="${esc(post.featured_image || "/assets/images/blog/default.svg")}" alt="${esc(post.featured_image_alt || post.title)}" width="1200" height="630" loading="lazy"></p>
        ${toc}
        ${bodyHtml}
        <div class="ads-slot" data-slot="blog_post_end" data-format="horizontal" role="complementary" aria-label="Advertisement"><div class="ads-label">Advertisement</div><!-- ADSENSE_SLOT: blog_post_end — see ads-config.json --></div>
        <div class="share" aria-label="Share this post">
          <span>Share:</span>
          <a href="https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}" target="_blank" rel="noopener">X</a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener">Facebook</a>
          <a href="https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}" target="_blank" rel="noopener">WhatsApp</a>
          <a href="mailto:?subject=${shareText}&body=${shareUrl}">Email</a>
        </div>
        <p>Tags: ${post.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(" ")}</p>
        <div class="card" style="margin-top:1.5rem;text-align:center">
          <h2 style="margin-top:0">Try it on your own lesson</h2>
          <p>Snap a photo of your textbook page and get step-by-step solutions, notes and a quiz.</p>
          <a class="btn" href="/#tool">Use the Free AI Lesson Solver →</a>
        </div>
        ${related.length ? `<h2>Related posts</h2><div class="grid cols-3">${related.map((r) => `<div class="card post-card"><p class="post-date">${formatDate(r.date)}</p><h3><a href="${r.url}">${esc(r.title)}</a></h3><p>${esc(r.excerpt)}</p></div>`).join("")}</div>` : ""}
        <p style="margin-top:2rem"><a href="/blog/">← Back to all blog posts</a></p>
      </div>
    </article>
  </main>
${footer()}
</body>
</html>
`;
  fs.writeFileSync(path.join(BLOG_DIR, `${post.slug}.html`), html);
}
console.log(`Wrote ${posts.length} post page(s) to blog/.`);

/* ---------- blog listing (paginated) ---------- */
const allCats = [...new Set(posts.flatMap((p) => p.categories))].sort();
const totalPages = Math.max(1, Math.ceil(posts.length / PER_PAGE));
function cardHtml(post) {
  const search = [post.title, post.excerpt, ...post.tags, ...post.categories, post.focus_keyword].join(" ");
  return `<div class="card post-card" data-post-card data-category="${esc(post.categories[0])}" data-search="${esc(search)}">
        <p class="post-date">${formatDate(post.date)} · ${post.readingTime} min read</p>
        <h3><a href="${post.url}">${esc(post.title)}</a></h3>
        <p>${esc(post.excerpt)}…</p>
        <p>${post.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(" ")}</p>
      </div>`;
}
function listingPage(pageNum) {
  const start = (pageNum - 1) * PER_PAGE;
  const pagePosts = posts.slice(start, start + PER_PAGE);
  const isFirst = pageNum === 1;
  const canonical = isFirst ? `${BASE}/blog/` : `${BASE}/blog/page-${pageNum}.html`;
  const title = isFirst ? CONFIG.pages["/blog/"].title : "Blog Page 2 — AI Lesson Solver Tips & Study Guides";
  const pageDesc = isFirst ? CONFIG.pages["/blog/"].description : "Page 2 of the Easy Lesson blog: more study guides, how-to articles and honest advice on using an AI lesson solver and photo-based learning. Keep reading.";
  const cards = pagePosts.map(cardHtml);
  if (isFirst && cards.length > 3) {
    cards.splice(3, 0, `<div class="ads-slot" data-slot="blog_list_between_posts" data-format="horizontal" role="complementary" aria-label="Advertisement"><div class="ads-label">Advertisement</div><!-- ADSENSE_SLOT: blog_list_between_posts — see ads-config.json --></div>`);
  }
  const pagination = totalPages > 1 ? `<nav class="pagination" aria-label="Blog pagination">${pageNum > 1 ? `<a href="${pageNum === 2 ? "/blog/" : `/blog/page-${pageNum - 1}.html`}">← Prev</a>` : ""}${Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => n === pageNum ? `<span class="current" aria-current="page">${n}</span>` : `<a href="${n === 1 ? "/blog/" : `/blog/page-${n}.html`}">${n}</a>`).join("")}${pageNum < totalPages ? `<a href="/blog/page-${pageNum + 1}.html">Next →</a>` : ""}</nav>` : "";
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE + "/" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": BASE + "/blog/" },
    ],
  };
  return `${head({ title, description: pageDesc, canonical })}
  <script type="application/ld+json">
  ${JSON.stringify(breadcrumbLd, null, 2)}
  </script>
</head>
<body>
${header()}
  <main id="main">
    <div class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li aria-current="page">Blog</li></ol></nav>
    </div>
    <section class="section" style="padding-top:1.5rem">
      <div class="container">
        <h1>Easy Lesson Blog</h1>
        <p class="lead">Study guides, how-to articles and honest advice on learning with an AI lesson solver.</p>
        <div class="blog-controls">
          <input type="search" id="blog-search" placeholder="Search blog posts…" aria-label="Search blog posts">
        </div>
        <div class="blog-controls" role="group" aria-label="Filter by category">
          <button class="cat-btn active" data-cat-filter="all">All</button>
          ${allCats.map((c) => `<button class="cat-btn" data-cat-filter="${esc(c)}">${esc(c)}</button>`).join("")}
        </div>
        <div class="grid cols-3" id="blog-grid">
          ${cards.join("\n          ")}
        </div>
        <p id="blog-empty" style="display:none">No posts match your search. Try a different keyword or category.</p>
        ${pagination}
        <div class="card" style="margin-top:2.5rem;text-align:center">
          <h2 style="margin-top:0">Try the tool these posts are about</h2>
          <p>Snap a photo of your textbook page and get step-by-step solutions, notes and a quiz.</p>
          <a class="btn" href="/#tool">Use the Free AI Lesson Solver →</a>
        </div>
      </div>
    </section>
  </main>
${footer()}
</body>
</html>
`;
}
fs.writeFileSync(path.join(BLOG_DIR, "index.html"), listingPage(1));
for (let p = 2; p <= totalPages; p++) fs.writeFileSync(path.join(BLOG_DIR, `page-${p}.html`), listingPage(p));
console.log(`Wrote blog listing (${totalPages} page(s)).`);

/* ---------- sitemap.xml ---------- */
const staticUrls = ["/", "/about.html", "/contact.html", "/privacy-policy.html", "/terms.html", "/disclaimer.html", "/cookie-policy.html", "/blog/"];
for (let p = 2; p <= totalPages; p++) staticUrls.push(`/blog/page-${p}.html`);
const today = new Date().toISOString().slice(0, 10);
const sitemapEntries = [
  ...staticUrls.map((u) => `  <url><loc>${BASE}${u}</loc><lastmod>${today}</lastmod></url>`),
  ...posts.map((p) => `  <url><loc>${p.absUrl}</loc><lastmod>${p.updated}</lastmod></url>`),
];
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.join("\n")}\n</urlset>\n`);
console.log("Wrote sitemap.xml.");

/* ---------- rss.xml ---------- */
const rssItems = posts.map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${p.absUrl}</link>
      <guid isPermaLink="true">${p.absUrl}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <description>${esc(p.excerpt)}</description>
      <category>${esc(p.categories[0])}</category>
    </item>`).join("\n");
fs.writeFileSync(path.join(ROOT, "rss.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>Easy Lesson Blog</title>\n    <link>${BASE}/blog/</link>\n    <description>${esc(CONFIG.default_meta_description)}</description>\n    <language>en</language>\n${rssItems}\n  </channel>\n</rss>\n`);
console.log("Wrote rss.xml.");

/* ---------- homepage latest posts ---------- */
const indexPath = path.join(ROOT, "index.html");
let indexHtml = fs.readFileSync(indexPath, "utf8");
const latest = posts.slice(0, 6).map((p) => `<div class="card post-card"><p class="post-date">${formatDate(p.date)} · ${p.readingTime} min read</p><h3><a href="${p.url}">${esc(p.title)}</a></h3><p>${esc(p.excerpt)}…</p></div>`).join("\n          ");
const latestBlock = `<div class="grid cols-3" id="latest-posts-grid">\n          ${latest}\n        </div>`;
indexHtml = indexHtml.replace(/<!-- LATEST_POSTS:START -->[\s\S]*?<!-- LATEST_POSTS:END -->/, `<!-- LATEST_POSTS:START -->\n        ${latestBlock}\n        <!-- LATEST_POSTS:END -->`);
fs.writeFileSync(indexPath, indexHtml);
console.log("Updated index.html latest-posts section.");
console.log("Build complete.");
