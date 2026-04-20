# El Toro

A restaurant management PWA built as a single HTML file. Hosted on GitHub Pages and installable on iPhone via Safari → Share → Add to Home Screen.

---

## How It Works

The app is a **single `index.html` file** — no frameworks, no build dependencies, pure vanilla HTML/CSS/JS. It talks to a Google Cloud Run proxy for data storage.

### Source → Build → Deploy

```
src/              Edit these files
  shell.html      HTML structure and placeholders
  style.css       All CSS
  js/
    core.js       Constants, state, sync, utils, tabs, init
    reservas.js   Reservations tab
    mesas.js      Tables tab, order view, table settings
    articulos.js  Articles tab, categories
    historial.js  History tab (last 24h closed tables)
    plan.js       Staff planning tab

build.js          Assembles src/ → index.html
serve.js          Local dev server (rebuilds on every browser reload)
index.html        ← Generated output. Deploy this. Never edit directly.
```

**Never edit `index.html` directly.** It gets overwritten on every build. All changes go into `src/`.

---

## Development Workflow

### Start the dev server

```bash
npm run dev
```

Opens a local server at `http://localhost:8080`. Every browser refresh automatically rebuilds `index.html` from the `src/` files so you always see the latest changes.

### Build without serving

```bash
npm run build
```

Writes the assembled `index.html` to the project root.

### Deploy to GitHub Pages

After making changes:

```bash
npm run build
git add .
git commit -m "your message"
git push
```

GitHub Pages picks up the new `index.html` within ~1 minute.

---

## Configuration (per device, stored in localStorage)

One value must be entered once per device via the header button:

| Button | What it stores | Value |
|--------|---------------|-------|
| ⚙ URL | Google Cloud Run worker URL | See `.env` → `WORKER_URL` |

---

## Backend & Storage

A Cloud Run worker proxies all data to/from a JSON blob in Google Cloud Storage:

- **GET** → returns the full app state as JSON
- **POST** → writes the entire app state
- **CORS:** `*`

### Data shape

```json
{
  "sections":    [{ "id": 1, "name": "Interior", "tables": [{ "id": 101, "label": "1" }] }],
  "reservations":[{ "id": 1, "name": "García", "guests": 4, "date": "2026-04-20", "from": "13:30", "to": "15:30", "table": 101, "notes": "", "status": "confirmed" }],
  "categories":  ["Comida", "Bebida", "Cerveza"],
  "articulos":   [{ "id": 1, "name": "Patatas bravas", "cat": "Comida", "price": 4.50 }],
  "openTables":  { "101": { "items": [{ "id": 1, "name": "Patatas bravas", "price": 4.50, "qty": 2 }], "openedAt": 1713600000000 } },
  "planData":    { "2026-04-22|Fijo": "María" }
}
```

---

## Tabs

| Tab | File | Description |
|-----|------|-------------|
| Reservas | `reservas.js` | Table reservations by date, section filter, detail panel |
| Mesas | `mesas.js` | Live table status, order management, payment |
| Artículos | `articulos.js` | Menu items and categories |
| Historial | `historial.js` | Closed tables in the last 24 hours |
| Plan | `plan.js` | Weekly staff schedule (Tue–Sat) |

---

## Known Limitations

- History is not persisted — cleared on page refresh
- No offline support — requires internet for Cloud Run sync
- The entire data object is re-saved on every change (no partial updates)
