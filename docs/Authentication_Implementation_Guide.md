# El Toro – Authentication Implementation Guide

## Overview

El Toro is a restaurant management PWA (single `index.html`, built from `src/` files via `build.js`). It is hosted on GitHub Pages and uses a **Google Cloud Run worker** (`el-toro-worker`) as a backend proxy to store all app state in **Google Cloud Storage** as a single JSON blob (`eltoro.json` in the `alejandro-organizer` bucket).

We are adding **authentication and role-based access control** using **Google Cloud Identity Platform** (which is Firebase Auth running natively inside GCP — no separate Firebase account needed).

---

## What Has Already Been Done

### Google Cloud Infrastructure
- Cloud Run worker (`el-toro-worker`) is deployed and running at:
  `https://el-toro-worker-394750046102.europe-west3.run.app`
- Worker uses `lm-worker@gentilecoder.iam.gserviceaccount.com` as its service account
- GCS bucket `alejandro-organizer` stores app data as `eltoro.json`
- GCP project: `gentilecoder`, region: `europe-west3`

### Identity Platform
- **Identity Platform has been enabled** in GCP console
- **Email/Password provider** has been enabled
- **One admin user has been created** in Identity Platform
- **The admin UID has been noted** and the Cloud Shell script has been run to assign `role: "admin"` as a custom claim on that user's JWT token

### App (src/ files)
- The app is fully functional with 5 tabs: Reservas, Mesas, Artículos, Historial, Plan
- Data syncs to/from Cloud Run worker via GET/POST
- No authentication exists yet — the app is fully open

---

## What Still Needs To Be Done

### 1. Update the Cloud Run Worker (`main.py`)

Add JWT verification to every request. The worker must:

- Import and initialize Firebase Admin SDK (it auto-authenticates via the service account — no credentials file needed when running inside Cloud Run)
- Verify the `Authorization: Bearer <token>` header on every request
- Reject with `401` if token is missing or invalid
- Extract the `role` custom claim from the decoded token
- Reject with `403` if the role doesn't have permission for the requested operation

Add these new endpoints (in addition to the existing GET/POST for data):

| Method | Path | Role required | Description |
|--------|------|--------------|-------------|
| GET | `/users` | admin | List all users with their role custom claim |
| POST | `/users` | admin | Create a new user (email, password, role) |
| PUT | `/users` | admin | Update a user's role by UID |
| DELETE | `/users` | admin | Delete a user by UID |

Update `requirements.txt` to add:
```
firebase-admin==6.*
```

Full updated `main.py` structure:
```python
import json
import firebase_admin
from firebase_admin import auth as firebase_auth
from google.cloud import storage
import functions_framework

BUCKET_NAME = "alejandro-organizer"
FILE_NAME = "eltoro.json"

if not firebase_admin._apps:
    firebase_admin.initialize_app()

def get_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }

def verify_token(request):
    header = request.headers.get("Authorization", "")
    token = header.replace("Bearer ", "").strip()
    if not token:
        return None, None
    try:
        decoded = firebase_auth.verify_id_token(token)
        role = decoded.get("role", "")
        return decoded, role
    except Exception:
        return None, None

@functions_framework.http
def organizer(request):
    headers = get_headers()
    if request.method == "OPTIONS":
        return ("", 204, headers)

    decoded, role = verify_token(request)
    if not decoded:
        return ("Unauthorized", 401, headers)

    path = request.path.rstrip("/")

    # --- User management endpoints (admin only) ---
    if path == "/users":
        if role != "admin":
            return ("Forbidden", 403, headers)

        if request.method == "GET":
            page = firebase_auth.list_users()
            users = []
            for u in page.users:
                users.append({
                    "uid": u.uid,
                    "email": u.email,
                    "role": (u.custom_claims or {}).get("role", "")
                })
            return (json.dumps(users), 200, {**headers, "Content-Type": "application/json"})

        if request.method == "POST":
            body = request.get_json()
            user = firebase_auth.create_user(email=body["email"], password=body["password"])
            firebase_auth.set_custom_user_claims(user.uid, {"role": body.get("role", "staff")})
            return (json.dumps({"uid": user.uid}), 200, {**headers, "Content-Type": "application/json"})

        if request.method == "PUT":
            body = request.get_json()
            firebase_auth.set_custom_user_claims(body["uid"], {"role": body["role"]})
            return (json.dumps({"ok": True}), 200, {**headers, "Content-Type": "application/json"})

        if request.method == "DELETE":
            body = request.get_json()
            firebase_auth.delete_user(body["uid"])
            return (json.dumps({"ok": True}), 200, {**headers, "Content-Type": "application/json"})

    # --- Data endpoints ---
    client = storage.Client()
    bucket = client.bucket(BUCKET_NAME)
    blob = bucket.blob(FILE_NAME)

    if request.method == "GET":
        if not blob.exists():
            return ("{}", 200, {**headers, "Content-Type": "application/json"})
        return (blob.download_as_text(), 200, {**headers, "Content-Type": "application/json"})

    if request.method == "POST":
        data = request.get_data(as_text=True)
        blob.upload_from_string(data, content_type="application/json")
        return (json.dumps({"ok": True}), 200, {**headers, "Content-Type": "application/json"})

    return ("Method not allowed", 405, headers)
```

---

### 2. Add Login Screen to the App

Before `init()` runs, show a full-screen login form. Nothing else is visible until the user is authenticated.

**SDK:** Load Firebase Auth JS SDK via CDN (ESM):
```html
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
  import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
</script>
```

**Firebase config** (get from GCP → Identity Platform → Application setup details):
```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "gentilecoder.firebaseapp.com",
  projectId: "gentilecoder"
};
```

**Auth flow:**
1. On page load, show login screen, hide app
2. User enters email + password → call `signInWithEmailAndPassword`
3. On success → call `user.getIdToken()` → store token in memory as `window.authToken`
4. Decode role: `JSON.parse(atob(token.split('.')[1])).role` → store as `window.userRole`
5. Hide login screen, show app, call `init()`
6. Refresh token every 55 minutes: `setInterval(() => user.getIdToken(true).then(t => window.authToken = t), 55 * 60 * 1000)`
7. Use `onAuthStateChanged` to handle page refresh (user stays logged in)

**Logout:** Add a logout button to the header (visible to all users) that calls `signOut(auth)` and reloads the page.

---

### 3. Attach Token to All Worker Requests

Every `fetch` call to the worker must include:
```javascript
headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer " + window.authToken
}
```

This applies to `loadFromCloud`, `saveToCloud`, and all user management API calls.

---

### 4. Role-Based UI Visibility

After login, show/hide tabs and features based on `window.userRole`:

| Feature | admin | staff | springer |
|---------|-------|-------|----------|
| Reservas tab | ✅ | ✅ | ❌ |
| Mesas tab | ✅ | ✅ | ✅ |
| Artículos tab | ✅ | ❌ | ❌ |
| Historial tab | ✅ | ✅ | ❌ |
| Plan tab | ✅ | ❌ | ❌ |
| Usuarios tab | ✅ | ❌ | ❌ |
| Cobrar button | ✅ | ✅ | ❌ |
| ⚙ Configurar mesas | ✅ | ❌ | ❌ |
| ⚙ URL button | ✅ | ❌ | ❌ |

---

### 5. Add Usuarios Tab (admin only)

A new tab visible only to admins for managing users without touching GCP console.

**Features:**
- List all users (email + role)
- Add new user (email, password, role selector: admin / staff / springer)
- Change role of existing user (dropdown)
- Delete user (with confirmation)

**API calls** (all go to the worker with admin JWT):
- `GET /users` → list
- `POST /users` → create
- `PUT /users` → update role
- `DELETE /users` → delete

---

## Role Definitions

| Role | Description |
|------|-------------|
| `admin` | Owner/manager — full access including user management, articles, staff plan |
| `staff` | Regular employee — can take orders, manage reservations, see history |
| `springer` | Part-time/temp — can only open tables and add items to orders, cannot charge |

---

## Important Notes

- The Firebase Admin SDK initializes automatically inside Cloud Run using the `lm-worker` service account — **no credentials file needed**
- The `lm-worker` service account must have the **Service Account Token Creator** role in IAM for token verification to work (check IAM & Admin → IAM in GCP console)
- JWT tokens expire after 1 hour — the app must refresh them silently using `getIdToken(true)`
- Custom claims (`role`) are embedded in the JWT and available client-side without an extra API call
- The first admin user was created manually and assigned via Cloud Shell — all subsequent users are managed from inside the app