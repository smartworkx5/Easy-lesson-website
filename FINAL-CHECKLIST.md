# FINAL CHECKLIST — things only the site owner can do

The site is complete and deploy-ready, but these steps need your own decisions, accounts or identity. Work through them in order.

## 1. Domain & hosting
- [ ] Buy / choose a domain (e.g. a short `.com` — the placeholder `https://www.easylesson.example` is NOT a real domain).
- [ ] Replace `https://www.easylesson.example` with your real domain in:
  - `seo-config.json` → `base_url`
  - Every `.html` file's canonical + Open Graph URLs (search for `easylesson.example`)
  - `robots.txt` (sitemap URL)
  - Then run `node build.js` to regenerate `sitemap.xml` / `rss.xml` with the real domain.
- [ ] Deploy the whole folder (see `deployment-guide.md`: Vercel, Netlify or cPanel).
- [ ] Confirm HTTPS works (SSL) and the site loads at your domain.

## 2. Real contact details
- [ ] Replace `[CONTACT_EMAIL]` everywhere (Contact page, Privacy, Terms, Disclaimer, Cookie pages, `seo-config.json`) with your real public contact email.
- [ ] Replace the `#` social links in every page footer with your real profile URLs (or delete the icons you do not use).
- [ ] Connect the contact form: put a Formspree endpoint in `contact.html` (`data-endpoint="…"`) — see README — or set up Netlify Forms.

## 3. Content review (do this BEFORE applying for AdSense)
- [ ] Read and edit the 10 starter blog posts in `posts/` — they are marked `status: draft` and are drafts for you to review. Fix anything that does not match your voice, add your own examples, and set `status: published` when happy.
- [ ] Publish more posts from `content-calendar.md` (one per day) until **15–20 quality posts** are live. AdSense expects a site with substantial original content.
- [ ] Check every page for leftover placeholders (search the folder for `XXXXXXXXXXXXXXXX`, `REPLACE_WITH`, `[CONTACT_EMAIL]`, `easylesson.example`).

## 4. Search Console & analytics
- [ ] Add the site in Google Search Console, verify it with the GSC meta tag (paste where the `GOOGLE_SEARCH_CONSOLE_VERIFICATION` comment points in each page `<head>` — the code lives in `seo-config.json` → `verification`), and submit `https://YOURDOMAIN/sitemap.xml`.
- [ ] Add the site in Bing Webmaster Tools (same process, `verification.bing_webmaster`).
- [ ] If you want analytics, add your GA4 Measurement ID (`verification.google_analytics_4`) and paste the GA4 script where the comment points in each page `<head>`.

## 5. AdSense (account = YOUR step, never outsourced)
- [ ] Read `adsense-guide.md` fully.
- [ ] Apply for AdSense with YOUR identity, address, tax and payment details. Accept Google's terms yourself.
- [ ] Paste the AdSense verification code where the `ADSENSE_SCRIPT` comments point.
- [ ] After approval: replace `ca-pub-XXXXXXXXXXXXXXXX` with your real publisher ID in `ads-config.json`, `ads.txt` and every page's `ADSENSE_SCRIPT` comment; replace `REPLACE_WITH_AD_SLOT_ID` with real slot IDs; set `"ads_enabled": true` in `ads-config.json`; rebuild and redeploy.
- [ ] If you serve visitors in the EEA/UK, connect a Google-certified consent management platform (CMP) before serving personalised ads — see `cookie-policy.html` and `adsense-guide.md`.
- [ ] **NEVER click your own ads. NEVER buy fake traffic or ask anyone to click.** Any of these gets the account banned.

## 6. Final QA before launch
- [ ] Open the site on your phone: homepage tool iframe loads, "Use Tool" button scrolls to the tool, dark mode toggle works, cookie banner appears and dismisses.
- [ ] Try the tool end-to-end: add your free Google AI Studio API key inside the tool, upload a textbook photo, confirm solutions appear.
- [ ] Check `/blog/` loads, search + category filters work, a post page shows TOC + related posts + share buttons.
- [ ] Check `/sitemap.xml` and `/rss.xml` load at your domain.
- [ ] Run `node build.js` once more and confirm it completes with no errors.

## Placeholder inventory (everything that must be replaced)

| Placeholder | Meaning |
|---|---|
| `https://www.easylesson.example` | Fake base URL — replace with the real domain. |
| `[CONTACT_EMAIL]` | No contact email yet — add your real one. |
| `ca-pub-XXXXXXXXXXXXXXXX` | Fake AdSense publisher ID — replace after approval. |
| `REPLACE_WITH_AD_SLOT_ID` | Fake ad-unit slot IDs (7 slots) — replace after approval. |
| `REPLACE_WITH_GSC_VERIFICATION_CODE` | Search Console verification — add your real code. |
| `REPLACE_WITH_BING_VERIFICATION_CODE` | Bing verification — add your real code. |
| `REPLACE_WITH_GA4_MEASUREMENT_ID` | Google Analytics 4 — add your real ID if you use it. |
| `REPLACE_WITH_GTM_ID` | Google Tag Manager — add your real ID if you use it. |
| `#` social links | Footer social icons — replace with real profile URLs. |
| `data-endpoint="#"` | Contact form — connect Formspree / Netlify Forms. |
| `status: draft` on the 10 starter posts | Drafts — review, then set to `published`. |
| "Testimonials" / usage counters | Deliberately NOT included — no fake testimonials or fake statistics anywhere on the site. |
