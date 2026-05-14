# Deploying Emporio Zeva to Render (free, full-stack)

This guide walks you through deploying the full app — React frontend + FastAPI backend + MongoDB — on **Render's free tier** for client demos.

Total time: **~20 minutes**. Total cost: **$0**.

> Heads-up on Render's free tier: the backend service **sleeps after 15 minutes of inactivity** and takes ~30 seconds to wake on the first request. Perfect for a client preview, not for production traffic.

---

## 1. Spin up free MongoDB (5 min)

Render no longer ships a managed MongoDB, so use MongoDB's own free cluster.

1. Go to https://www.mongodb.com/atlas and sign up (Google login works).
2. Create a **free M0 cluster** — pick AWS / Oregon (us-west-2) to be close to Render.
3. Under **Database Access** → create a database user (note the username + password).
4. Under **Network Access** → click **Add IP Address** → **Allow Access From Anywhere** (`0.0.0.0/0`). *(Render's IPs rotate; this is the simplest demo setup.)*
5. Go to **Database** → click **Connect** on your cluster → **Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<user>` and `<password>` with the credentials from step 3. **Save this string** — you'll paste it into Render.

---

## 2. Push the codebase to GitHub

In the Emergent chat input, use the **"Save to GitHub"** feature to push this repo to your GitHub account. Pick a repo name like `emporio-zeva`.

---

## 3. Deploy with Render's Blueprint (one click)

1. Go to https://render.com and sign up (GitHub login).
2. From the dashboard, click **New +** → **Blueprint**.
3. Connect your GitHub account and pick the `emporio-zeva` repo.
4. Render will auto-detect `render.yaml` at the repo root and show two services:
   - `emporio-zeva-api` (Python web service)
   - `emporio-zeva-site` (Static site)
5. Click **Apply**. The first build will fail or pause — that's expected; we haven't set the env vars yet.

---

## 4. Set environment variables

### Backend (`emporio-zeva-api` → Environment tab)

| Key | Value |
|---|---|
| `MONGO_URL` | Your MongoDB Atlas connection string from step 1 |
| `CORS_ORIGINS` | Leave empty for now — we'll fill it after the frontend URL is known. Set to `*` if you want to test quickly. |

(`DB_NAME` and `PYTHON_VERSION` are already set by the blueprint.)

Click **Save changes** — the backend will redeploy. Once it's live, copy the URL — it looks like `https://emporio-zeva-api.onrender.com`.

### Frontend (`emporio-zeva-site` → Environment tab)

| Key | Value |
|---|---|
| `REACT_APP_BACKEND_URL` | The backend URL from above — e.g. `https://emporio-zeva-api.onrender.com` |

Click **Save changes** — the frontend will rebuild with the correct backend URL baked in.

### Backend (revisit, lock down CORS)

Once the frontend is live (e.g. `https://emporio-zeva-site.onrender.com`), go back to the backend's Environment tab and set:

| Key | Value |
|---|---|
| `CORS_ORIGINS` | `https://emporio-zeva-site.onrender.com` |

The backend will redeploy one more time.

---

## 5. Verify

Open the frontend URL. You should see:

- The editorial homepage with the cocoa-bean hero and the new logo
- `/collection` lists 3 products (proves the API + MongoDB connection works)
- The Inquiry form on `/contact` submits successfully
- The Newsletter form in the footer accepts an email

If the first request hangs for ~30 seconds, that's the backend waking up from sleep. Subsequent requests are fast.

---

## 6. Send it to the client

Give them the frontend URL: `https://emporio-zeva-site.onrender.com`.

Tell them: *"First load may take 30 seconds — the demo server sleeps when idle."*

---

## Troubleshooting

- **Frontend builds but pages 404 on refresh** → your `_redirects` file or `routes:` rewrite in `render.yaml` isn't being applied. Both are included in this repo; make sure they got pushed.
- **API returns CORS errors** → set `CORS_ORIGINS` to your exact frontend URL (no trailing slash).
- **API returns 500 with `MONGO_URL` error** → the env var isn't set or the password in the connection string contains an unescaped special character. URL-encode it.
- **"Module not found: motor"** → your backend `requirements.txt` didn't install. Check the Render build log.

---

## Upgrading later

When you outgrow the free tier (no more cold starts, custom domain, more horsepower), the same `render.yaml` works on Render's Starter plan (~$7/month per service). Or just click **Deploy** on Emergent for one-click full-stack hosting.
