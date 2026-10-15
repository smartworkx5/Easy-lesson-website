# Easy Lesson — AdSense Application Guide

Site: Easy Lesson — https://www.easylesson.example
Contact: [CONTACT_EMAIL]
AdSense publisher ID placeholder used throughout this site: `ca-pub-XXXXXXXXXXXXXXXX` (replace with the real ID once AdSense issues one — see Step 2).

This guide walks the site owner through applying for Google AdSense, placing the code correctly in this specific site, and staying compliant after approval. Do not skip the prerequisites — applying with thin content or visible placeholders is the most common reason for rejection.

---

## Step 1 — Prerequisites (Before You Apply)

Complete all of these before submitting the AdSense application:

1. **Publish 15–20 quality posts.**
   - First, review/edit the 10 starter drafts from the content calendar — fix anything thin, generic, or inaccurate, and only then publish them.
   - Then keep publishing from the content calendar until 15–20 posts are live. Each post should be original, genuinely helpful, and substantial — not a short stub or a rewritten version of another post.
2. **Legal / trust pages live.** These pages must be published and reachable from the site navigation or footer:
   - About
   - Contact (using [CONTACT_EMAIL])
   - Privacy Policy
   - Terms of Service
   - Disclaimer
3. **No placeholder content visible.** Search the live site for placeholders before applying. Nothing like `ca-pub-XXXXXXXXXXXXXXXX`, `[CONTACT_EMAIL]`, or example-domain text should be visible to visitors (the AdSense placeholders covered in Step 2 are code-level placeholders that visitors do not see as content, but replace them as instructed once you have a real publisher ID).
4. **Real domain + HTTPS.** The site must be on its real domain (not the `https://www.easylesson.example` placeholder used in docs) with a valid HTTPS certificate. See `deployment-guide.md` for deployment and SSL setup.

---

## Step 2 — In AdSense: Add the Site and Place the Verification Code

1. Sign in to [Google AdSense](https://www.google.com/adsense/) with the Google account that will own the AdSense account.
2. Add your site: **Sites → Add site**, enter the real domain, and submit.
3. AdSense will give you a verification / AdSense code snippet containing your publisher ID, which looks like `ca-pub-XXXXXXXXXXXXXXXX` (your real ID will replace the X's).
4. **Where the code goes in THIS site — replace the placeholder in all three places:**

   a. **Every page's `<head>` — the AdSense script comment placeholder.**
      - In every `.html` file, the `<head>` contains a comment placeholder:
        `<!-- ADSENSE_SCRIPT: ca-pub-XXXXXXXXXXXXXXXX -->`
      - Replace `ca-pub-XXXXXXXXXXXXXXXX` in that comment with your real publisher ID on **every** `.html` page, and make sure the AdSense script tag itself is present as AdSense instructs (the comment marks where it belongs).
   b. **`ads-config.json` — the `publisherId` field.**
      - Open `ads-config.json` and set `"publisherId"` to your real publisher ID (replacing `ca-pub-XXXXXXXXXXXXXXXX`).
      - Leave `"ads_enabled": false` until approval (see Step 4).
   c. **`ads.txt` — the placeholder line.**
      - Open `ads.txt` and replace `ca-pub-XXXXXXXXXXXXXXXX` on the placeholder line with your real publisher ID, keeping the rest of the line format exactly as AdSense specifies.
5. Rebuild/redeploy the site after making these changes (see `deployment-guide.md` — run `node build.js` before deploying if you changed any posts).
6. Back in AdSense, click **Verify / Request review** (wording varies). AdSense will check that the code is present on the live site.

---

## Step 3 — Google Search Console, Sitemap, and the Review Wait

1. **Connect Google Search Console.**
   - Add the site as a property in [Google Search Console](https://search.google.com/search-console/).
   - Verify ownership using the GSC verification meta tag placeholder in `seo-config.json` — replace the placeholder with the real verification value Google gives you, then redeploy.
2. **Submit the sitemap.**
   - In Search Console, go to **Sitemaps** and submit `https://www.easylesson.example/sitemap.xml` — replacing `https://www.easylesson.example` with the real domain.
   - Confirm the sitemap loads in a browser at the real-domain URL.
3. **Wait for the AdSense review.**
   - Typical timeline: review often takes a few days to a few weeks. Timing varies; there is no exact date AdSense guarantees.
   - **While waiting — keep publishing.** Continue the one-post-per-day content calendar, fix any thin posts, and improve internal linking. A growing, active site reviews better than a frozen one.
   - Do not resubmit repeatedly or make unnecessary account changes while a review is pending.

---

## Step 4 — After Approval: Turn Ads On

1. In AdSense, create your ad units and copy each real ad-unit **slot ID**.
2. Open `ads-config.json`:
   - Set `"ads_enabled": true`.
   - Replace every placeholder slot ID with the real ad-unit slot IDs from AdSense.
3. Rebuild and redeploy the site (`node build.js` first if any posts changed — see `deployment-guide.md`).
4. Verify on the live site that ads render in the intended placements and that the tool, navigation, and content still work normally.

---

## ⚠️ HARD WARNINGS — Read Before Touching Any Ad

**Violating any of these can get the AdSense account banned, often permanently.**

- **NEVER click your own ads.** Not once, not to test, not "just to see if it works." Testing ad rendering is done by viewing the page, never by clicking an ad.
- **NEVER ask friends, family, students, or anyone else to click your ads.** Asking others to click is the same violation as clicking yourself.
- **NEVER buy fake traffic, use click bots, or use any service that promises clicks or traffic.** Bot traffic, click rings, and paid-to-click schemes get accounts banned. Grow traffic through real content and real readers only.

### Ad Placement Policy Summary (This Site)

- **No ads over tool buttons.** Ads must never cover, overlap, or sit on top of the Lesson Solver AI tool buttons or any interactive control.
- **No ads that push the tool out of view.** The tool on the homepage must remain easy to find and use — ads must not shove it below the fold or bury it.
- **No excessive ad density.** Do not stack ads densely above, inside, and below every section. Keep the page readable, with content clearly dominant.
- **Ads clearly distinguishable from content.** Ads must be recognisably ads — never styled or labelled in a way that makes them look like part of the lesson content, tool output, or navigation.

If in doubt about a placement, leave the ad out. One missing ad slot costs little; a policy violation can cost the whole account.

---

## Troubleshooting — Common Rejection Reasons and Fixes

### Thin content
- **What it means:** Pages are too short, generic, or add nothing beyond what is already on the homepage or in other posts.
- **Fix:** Expand each post to genuinely answer its question with worked examples, steps, and specifics. Merge or remove stub posts. Make sure every published post stands on its own and is not a near-duplicate of another post.

### Low-value content
- **What it means:** Content feels mass-produced, scraped, or written for search engines rather than readers — e.g. posts that repeat the same generic advice with a keyword swapped in.
- **Fix:** Rewrite posts with original, specific guidance: real walkthroughs of the tool, concrete photo tips, honest limits, and examples tied to the post's topic. Cut keyword repetition. Keep publishing original posts on the content-calendar schedule.

### Navigation issues
- **What it means:** Visitors (and reviewers) cannot easily move around the site — broken links, missing pages, orphaned posts, or no clear path to the tool and key pages.
- **Fix:** Check that every page loads, every nav/footer link works, the blog listing links to every post, and the homepage tool (/#tool) is reachable from every page. Fix or remove broken links. Confirm About, Contact, Privacy, Terms, and Disclaimer are linked from the footer on every page. Then re-apply once the site is clean.

### Site not ready / placeholder content
- **What it means:** Visible placeholders, unfinished pages, or a site that still looks under construction.
- **Fix:** Finish or remove unfinished pages, replace all visible placeholders with real content (contact email [CONTACT_EMAIL] → real address on the live site), and re-check on the real domain over HTTPS before re-applying.

After fixing the cited reason, wait until the fixes are live and verifiable, then request a re-review in AdSense. Do not re-apply with the same content unchanged — it will be rejected again.
