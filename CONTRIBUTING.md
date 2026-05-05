# Contributing

Thanks for your interest. This project is run by one person on the side, but
contributions of any size are welcome — especially data corrections, methodology
critiques, and accessibility fixes.

## Reporting a data error

If something on the site looks wrong — a misattributed outage, an incorrect
rate, an out-of-date methodology link — please open a [GitHub issue][issues]
with the URL of the page, the specific number or claim, and (if possible) a
primary source supporting the correction.

Primary sources we treat as authoritative:

- City Council [Docket UD-24-01][docket] and orders / resolutions issued from it
- Sewerage & Water Board press releases and Council testimony
- Entergy New Orleans rate filings and outage reports
- Federal Reserve [Henry Hub natural gas spot price][fred]
- Bureau of Labor Statistics, US Census, DOE/LBNL methodology papers
  (cited in `src/components/WaterMethodology.jsx` and `ElectricityMethodology.jsx`)

[issues]: https://github.com/wordle-death/nola-utility-watch/issues
[docket]: https://council.nola.gov/committees/utility-cable-telecommunications-and-technology/dockets/resolution-and-order-establishing-a-period-of-inte/
[fred]: https://fred.stlouisfed.org/series/DHHNGSP

## Submitting a bill of your own

The easiest contribution is uploading one of your own utility bills via the
"Contribute Your Bill" section on the site. The bill is processed in the
browser; only validated numeric fields (ZIP, usage, rate, total) are stored.
See [Privacy](./public/privacy.html) for full detail on what's collected.

## Code contributions

```sh
# Fork + clone, then:
npm install
vercel link            # link to your own Vercel project for local dev
vercel env pull .env.local
vercel dev
```

A few project conventions:

- Don't add features, refactor, or introduce abstractions beyond what the task
  requires. A bug fix doesn't need surrounding cleanup.
- Don't add error handling, fallbacks, or validation for scenarios that can't
  happen. Trust internal code; only validate at system boundaries.
- Default to writing no comments. Only add one when the *why* is non-obvious.
- Secrets live only in Vercel environment variables. Never commit `.env*`,
  Supabase keys, or any cookie / session value to the repo.
- For UI changes, run `vercel dev`, open the page in a browser, and verify the
  feature works before opening the PR.

## Filing a PR

Small, focused PRs are easier to review and ship. If your change is large
(new feature, methodology rewrite), please open an issue first to align on
the approach.

## Code of conduct

Be kind. This is a public-interest project; assume good faith from
contributors and from utility-company employees who may engage with the site.
We're all stuck with the same gas main.
