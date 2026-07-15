# HEADCHANGE — Project Dashboard

An editable, web-based recreation of the Studio Linear project dashboard PDF.
Every field, status, timeline bar, and weekly table row can be edited in the
browser — no code changes required to update it week to week.

## What's inside

- `server.js` — a tiny Express server. Serves the dashboard and two API
  routes (`GET/POST /api/data`, `POST /api/reset`) that read/write a JSON
  file on disk.
- `public/` — the dashboard itself (plain HTML/CSS/JS, no build step).
- `data/seed.json` — the original content, transcribed from your PDF. This
  is the "factory reset" copy.
- `data/dashboard.json` — created automatically the first time the server
  runs; this is the file that actually gets edited and saved.

## Run it locally

```bash
npm install
npm start
```

Then open http://localhost:3000

## Using the dashboard

- **Edit dashboard** — turns every card, the timeline, and all nine weekly
  tables into editable fields. You can add/remove phases, timeline bars,
  weekly rows, and whole package sections.
- **Save changes** — writes your edits to `data/dashboard.json` and exits
  edit mode.
- **Reset to original** — discards edits and restores the content exactly
  as it was transcribed from your PDF.
- The "AT A GLANCE" counts (completed / in progress / waiting / upcoming)
  are calculated automatically from whatever statuses you set on the
  Phases list, so they can never drift out of sync.
- Timeline bars are edited by typing a start week and end week number
  (1–30) and choosing a status — the bar color and position update
  automatically.
- **Current week** — set it once via the "Current week" field above the
  timeline (in edit mode). A dashed red line and light stripe run down
  through the whole gantt chart at that week, and the matching row is
  highlighted in every package's weekly table below — just like the
  dashed "CURRENT WEEK" marker on the original PDF.

## Sharing a view-only link with your client

Click **Copy client (view-only) link** in the toolbar. It copies
`https://yourapp.up.railway.app/client` — the same dashboard, but with
no toolbar and no way to enter edit mode. Anyone with that link can
look at the live status but can't change anything.

## Deploying to Railway

1. Push this folder to a GitHub repo (or use the Railway CLI to deploy
   the folder directly).
2. In Railway: **New Project → Deploy from GitHub repo**, and pick the
   repo. Railway auto-detects Node.js via Nixpacks and will run
   `npm install` then `npm start` (this is also pinned in
   `railway.json`).
3. No environment variables are required — Railway sets `PORT`
   automatically and the server reads it.
4. Once deployed, open the generated `*.up.railway.app` URL.

### CLI alternative

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### A note on persistence

Saved edits are written to a file on the container's disk
(`data/dashboard.json`). That file survives restarts, but **a fresh
deploy (e.g. pushing new code) will reset it back to `seed.json`**,
because Railway rebuilds the filesystem from your repo on every deploy.

If you want edits to survive redeploys too, add a **Railway Volume**:

1. In your Railway service, go to **Settings → Volumes → New Volume**.
2. Mount it at `/app/data`.
3. Redeploy. From then on, `data/dashboard.json` lives on the volume and
   persists across deploys.

## Updating the source content

If you ever want to change the "original" baseline (what **Reset to
original** restores), edit `data/seed.json` directly and redeploy.
