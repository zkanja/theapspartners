# The APS Partners — theapspartners.github.io

Forensic Kinaxis Maestro consulting practice. Static editorial site + lead-intake API.

## Structure

```
index.html          single-page site (design system from the Forensic Series)
assets/style.css    tokens: #0a1520 / #00d2be · Playfair Display / Inter / JetBrains Mono
assets/site.js      scroll reveal + lead form (API first, mailto fallback)
assets/carousel/    Forensic Series Nº 01 (webp thumbs + PDF)
assets/video/       Nº 02 CTP forensic + 2030 trajectory films
api/lead.js         serverless lead intake → Postgres (Vercel)
schema.sql          leads table
dev-server.js       local static server + /api/lead emulation (JSON store)
```

## Run locally

```bash
node dev-server.js
# → http://localhost:4173  (form writes to leads.local.json)
```

## Hosting

**GitHub Pages** (live now): serves the static site. The form detects the missing
API and falls back to a pre-filled mailto.

**Vercel** (full backend): import this repo at vercel.com/new, add a Postgres
database (Storage → Neon), run `schema.sql` once, and `DATABASE_URL` makes
`/api/lead` store submissions. No code change needed — the same form starts
POSTing successfully.
