# Bethel Park Retirement Home

Website for our ESPN fantasy football league: weekly matchups, standings, playoff odds, team pages, head-to-head records, trades and league history since 2021.

- `index.html`, `app.js` — the site
- `data.js` — past seasons (2021–2025)
- `cur.json` — this season's scores, standings, rosters and moves, refreshed from ESPN every Tuesday morning

## Weekly updates

`.github/workflows/refresh.yml` runs every Tuesday at 7:32 AM Eastern (and on demand from the Actions tab → "Refresh league data and publish site" → Run workflow). It runs `scripts/refresh.mjs`, which pulls this season's data from ESPN into `cur.json`, commits it, and publishes the site.

Because the league is private, it needs two repository secrets (Settings → Secrets and variables → Actions): `ESPN_S2` and `ESPN_SWID`, the ESPN login cookies. If a run fails with a 401, the cookies have expired — copy fresh ones from your browser and update the secrets.
