# financiale.fr — website

Static website for **Financiale Gestion Privée**, rebuilt from the Framer design as plain, version-controlled code so it can be hosted entirely on Financiale's own EU server.

| | |
|---|---|
| Framework | [Astro 7](https://astro.build), static output (plain HTML/CSS, a few KB of JS) |
| Content | YAML + Markdown files in `src/content/` and `src/data/` |
| Images | Stored in the repo, converted at build time to AVIF + WebP in several sizes |
| Fonts | Spectral + TASA Orbiter, self-hosted via `@fontsource` (no Google Fonts calls) |
| Web server | Caddy (automatic HTTPS, security headers, 301 redirects) |
| Contact form | Small self-hosted Node service (`form-handler/`) that sends e-mail over an EU SMTP |
| CI/CD | Forgejo Actions: check + build on every PR, deploy on merge to `main` |

---

## Recommended setup for EU compliance

```
            ┌──────────────────────── Financiale's EU server ────────────────────────┐
 editor ──► │ Forgejo (Git + CI runner) ──deploy──► docker compose: Caddy + form-handler │ ◄── visitors
            └─────────────────────────────────────────────────────────────────────────┘
```

1. **Hosting: the client's own EU server** (any EU provider: OVHcloud, Scaleway, Hetzner, IONOS…). The site is static, so a small VPS (2 vCPU / 2 GB RAM) is plenty.
2. **Git: self-hosted [Forgejo](https://forgejo.org)** on the same server (or a second small EU VM). The source code, history and CI all stay in the EU. GitHub and GitLab.com work technically, but their hosting is outside the EU.
3. **Zero third-party requests on page load.** No Google Fonts, no Framer CDN, no external analytics or embeds. No cookies are set, so **no consent banner is needed**. The Content-Security-Policy in `deploy/Caddyfile` enforces this: the browser blocks anything not served from the site's own domain.
4. **Contact form** submissions go to `form-handler/` on the same server and are e-mailed through an EU SMTP relay. Nothing is stored on disk or written to logs.
5. **Logs** are written with IP addresses truncated (`ip_mask` in the Caddyfile).
6. **Analytics (optional):** if you need traffic statistics, self-host [Matomo](https://matomo.org) or [Plausible CE](https://plausible.io/self-hosted-web-analytics) on the same server in cookieless mode, then add its domain to the CSP.

Why not a headless CMS? The site has ~20 pages that rarely change, so a database and admin panel would add attack surface and maintenance for little benefit. Content lives in readable files (`src/content/pages/*.yaml`, `src/content/blog/*.md`). Every edit goes through Git, which gives you review, history and one-click rollback. If non-technical staff need to edit content themselves later, a Git-based editor such as Decap CMS can be added on top of these same files without changing the site.

---

## Getting started

Requires Node 22+.

```bash
npm install
npm run fetch-assets   # ONE TIME: pulls every image from the Framer project into src/assets/images/
npm run dev            # http://localhost:4321
```

> **`npm run fetch-assets` must run once before the first commit.** It downloads the ~120 images that are still on Framer's CDN (capped at 2560 px) into `src/assets/images/`. Commit them; after that the site has no dependency on Framer. Until the images are present, the pages show grey placeholders, and CI builds fail on purpose (`STRICT_ASSETS=1`).

Other commands:

```bash
npm run check    # validates content: missing images, broken internal links, unknown team members
npm run build    # production build into dist/
npm run preview  # serve dist/ locally
```

## Image optimisation

Source images live in `src/assets/images/` and are never served as-is. At build time, `src/components/Img.astro` generates:

- **AVIF** and **WebP** versions (JPEG/PNG fallback for very old browsers)
- several widths (640 → 2400 px for full-width images, 180 → 1280 px for cards and thumbnails), with an accurate `sizes` attribute so each device downloads only the size it needs
- `loading="lazy"` everywhere except the hero image, which loads first with `fetchpriority="high"`
- Open Graph sharing images at 1200 px

To add an image, drop the file into `src/assets/images/` and reference it as `/images/<file>` in the content.

## Project structure

```
src/
  content/pages/*.yaml     one file per page, built from "blocks" (hero, context, carousel…)
  content/blog/*.md        blog articles
  data/site.yaml           navigation, footer, address, legal footer text
  data/team.yaml           team members (referenced by id from pages)
  data/contact.yaml        contact page texts and form options
  data/mentions-legales.md legal notice
  components/blocks/       one component per block type
  components/Img.astro     optimised images
  layouts/Base.astro       <head>, SEO, header/footer
form-handler/              contact form service (Node, nodemailer)
deploy/Caddyfile           web server: HTTPS, security headers, caching
deploy/redirects.caddy     301 redirects from the old site and the Framer preview
docs/CONTENU.md            content editing guide (French, for editors)
```

See **[docs/CONTENU.md](docs/CONTENU.md)** for how to edit pages, add a blog post or update the team.

## Deployment (first time, on the EU server)

```bash
# 1. Prerequisites: Docker + Docker Compose, DNS A/AAAA records for financiale.fr and www.financiale.fr
git clone <forgejo-url>/financiale/website.git /srv/financiale && cd /srv/financiale
cp deploy/.env.example .env                    # domains + e-mail for TLS certificates
cp form-handler/.env.example form-handler/.env # EU SMTP credentials
docker compose up -d --build
```

After that, every merge to `main` deploys automatically (`.forgejo/workflows/deploy.yml`). Set the four `DEPLOY_*` secrets in the repository settings, and register a Forgejo Actions runner on the server.

**Rollback:** revert the commit in Forgejo. The pipeline redeploys the previous version.

## Shared hosting (FTP) — current test setup

The client's hosting at **www.financiale-corporate.fr** is a classic Apache/PHP shared host with FTP access, so the Docker/Caddy setup isn't used there. The site works the same way:

- **No database.** The site is static HTML, so MySQL is not needed.
- `public/.htaccess` does what `deploy/Caddyfile` does: HTTPS + www, clean URLs (`/contact` serves `contact.html`), the 301 redirects from the old site, security headers (CSP, HSTS…), caching and the 404 page. It needs `mod_rewrite` and `mod_headers` (standard).
- `public/api/contact.php` replaces `form-handler/`: the contact form posts to `/api/contact`, the PHP script validates it and sends the e-mail with the host's `mail()` function. Works with PHP 7.4+. Edit `MAIL_TO` / `MAIL_FROM` at the top of the file if needed (`MAIL_FROM` must be an address on the hosted domain).
- **Automatic deploy:** `.github/workflows/deploy-ftp.yml` builds the site and uploads `dist/` to the FTP root (which is the site root) over FTPS on every push to `main`. Add the secrets `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` and the variable `SITE_URL` in the GitHub repository settings. Never commit FTP credentials to the repo.
- **Contact form e-mail (SMTP):** add the repository secrets `SMTP_HOST`, `SMTP_PORT` (587 or 465), `SMTP_SECURE` (`tls` or `ssl`), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_TO`. The deploy job writes `api/smtp-config.php` from them on each run; the file never exists in Git. Without them, the form falls back to PHP `mail()`, which Microsoft 365 tends to junk.
- **Manual deploy:** `SITE_URL=https://www.financiale-corporate.fr PREVIEW=1 npm run build`, then upload the *contents* of `dist/` into the FTP root with an FTP client (FileZilla). Make sure the hidden `.htaccess` file is uploaded too.
- While on the test domain, `PREVIEW=1` keeps the site out of Google (noindex + `robots.txt`). Set it to `0` when the site goes live on financiale.fr.

## SEO notes for the switch-over

- `deploy/redirects.caddy` sends every URL of the **current** financiale.fr (Flow CMS, `.html` pages) to its new equivalent with a 301, so existing rankings carry over. Keep these redirects for at least 12 months.
- URLs no longer contain accents (`/mentions-legales`, blog slugs). The accented Framer URLs redirect too.
- `sitemap.xml` and `robots.txt` are generated at build time. Submit the sitemap in Google Search Console and Bing Webmaster Tools after launch.
- Every page has a unique `<title>` and meta description (`seo:` in each YAML file), a canonical URL, Open Graph tags, and `FinancialService` JSON-LD (`Article` on blog posts).

## Before going live: checklist

- [ ] Run `npm run fetch-assets` and commit the images
- [ ] Fill in the hosting provider in `src/data/mentions-legales.md` (a French legal requirement under the LCEN)
- [ ] Confirm the share capital: the footer says "51 010,00 €" but the legal notice says "capital variable minimum de 1.000 €"
- [ ] Add social media URLs in `src/data/site.yaml` (icons only appear when a URL is set)
- [ ] Decide where `/myfinanciale.html` (the old client area) should redirect. It currently goes to `/contact`
- [ ] Configure the EU SMTP relay in `form-handler/.env` and send a test enquiry
- [ ] Point DNS to the server and check https://www.ssllabs.com and https://securityheaders.com
