---
title: "HTML First Web Page"
slug: "html-first-web-page"
seo_title: "Your First Web Page With HTML: A Beginner's Full Guide"
meta_description: "Build your html first web page from scratch: headings, paragraphs, links and an image, plus the mistakes beginners make and how to fix them fast, step by step."
focus_keyword: "html first web page"
date: "2026-10-30"
updated: "2026-10-30"
author: "Easy Lesson Team"
categories: ["How-To Guides"]
tags: ["html-basics", "web-development", "beginner-coding", "first-web-page"]
featured_image: "/assets/images/blog/html-first-web-page-thumb.svg"
featured_image_alt: "A simple first web page showing a heading, a paragraph, a link, and an image."
status: "published"
---
Every website you have ever visited started the same way: as a plain text file with a few simple tags. Your html first web page does not need fancy software, a paid course, or any prior experience. All you need is a text editor and a browser, and in under an hour you can build a page with a heading, some paragraphs, a link, and an image — and understand every line of it.

## What HTML Actually Is

HTML stands for HyperText Markup Language, but do not let the name put you off. It is not a programming language with complex logic; it is a way of labelling parts of a page so a browser knows how to show them. You wrap content in tags, and the browser turns those tags into what you see. A heading tag says "this is a heading", a paragraph tag says "this is a paragraph", and so on.

Tags usually come in pairs: an opening tag and a closing tag with a slash, like `<p>` and `</p>`. The content sits between them. A few tags, such as the image tag, stand alone. Once you understand this one idea — tags label content — the rest of HTML is mostly learning which tag does what, and that comes with practice, not memorisation.

## Setting Up in Two Minutes

Open any plain text editor on your device and create a new file called `index.html`. The `.html` ending is what tells the browser to treat the file as a web page. Avoid word processors, which add hidden formatting; a simple code or text editor is the right tool. Then type the basic skeleton of a page:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My First Page</title>
</head>
<body>
</body>
</html>
```

The first line tells the browser this is a modern HTML document. The `head` section holds information about the page, such as its title, which appears on the browser tab. The `body` section holds everything visitors actually see. Save the file, then double-click it or open it in your browser. You will see a blank page with your title on the tab. That blank page is already a working web page.

## Your HTML First Web Page: Headings, Paragraphs, Links and an Image

Now fill in the body with the four building blocks of almost every page. Headings run from `<h1>` (the most important) down to `<h6>`. Use one `<h1>` for the page's main title, then `<h2>` for sections. Paragraphs use `<p>`. Links use `<a>` with an `href` attribute that says where the link goes. Images use `<img>` with a `src` attribute for the image file and an `alt` attribute describing it for readers who cannot see it.

```html
<body>
  <h1>Welcome to My First Page</h1>
  <p>This is my first web page. I built it myself with HTML.</p>
  <h2>What I am learning</h2>
  <p>I am learning headings, paragraphs, links, and images.</p>
  <a href="https://example.org">Visit an example site</a>
  <img src="photo.jpg" alt="A photo I chose for my page">
</body>
```

Save and refresh the browser. Your heading appears large and bold, your paragraphs read as normal text, your link is clickable, and your image appears if the file sits in the same folder as your page. If the image does not appear, check the file name first: one wrong letter in `src` is the most common cause.

![First web page structure diagram](/assets/images/blog/html-first-web-page-diagram-1.svg)

## Making It Look a Little Better

HTML handles structure, not style, but a few habits make a page feel finished. Keep your code tidy with indentation: nested elements sit slightly to the right of their parents, which makes mistakes much easier to spot. Write a meaningful `alt` description for every image, not just the file name. Use headings in order — do not jump from `<h1>` to `<h4>` — because screen readers and search engines use that order to understand your page.

Later, you will meet CSS, which controls colours, fonts, and layout, and JavaScript, which adds interactivity. For now, resist the urge to learn all three at once. A solid grasp of HTML structure makes CSS and JavaScript far easier, because you will always know exactly which part of the page you are styling or changing.

## Fixing the Mistakes Every Beginner Makes

Almost every first page has the same few problems, and all of them are easy to fix. A missing closing tag can swallow the rest of the page into one giant heading — check that every opening tag has its partner. A typo in a tag name, such as `<hader>`, is silently ignored by the browser, so if something does not appear, read your tags letter by letter. A link that goes nowhere usually has a wrong address in `href`, and an image that does not load usually has a wrong file name in `src`.

When something looks wrong, change one thing at a time and refresh. Changing five things at once makes it impossible to tell which change fixed the problem. This habit — one change, one check — is the single most useful debugging skill in all of web development, and it works just as well for larger projects later.

## AI Help: Muse AI

Muse AI is Meta's personal AI assistant, and it can help you understand a tag you have not met before in plain language. For example, you can ask it to explain the difference between a heading and a paragraph, then try both on your own page. Join Muse with invite code LTGSWD — in the Muse app, go to Settings > Redeem token and enter the code. Disclosure: LTGSWD is the author's Muse invite code.

## FAQ

### Do I need special software to write HTML?

No. Any plain text editor works, and every device already has a browser to view the result. Many learners later switch to a code editor for helpful features such as colour-coded tags, but that is a convenience, not a requirement.

### Why does my page look plain compared to real websites?

Real websites add CSS for styling and JavaScript for interactivity on top of HTML. Your plain page is exactly how every professional site starts. Learn the structure first, then add styling, and your pages will quickly start looking familiar.

### What does the doctype line do?

It tells the browser to display the page in modern standards mode rather than an older compatibility mode. You do not need to understand it deeply yet; just include it at the top of every page as a habit.

### How do I share my page with others?

A file on your own device is visible only to you. To share it publicly you need web hosting, which stores your files on a server others can reach. Many free options exist for learners, and that is a natural next step after you are comfortable building pages locally.

### Should I learn HTML before a programming language?

For web development, yes. HTML is the structure everything else builds on, and it teaches you how pages are organised. It is also a gentle first step: you see results immediately, which keeps motivation high while you learn.

## Conclusion

You now know the whole foundation: a page skeleton, headings, paragraphs, links, and an image, plus how to find and fix the usual mistakes. Build a second page tomorrow, then a third, and each one will feel easier than the last. If a textbook exercise on web basics ever confuses you, work through it step by step with [Try the free AI lesson solver](/#tool)
