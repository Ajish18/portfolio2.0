# portfolio2.0

Personal portfolio for **Ajish I** — Frappe Developer & ERP Implementation Engineer.

**Live:** https://ajish18.github.io/portfolio2.0/

A single page in an Apple-adjacent visual language: hairline structure, one accent
colour, generous whitespace, and motion that settles instead of bouncing. The
centrepiece is a **live GitHub dashboard** that refetches on every page load.

## What's in it

| Section | What it shows |
|---|---|
| Hero | Portrait, roles, résumé download, social links |
| Impact | Count-up KPIs and a bar chart of reduction delivered per workflow (figures from the CV) |
| Featured | **Kailon** — multi-tenant gym management platform, [live](https://gym-kailon.vercel.app) ([source](https://github.com/Ajish18/GYM-Management-Kailon)) · **ChadSwap** — Solana token swap, [live](https://chadswap-eta.vercel.app) ([source](https://github.com/Ajish18/Chadswap)) |
| Live from GitHub | Contribution calendar, streak, repo count, last push, language breakdown, activity feed and recently-pushed repos — all fetched live |
| Inside the build | The ETEMS 3-tier approval flow, animated, plus a typed Job Card server-script snippet |
| About / Skills | Professional summary and the six skill groups |
| Experience | Quickfix (Service Management ERP) and KYO Restaurant Group, Cambodia |
| Projects | A scroll-snap rail — Kailon (live), ChadSwap (live), ETEMS, Quickfix, Event Scheduler, Ruban Mobiles |
| Education | B.Tech IT, CGPA 8.1 + four certifications |
| Contact | Email, phone, LinkedIn, GitHub |

## Live data

Three public endpoints, no token and no build step:

| Endpoint | Feeds |
|---|---|
| `api.github.com/users/Ajish18` | repo count, account age |
| `api.github.com/users/Ajish18/repos` | languages, recently-pushed list, last push time |
| `api.github.com/users/Ajish18/events/public` | activity feed |
| `github-contributions-api.jogruber.de` | contribution calendar and streak |

Each panel fails independently — if one call is rate-limited or down, that panel
shows a fallback and links to GitHub while the rest still render. The status pill
in the console title bar reports `live`, `partial` or `offline`.

## Stack

Plain HTML, CSS and JavaScript. No framework, no build step, no external JS
dependencies. Charts are hand-rolled SVG whose colours come from CSS custom
properties, so the light/dark toggle repaints every mark.

```
index.html            page + inline SVG icon sprite
assets/
  css/style.css       design tokens, layout, responsive rules
  js/charts.js        SVG chart engine + shared tooltip
  js/github.js        live GitHub data layer
  js/main.js          theme, nav, scroll reveals, counters, tabs, flow animation
  img/                portrait, square avatar, favicon
  docs/               résumé PDF
```

## Motion

Editorial mask reveals on headings, a scroll-snap project rail with keyboard and
button controls, scroll parallax on the hero portrait, and a header that retracts
on the way down and returns on the way up. Everything eases on an iOS
deceleration curve and is fully disabled under `prefers-reduced-motion`.

## Accessibility & performance

- Light and dark palettes are both deliberately chosen; chart colours pass
  colourblind-separation, lightness-band and contrast checks in each mode.
- The contribution heatmap uses a single-hue sequential ramp, correct for each mode.
- Charts carry `aria-label` descriptions; the impact chart also ships a table view.
- `prefers-reduced-motion` disables all animation.
- Keyboard-navigable tabs, a skip link, and visible focus rings.

## Running locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploying

GitHub Pages serves `main` from the repository root. `.nojekyll` keeps Pages from
reprocessing the files.

## Contact

- **Email** — ajishiyappan1@gmail.com
- **Phone** — +91 81486 70101
- **LinkedIn** — [linkedin.com/in/ajish-i](https://www.linkedin.com/in/ajish-i)
- **GitHub** — [github.com/Ajish18](https://github.com/Ajish18)

## Licence

Code is MIT (see [LICENSE](LICENSE)). The photograph and résumé are personal
material and are not covered by it.
