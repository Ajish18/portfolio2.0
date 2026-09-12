# portfolio2.0

Personal portfolio for **Ajish I** — Frappe Developer & ERP Implementation Engineer.

**Live:** https://ajish18.github.io/portfolio2.0/

An iOS/macOS-inspired single page: frosted glass surfaces, squircle geometry,
spring motion, and a working replica of the kind of ERPNext operations console
I build — number cards, Script-Report-style charts, and an animated approval
workflow.

## What's in it

| Section | What it shows |
|---|---|
| Hero | Portrait, roles, résumé download, social links |
| Impact | Count-up KPIs and a bar chart of reduction delivered per workflow (real figures) |
| Dashboard | ERPNext ops console — line, stacked-bar and donut charts, a 3-tier approval-flow animation, and a typed server-script snippet (*sample data, clearly labelled*) |
| About / Skills | Professional summary and the six skill groups from the CV |
| Experience | Quickfix (Service Management ERP) and KYO Restaurant Group, Cambodia |
| Projects | ETEMS, Event Scheduler, Ruban Mobiles |
| Education | B.Tech IT, CGPA 8.1 + four certifications |
| Contact | Email, phone, LinkedIn, GitHub, CV download |

## Stack

Plain HTML, CSS and JavaScript. No build step, no framework, no trackers.
Charts are hand-rolled SVG — colours come from CSS custom properties, so the
light/dark toggle repaints every mark.

```
index.html
assets/
  css/style.css     design tokens, glass surfaces, layout, responsive rules
  js/charts.js      SVG chart engine + shared tooltip
  js/main.js        theme, nav, scroll reveals, counters, tabs, flow animation
  img/              portrait + favicon
  docs/             résumé PDF
```

## Accessibility & performance

- Light and dark palettes are both deliberately chosen — the chart colours pass
  colourblind-separation, lightness-band and contrast checks in each mode.
- Every chart has an `aria-label` description; the impact chart also ships a
  table view.
- `prefers-reduced-motion` disables all animation.
- Keyboard-navigable tabs, a skip link, and visible focus rings.
- Single page, two small scripts, one image — no external JS dependencies.

## Running locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploying

GitHub Pages serves `main` from the repository root. `.nojekyll` keeps Pages
from reprocessing the files.

## Contact

- **Email** — ajishiyappan1@gmail.com
- **Phone** — +91 81486 70101
- **LinkedIn** — [linkedin.com/in/ajish-i](https://www.linkedin.com/in/ajish-i)
- **GitHub** — [github.com/Ajish18](https://github.com/Ajish18)

## Licence

Code is MIT (see [LICENSE](LICENSE)). The photograph and résumé are personal
material and are not covered by it.
