# Blackouts, Bills, and Boil Orders (On the Bayou)

An independent, open-source civic project that helps New Orleans residents understand
their utility costs and reliability.

The site tracks three regulated utilities and the regulators that oversee them:

- **Entergy** (electric) — outage timelines and economic impact
- **Sewerage & Water Board of New Orleans** (water/sewer) — boil-water advisories and infrastructure failures
- **Delta Utilities** (gas) — bill calculator showing what changed after the Entergy-to-Delta gas handoff in July 2025

There is also a homepage news feed that pulls relevant local reporting from
Verite News, The Lens, WWNO, and the Times-Picayune / The Advocate, classified
twice daily by Claude.

## Why this exists

The City Council's own Utility Advisors estimated that the Entergy-to-Delta gas
sale would raise the typical residential bill by ~$12.33/month before mitigation
([R-24-791](https://council.nola.gov/council/media/Assets/Committees/Utility/R-24-791-Gas-Sale.pdf), p. 8).
Mitigation conditions reduced the projected impact to ~$2.60/month. Most residents
did not see the analysis; the bill calculator surfaces it transparently.

## Tech stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Recharts
- **Backend**: Vercel serverless functions (Node 22)
- **Database**: Supabase (Postgres) for community bill submissions and the news feed
- **AI**: Anthropic Claude (Opus 4.7) for bill PDF extraction and news classification

## Local development

```sh
# 1. Install dependencies
npm install

# 2. Pull environment variables from Vercel (you need to be linked + logged in)
vercel env pull .env.local

# 3. Start the full local stack (frontend + serverless API)
vercel dev
```

The site will be at <http://localhost:3000>.

If you only need the frontend (the API routes won't work, but the UI will render):

```sh
npm run dev
```

## Required environment variables

| Variable                       | Used by                                     |
| ------------------------------ | ------------------------------------------- |
| `ANTHROPIC_API_KEY`            | Bill PDF extraction, news classifier        |
| `SUPABASE_URL`                 | All API endpoints                           |
| `SUPABASE_SERVICE_ROLE_KEY`    | All API endpoints                           |
| `CRON_SECRET`                  | News-ingest cron auth                       |
| `TP_SESSION_COOKIE` (optional) | TP article-body fetch if paywall metering hits |

All secrets live in Vercel — never in this repo, even gitignored.

## Project layout

```
api/                       # Vercel serverless functions
  _lib/                    # shared backend code
    news/                  # news ingestion: sources, classify, dedupe, html-fetch
  community-stats.js       # GET aggregate bill stats
  extract-bill.js          # POST PDF -> structured bill (Claude)
  news-ingest.js           # cron: fetch -> prefilter -> classify -> dedupe
  news.js                  # GET top-5 approved articles
  submit-bill.js           # POST validated bill -> Supabase

src/
  components/              # React components, one per feature
  data/                    # static reference data (rates, validation bills)
  lib/                     # frontend helpers (bill math, image compress)

scripts/                   # local dev scripts (testFetchSource, runIngest, ...)
supabase/migrations/       # SQL migrations to run in the Supabase SQL editor
public/                    # static assets, robots.txt, sitemap.xml, privacy.html
```

## Methodology

The water and electricity reliability methodologies are documented inside the app
(see `src/components/WaterMethodology.jsx`, `ElectricityMethodology.jsx`) and link
out to primary sources — DOE/LBNL outage cost models, Bureau of Labor Statistics
wage data, US Census household figures, and S&WB / Entergy press releases.

The gas bill calculator validates against the published rate schedule from City
Council Resolution R-24-791 and reconciles to actual residential bills with
better than 1% accuracy (see `src/lib/validate.mjs`).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Data corrections and methodology
critiques are especially welcome.

## License

[MIT](./LICENSE) — use this code, fork it, adapt it for your own city's utilities.
