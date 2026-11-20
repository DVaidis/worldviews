# WorldViews Assessment Project — website

Static website generated from the project hub (Google Doc). Edit the Google Doc; the site updates itself every night (or on demand).

## How it works

1. A GitHub Action downloads the Google Doc as Markdown (`export?format=md`) into `content/hub.md`.
2. `index.html` + `assets/app.js` read `content/hub.md` and turn each section into a page block (timeline, news, task forces, team map, agreement…).
3. The Action deploys the site to GitHub Pages.

No build step, no dependency to install.

## Setup (≈ 15 min)

1. **Google Doc**: Share → General access → *Anyone with the link* → *Viewer*.
2. **GitHub**: create a repository (e.g. `worldviews`), upload all files of this folder (keep `.github/`).
3. **Pages**: Settings → Pages → Source: **GitHub Actions**.
4. **Run**: Actions tab → *Sync Google Doc and deploy site* → *Run workflow*.
5. The site is at `https://<account>.github.io/<repo>/`. A custom domain can be set in Settings → Pages.

Manual update at any time: Actions → *Run workflow*.

## Writing conventions in the Google Doc

The site reads the Doc's **heading styles** (Heading 1 / Heading 2), not the visual formatting.

| In the Google Doc | On the site |
|---|---|
| First Heading 1 + second Heading 1 | Title and subtitle of the banner |
| One-column tables (question in header, answer below) at the top | "Right now" cards (an answer of `-` is hidden) |
| `Last update …` | Date under the cards |
| Heading 1 starting with **Snapshot**, **Who leads**, **Goal** | About / Contact / Goal blocks |
| Heading 1 starting with **Timeline (current YYYY.MM)** + bullets `Month–Month: phase` | Gantt chart with done / ongoing / upcoming status and a "today" line. "coordinator required" → red label |
| Heading 1 **ARCHIVES** … up to **INFORMATION LOG** | Folded "Archives" block at the bottom |
| Heading 1 **INFORMATION LOG**, then Heading 2 `YYYY.MM.DD - Title` | News list (latest open) |
| Heading 1 containing **Workflow** + table with a *State* column | Task table with filters (Done, WIP, Blocked, To do, Wait) |
| Heading 1 **Task forces** + Heading 2 per task force, lines `**Goal**: …` | Task-force cards |
| Heading 1 containing **Task Forces Members** + table (Family Name, First Name, Country, TaskForce, Role) | Map, counters, per-country bars, member lists |
| Heading 1 containing **Agreement** + Heading 2 sections; "At a glance" bullets `**Title**. text` | Agreement with summary cards and folding sections |
| Any other Heading 1 | Generic block |

Settings in `site.config.json`: buttons in the banner, extra counters, sections to hide (`hideSections`).

New country on the map: add its coordinates to the `C` list at the top of `assets/app.js` if missing (≈ 80 countries are already listed).

## Preview locally

```
python3 -m http.server 8000
```
then open http://localhost:8000

## Credits

Website coding assisted with Claude (Anthropic). Code under the MIT License (see `LICENSE`). Bundled libraries: marked (MIT), d3 (ISC). World outline: world-atlas / Natural Earth (public domain).
