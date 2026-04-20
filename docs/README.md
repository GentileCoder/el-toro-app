# LM Organizer

A personal organizer PWA (Progressive Web App) built as a single HTML file. Hosted on GitHub Pages and installable on iPhone via Safari → Share → Add to Home Screen.

---

## How It Works

The app is a **single `index.html` file** — no frameworks, no build dependencies, pure vanilla HTML/CSS/JS. It talks to two external services: a Google Cloud Run proxy for data storage, and the Gemini API for AI assistance.

### Source → Build → Deploy

```
src/              Edit these files
  shell.html      HTML structure and placeholders
  style.css       All CSS
  js/
    core.js       Constants, state, data, sync, nav, tasks/notes/goals/shopping
    calendar.js   Calendar (month / week / day views)
    finance.js    Finance (overview, month, expenses, recurring, budget)
    review.js     Review / ideas scratchpad
    chat.js       AI chat, action parser, Gemini API call

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

GitHub Pages picks up the new `index.html` within ~1 minute. Live URL:
`https://{username}.github.io/{repo-name}`

---

## Configuration (per device, stored in localStorage)

Three values must be entered once per device via the header buttons:

| Button | What it stores | Value |
|--------|---------------|-------|
| ⚙ URL | Google Cloud Run worker URL | See `.env` → `GOOGLE_CLOUD_URL` |
| 🔒 Token | Bearer auth token for Cloud Run | Must match `TOKEN_SECRET` set in Cloud Run env vars |
| 🔑 Key | Gemini API key | See `.env` → `GEMINI_API_KEY` |

These are stored in `localStorage` on the device, never in the app data or committed to git.

---

## Backend & Storage

### Data storage — Google Cloud Storage

All app data is one JSON file (`organizer.json`) in a GCS bucket:

- **Bucket:** `alejandro-live-manager-app`
- **Project:** `gentilecoder`
- **Region:** `europe-west3` (Frankfurt)
- **Service account:** `lm-worker@gentilecoder.iam.gserviceaccount.com`

### Cloud Run proxy

A Python 3.11 Cloud Run function (`alejandro-lm-worker`) acts as a proxy between the app and GCS:

- **GET** → reads `organizer.json` and returns it as JSON
- **POST** → writes the entire app state to `organizer.json`
- **CORS:** `*` (accessible from any origin)
- **URL:** see `.env` → `GOOGLE_CLOUD_URL`

### Data shape

```json
{
  "tasks":    [{ "id": 1, "text": "...", "done": false }],
  "notes":    [{ "id": 1, "text": "...", "done": false }],
  "goals":    [{ "id": 1, "text": "...", "progress": 60 }],
  "shopping": [{ "id": 1, "text": "...", "done": false }],
  "events":   [{ "id": 1, "date": "2026-04-10", "time": "10:00", "title": "..." }],
  "finance": {
    "salary": 0,
    "transactions": [{
      "id": "tx123",
      "type": "expense|income",
      "amount": 50.00,
      "description": "Groceries",
      "category": "Food",
      "date": "2026-04-10",
      "recurring": "none|monthly|bimonthly|quarterly|biannual"
    }],
    "budgets": { "Food": 300, "Housing": 800 }
  },
  "review": [{ "id": 1, "text": "...", "date": "2026-04-10" }]
}
```

---

## AI Assistant

- **Model:** `gemini-3-flash-preview` via the Gemini API (free tier)
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`
- The AI receives the full app state as context on every message (freshly injected as the first turn)
- Full conversation history is maintained in memory for multi-turn dialogue (cleared on page refresh or "Clear" button)

### AI actions

The AI can modify app data by appending special tokens to its response:

| Token | Effect |
|-------|--------|
| `ACTION_ADD:{section}:{text}` | Adds item to tasks, notes, shopping, or goals |
| `ACTION_DONE:{section}:{fragment}` | Marks matching item as done |
| `ACTION_EVENT:{YYYY-MM-DD}:{HH:MM}:{title}` | Adds a calendar event |
| `ACTION_TX:{type}:{amount}:{description}:{category}:{date}:{recurring}` | Adds a finance transaction |
| `ACTION_SALARY:{amount}` | Sets the monthly salary |
| `ACTION_DEL_TX:{fragment}` | Deletes a matching transaction |

---

## Sections

| Nav | Section | Description |
|-----|---------|-------------|
| ▦ Calendar | `calendar.js` | Month / week / day views, add and delete events |
| ✓ Tasks | `core.js` | To-do list with done toggle and delete |
| ≡ Notes | `core.js` | Freeform notes with done toggle and delete |
| ◎ Goals | `core.js` | Goals with 0–100% progress slider |
| ⊕ Shopping | `core.js` | Shopping list with done toggle and delete |
| € Finance | `finance.js` | Overview, Month, Expenses, Recurring, Budget sub-tabs |
| ★ Review | `review.js` | Ideas / feature requests scratchpad with clipboard export |

### Finance categories
Housing · Food · Transport · Health · Entertainment · Shopping · Utilities · Other

### Finance recurring options
One-time · Monthly · Every 2 months · Every 3 months · Every 6 months

---

## Known Limitations

- Chat history is not persisted — cleared on page refresh
- No offline support — requires internet for GCS sync and Gemini AI
- The entire data object is re-saved on every change (no partial updates)
- Token auth is per-device only — anyone who obtains the bearer token can access data

http://localhost:8080 