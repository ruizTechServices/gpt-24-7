# 24HourGPT

A minimal, production‑minded Next.js app that sells 24‑hour AI access for $1. Auth via Supabase, payment via Stripe Checkout, usage accounting with Redis rate‑limits and token attribution, and an auto‑router across OpenAI and Anthropic models.


## Overview

- __Purpose__: Users sign in, purchase a 24‑hour pass, then chat with an AI. Access expires automatically after 24 hours (or extends on additional purchases).
- __Pricing__: $1 USD per 24 hours (config in `lib/payments/stripe.ts`).
- __Auth__: Supabase Auth (Google provider via `@supabase/ssr` + `@supabase/auth-ui-react`).
- __Payments__: Stripe Checkout + Webhooks to grant/extend access and record payments.
- __Models__: Auto‑routes between OpenAI and Anthropic; manual override available in the UI.
- __Rate limit__: 30 req/min per user via Redis (`lib/ratelimit.ts`).


## Tech Stack

- __Next.js 15 (App Router)__ with Turbopack dev/build (`package.json` scripts)
- __React 19__
- __Tailwind CSS v4 (PostCSS plugin)__ via `postcss.config.mjs` and `app/globals.css`
- __Supabase__ (`@supabase/ssr`, `@supabase/supabase-js`) for auth + database
- __Stripe__ for payments (`stripe` SDK)
- __OpenAI__ and __Anthropic__ SDKs
- __ioredis__ for rate limiting
- __zod__ for request validation


## App Surface

Pages (App Router):
- `app/page.tsx` — Landing page
- `app/login/page.tsx` — Supabase Auth UI (Google)
- `app/dashboard/page.tsx` — Shows session status; purchase button
- `app/chat/page.tsx` — Auth‑gated chat UI
- `app/admin/page.tsx` — Simple admin (email domain gate: `@ruiztechservices.com`)
- `app/auth/callback/route.ts` — Supabase OAuth code exchange

Key API Routes:
- `POST /api/chat` → `app/api/chat/route.ts`
  - Auth required; validates payload (zod)
  - Enforces active session, token limit, and Redis rate limit
  - Auto‑selects model via `lib/router.ts` (or honors override), calls provider, logs usage, updates session tokens
- `GET /api/session` → `app/api/session/route.ts`
  - Returns current user’s session status and limits
- `POST /api/payment/checkout` → `app/api/payment/checkout/route.ts`
  - Creates Stripe Checkout Session for $1 pass and returns redirect URL
- `POST /api/payment/webhook` → `app/api/payment/webhook/route.ts`
  - Verifies Stripe signature, records payment, and grants/extends 24h session
- `GET /api/admin/usage` → `app/api/admin/usage/route.ts`
  - Admin‑gated; returns total revenue and last 100 usage entries


## Notable Implementation Details

- __Auth enforcement__: `requireUser()` in `lib/auth.ts` redirects anonymous users to `/login`.
- __Session tracking__: `sessions` table stores `starts_at`, `ends_at`, `tokens_used`, `token_limit`. Access valid if `ends_at > now` and `status = 'active'`.
- __Token estimation__: crude 4 chars/token in `lib/tokens.ts`.
- __Model routing__: `lib/router.ts` uses simple heuristics to send longer/analytical prompts to Anthropic Claude Sonnet; defaults to OpenAI `gpt-4o-mini`.
- __Rate limiting__: `lib/ratelimit.ts` with Redis. Fails open in dev if misconfigured.
- __Middleware__: `middleware.ts` delegates to `lib/supabase/middleware.ts` to keep Supabase auth cookies in sync on every request.


## Environment Variables

Create a `.env.local` with at least the following:

```bash
# Required (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
# Provide ONE of the two below (anon preferred for public clients)
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
# or
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY

# Server-only Supabase Service Role (do not expose to client)
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Site base URL (used in redirects, Stripe success/cancel)
SITE_URL=http://localhost:3000

# OpenAI / Anthropic
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis (rate limiting)
# Option A: full DSN
# REDIS_URL=rediss://:password@host:port
# Option B: host:port + separate password
# REDIS_URL=your-redis-host:6379
# REDIS_API_KEY=your-redis-password
```

Notes:
- `SUPABASE_SERVICE_ROLE_KEY` is used server‑side in `lib/db.ts` to bypass RLS for writes like payments and usage logging. Keep it secret.
- `SITE_URL` is used in Stripe success/cancel URLs and server‑side fetches.


## Expected Database Tables (Supabase)

The app expects these tables to exist (column names derived from queries/inserts):

- `sessions`
  - `id` (uuid), `user_id` (uuid), `status` ('active' | ...), `starts_at` (timestamptz), `ends_at` (timestamptz), `tokens_used` (int), `token_limit` (int)
- `usage_log`
  - `id` (uuid), `created_at` (timestamptz default now()), `user_id` (uuid), `session_id` (uuid), `provider` (text), `model` (text), `prompt_chars` (int), `response_chars` (int), `est_tokens` (int), `latency_ms` (int)
- `payments`
  - `id` (uuid), `user_id` (uuid), `provider` (text), `checkout_session_id` (text), `payment_intent_id` (text), `amount_cents` (int), `currency` (text), `status` (text)

Configure RLS to your needs. The code uses the service role for writes in server routes and webhooks.


## Local Development

1) Install deps
```bash
npm install
```

2) Run dev server
```bash
npm run dev
# opens http://localhost:3000
```

3) Configure Supabase Auth (Google)
- In Supabase Dashboard, enable Google provider and set Redirect URL to: `http://localhost:3000/auth/callback`
- Ensure your site’s production domain is also added in production.

4) Stripe Webhook (local)
```bash
# Requires Stripe CLI
stripe listen --forward-to localhost:3000/api/payment/webhook
# Copy the printed signing secret into STRIPE_WEBHOOK_SECRET
```


## User Flow

1) User visits `/login` and signs in with Google (Supabase).
2) In `/dashboard`, if no active pass, click “Buy 24‑Hour Access ($1)” → Stripe Checkout.
3) On successful payment, webhook grants or extends a 24‑hour `sessions` record.
4) User chats at `/chat`. Each request is validated, rate‑limited, and metered; usage is recorded to `usage_log` and deducted against the session’s `token_limit`.


## Admin

- `/admin` is gated to emails ending with `@ruiztechservices.com`.
- Displays total succeeded revenue (sum of `payments.amount_cents`) and last 100 usage rows.


## Project Structure (partial)

```
app/
  page.tsx                 # Landing
  login/page.tsx           # Supabase Auth UI (Google)
  dashboard/page.tsx       # Session status + checkout button
  chat/page.tsx            # Auth‑gated chat
  admin/page.tsx           # Simple admin (domain‑gated)
  auth/callback/route.ts   # Supabase OAuth code exchange
  api/
    chat/route.ts
    session/route.ts
    payment/
      checkout/route.ts
      webhook/route.ts
    admin/usage/route.ts
components/
  typescript/customized_components/
    ChatUI.tsx
    ModelSelect.tsx
    BuyButton.tsx
lib/
  auth.ts
  router.ts
  tokens.ts
  ratelimit.ts
  http.ts
  payments/stripe.ts
  providers/{openai,anthropic}.ts
  supabase/{client,server,middleware}.ts
  db.ts
```


## Security & Operational Notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` out of the client; only load them in server contexts.
- Webhook route `POST /api/payment/webhook` expects raw body and a valid Stripe signature.
- Redis misconfiguration in dev fails open to avoid blocking; review before production.
- Admin gate is a simple email domain check; replace with roles/claims for production.


## License

No license file is included. All rights reserved unless a license is added.
