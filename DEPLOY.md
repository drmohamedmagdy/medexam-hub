# Deploying MedExam Hub to a live server (Vercel)

Goal: take the app from `localhost:3000` to a real public URL like `https://medexam-hub.vercel.app` (or your own domain). Estimated time: 30–45 minutes the first time.

## What you need

Three free accounts (sign up in this order):

1. **GitHub** — https://github.com/signup. Hosts the source code. Use your real email.
2. **Vercel** — https://vercel.com/signup. Click *Continue with GitHub* to link them automatically.
3. **Neon** — https://neon.tech. Free Postgres database. SQLite (what dev uses) doesn't work on Vercel because Vercel's filesystem is read-only.

Once those three are created, tell me and I'll do the steps marked **(I do this)** below. The steps marked **(you do this)** require you to click around in their dashboards.

---

## Step 1 — Switch the database from SQLite to Postgres (I do this)

Currently `prisma/schema.prisma` uses `provider = "sqlite"`. For Vercel I'll change it to `postgresql` and swap the Prisma adapter from `@prisma/adapter-better-sqlite3` to `@prisma/adapter-pg`. This is a one-line schema change plus a small change in `src/lib/db.ts`. The migrations directory will be reset because SQLite and Postgres migrations aren't compatible.

I'll do this once you have a Neon database URL ready (see Step 2).

## Step 2 — Create a Neon Postgres database (you do this, ~3 min)

1. Sign in at https://console.neon.tech
2. *Create project* → name it `medexam-hub` → region: pick the closest one to Egypt (likely `eu-central-1` Frankfurt)
3. After creation you'll see a **connection string** that looks like:
   ```
   postgres://user:password@ep-xxx.eu-central-1.aws.neon.tech/dbname?sslmode=require
   ```
4. Copy it. Paste it to me here when ready and I'll wire it up.

## Step 3 — Create a GitHub repo + push the code (you start, I finish)

**You do (~2 min):**
1. Go to https://github.com/new
2. Repo name: `medexam-hub`
3. Set it to **Private** (your code includes business logic, payment flow — keep it private)
4. Don't tick *Add README* — we already have one
5. Click *Create repository*. Copy the `git@github.com:...` SSH URL or `https://github.com/...` HTTPS URL it shows on the next page.

**I do (~2 min):**
- Run `git init`, `git add .`, `git commit -m "Initial deploy"` (your `.env` is gitignored, won't be uploaded)
- Push to your GitHub repo
- Confirm `dev.db`, `node_modules`, and `.env` are NOT in the repo (gitignore handles this)

## Step 4 — Deploy on Vercel (you do this, ~5 min)

1. Go to https://vercel.com/new
2. *Import* your `medexam-hub` repo (Vercel will list your GitHub repos automatically)
3. **Don't deploy yet.** Click *Environment Variables* and add these four:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | The Neon connection string from Step 2 |
   | `OPENAI_API_KEY` | Your OpenAI key (the same one in your local `.env`) |
   | `APP_SECRET` | Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and paste the result |
   | `OPENAI_MODEL` | (optional) `gpt-4o-mini` |

4. Click *Deploy*. First build takes ~2 min.
5. After it succeeds, Vercel shows you a URL like `https://medexam-hub-abcd.vercel.app`. **Copy it.**

## Step 5 — Run migrations on the production database (I do this)

Once the Vercel deploy is up but the database is empty, I'll run:
```bash
DATABASE_URL="<your Neon URL>" npx prisma migrate deploy
```
This creates the User / Exam / Question / etc. tables in Neon. After this you can sign up and use the live site.

## Step 6 — Update Paymob redirect URLs (you do this, ~3 min)

In your Paymob dashboard, for each of the three payment links (Basic / Pro / Premium):
1. Open the link's settings
2. Find **Redirect URL after success** (or similar field)
3. Change from blank / localhost to:
   ```
   https://your-vercel-url.vercel.app/payment/return
   ```
   (Replace `your-vercel-url` with whatever Vercel gave you in Step 4.)
4. Save.

Without this, users who pay won't be returned to your site automatically and won't get auto-upgraded.

## Step 7 — Test the live site (~10 min smoke test)

Open your Vercel URL in an incognito window:

1. Sign up with a fresh email
2. Generate one exam (Free trial: 1 exam, 10 questions max)
3. Submit it, view results
4. Go to `/plans` → click *Upgrade* on Basic
5. On the checkout page, click *Pay 699 EGP with Paymob*
6. Use a Paymob test card (ask Paymob support for one if needed) — DON'T use your real card
7. After payment, you should land on `/payment/return` with a success message and your account upgraded

If any step fails, take a screenshot of the error and send it.

## Step 8 — Optional but recommended

- **Custom domain.** Buy `medexamhub.com` (or whatever) from Namecheap or Cloudflare ($10–15/year). In Vercel: *Settings → Domains → Add Domain*. Vercel walks you through the DNS step.
- **OpenAI spend cap.** In OpenAI dashboard → *Billing → Limits*, set a monthly cap (e.g. $50/month) so a runaway loop can't drain your account.
- **Rotate the OpenAI key** you pasted in chat earlier. Generate a fresh one in OpenAI dashboard, replace it in Vercel env vars *and* your local `.env`.
- **Privacy policy + terms of service.** Doctors will ask. Use a generator like https://www.termsfeed.com (free for basic) and link from the footer.

---

## What's left after deployment

These are real product gaps, not deployment issues. Tell me which to do next:

- **Full Arabic UI translation** (RTL layout, translated nav/dashboard/forms)
- **File upload + RAG** (the biggest paid feature in the spec — Pro/Premium users upload PDFs and generate questions from them)
- **Free medical library** (the marketing funnel — articles, videos, summaries by specialty)
- **Email verification + password reset** (mandatory before real launch)
- **Paymob webhook with HMAC verification** (replaces the current trusted-redirect flow — needed before high transaction volume)
- **Admin tool** to manually flip a user's plan (useful when payment verification fails)
- **Performance analytics charts** (accuracy by topic over time — visible value-add for paid users)
