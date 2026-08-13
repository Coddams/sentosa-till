# Sentosa Business Center — Till App

Full-stack cashier till for Sentosa Business Center. Records income and expenses instantly, shows today's log live, and gives you analytics across any time period.

**Stack:** React + Vite (frontend) · Express + Node.js (backend) · MongoDB Atlas (database)  
**Hosting:** Vercel (frontend, free) · Railway (backend, free) · MongoDB Atlas (database, free)

---

## Project structure

```
sentosa/
├── client/          ← React frontend (Vite)
│   └── src/
│       ├── pages/   ← Till, Analytics, Log
│       ├── utils/   ← API calls, services config
│       └── hooks/   ← useToast
├── server/          ← Express backend
│   ├── models/      ← Transaction schema
│   └── routes/      ← /transactions, /analytics
└── package.json     ← Root (runs both together)
```

---

## Part 1 — Local setup (run on your PC)

### Prerequisites
- Node.js v18+ — download from https://nodejs.org
- Git — download from https://git-scm.com

### Step 1 — Install dependencies

Open a terminal in the `sentosa` folder and run:

```bash
npm run install:all
```

This installs packages for the root, server, and client in one go.

### Step 2 — Set up MongoDB Atlas (free database)

1. Go to https://cloud.mongodb.com and create a free account
2. Click **"Build a Database"** → choose **M0 Free** tier → pick any region
3. Create a database user:
   - Username: `sentosa`
   - Password: choose something strong, save it
4. Under **Network Access** → click **"Add IP Address"** → **"Allow Access from Anywhere"** (0.0.0.0/0)
5. Go back to your cluster → click **Connect** → **"Connect your application"**
6. Copy the connection string. It looks like:
   ```
   mongodb+srv://sentosa:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. Replace `<password>` with your actual password and add `/sentosa` before the `?`:
   ```
   mongodb+srv://sentosa:yourpassword@cluster0.xxxxx.mongodb.net/sentosa?retryWrites=true&w=majority
   ```

### Step 3 — Configure the server

In the `server/` folder, copy the example env file:

```bash
cd server
cp .env.example .env
```

Open `server/.env` and fill in your values:

```
PORT=5000
MONGODB_URI=mongodb+srv://sentosa:yourpassword@cluster0.xxxxx.mongodb.net/sentosa?retryWrites=true&w=majority
CLIENT_URL=http://localhost:5173
```

### Step 4 — Run locally

From the root `sentosa/` folder:

```bash
npm run dev
```

This starts:
- Backend at http://localhost:5000
- Frontend at http://localhost:5173

Open http://localhost:5173 in your browser. The till is live.

---

## Part 2 — Deploy (access from any browser, any PC)

### Step A — Push to GitHub

1. Go to https://github.com and create a new repository called `sentosa-till` (private is fine)
2. In your terminal:

```bash
cd sentosa
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/sentosa-till.git
git push -u origin main
```

### Step B — Deploy backend to Railway

1. Go to https://railway.app and sign up with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `sentosa-till` repo
4. Railway will detect the project. Set the **root directory** to `server`
5. Go to **Variables** tab and add:
   ```
   PORT=5000
   MONGODB_URI=<your MongoDB URI from Step 2>
   CLIENT_URL=https://your-vercel-app.vercel.app
   ```
   (You'll update CLIENT_URL after deploying to Vercel)
6. Click **Deploy**. Railway gives you a URL like `https://sentosa-till-production.up.railway.app`
7. Save that URL — you'll need it for the frontend

### Step C — Deploy frontend to Vercel

1. Go to https://vercel.com and sign up with GitHub
2. Click **"Add New Project"** → import your `sentosa-till` repo
3. Set **Root Directory** to `client`
4. Under **Environment Variables**, add:
   ```
   VITE_API_URL=https://sentosa-till-production.up.railway.app
   ```
   (use your Railway URL from Step B)
5. Click **Deploy**
6. Vercel gives you a URL like `https://sentosa-till.vercel.app`

### Step D — Update CORS on Railway

Go back to Railway → your server → Variables → update:
```
CLIENT_URL=https://sentosa-till.vercel.app
```

Redeploy. Done.

---

## Using the app

### Till (main screen)

**Keyboard shortcuts (fastest way):**

| Key | Action |
|-----|--------|
| `1`–`9`, `0` | Select first 10 services |
| `q` `w` `e` `r` `t` `y` | Select Online App, Remita, Bill Payment, CV Basic, CV Pro, Other |
| `C` | Set payment to Cash |
| `T` | Set payment to Transfer |
| `G` | Toggle generator surcharge (only for eligible services) |
| `Enter` | Submit transaction |
| `Esc` | Clear selection |

**Typical workflow:**
1. Customer comes in for 3 pages B&W printing
2. Press `1` (selects B&W Printing, prefills ₦200)
3. Type `3` in the Qty field
4. Press `Enter`
5. Done — ₦600 logged in under 3 seconds

**Generator surcharge:**  
For Printing, Photocopy, and Scanning — when the generator is on, press `G` to toggle. The ₦100/page surcharge is added automatically and tracked separately.

### Log page

Full transaction history with filters by type, payment method, and date range. Export to CSV anytime for Excel.

### Analytics page

Period selector: Today / This week / This month / This year / All time.

Shows:
- Total income, expenses, net profit
- Generator surcharge collected
- Cash vs Transfer split
- Revenue by service (bar chart)
- Daily revenue trend (line chart, last 30 days)

---

## Updating services or prices

All services and prices are in one file:

```
client/src/utils/services.js
```

Edit the `SERVICES` array to add, remove, or change prices. Each entry has:
- `id` — the keyboard shortcut key
- `name` — display name
- `price` — default unit price
- `gen` — whether generator surcharge applies
- `unit` — unit label (page, job, doc, etc.)
- `category` — for grouping

After editing, if deployed: `git add . && git commit -m "Update prices" && git push` — Vercel redeploys automatically.

---

## Troubleshooting

**"Failed to save. Check connection."**  
The frontend can't reach the backend. Check that your Railway server is running and `VITE_API_URL` in Vercel is set correctly.

**MongoDB connection error on startup**  
Double-check your `MONGODB_URI`. Make sure your Atlas IP allowlist includes 0.0.0.0/0.

**CORS errors in browser console**  
Make sure `CLIENT_URL` in Railway matches your exact Vercel URL (no trailing slash).

**Transactions not showing in log**  
Hard refresh the page (Ctrl+Shift+R). If still missing, check Railway logs for errors.
