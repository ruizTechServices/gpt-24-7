# 24HourGPT Systems Audit Report

Date: 2025-09-01
Author: Ada (for Gio)

---

## 1) Executive Summary

- __Overall__: The system is functional end-to-end (auth → payment → session grant → chat). Core security controls are present (RLS enabled, webhook signature verification, rate limit basic). Performance is reasonable, with clear provider abstraction (OpenAI/Anthropic) and clean API layers.
- __Strengths__:
  - Solid separation of concerns across `app/api/*` routes, providers in `lib/providers/`, and DB access.
  - Stripe Checkout + webhook flow is correctly wired with `metadata.userId`.
  - RLS enabled on key tables (sessions, payments, usage_log), Redis-based rate limiting in chat route, Zod validation.
  - Supabase middleware keeps auth cookies in sync for SSR.
- __Key Risks__:
  - RLS policy gaps and duplicates between dev and prod (security/perf risk).
  - Token accounting uses a non-atomic update (race condition risk under concurrency).
  - Admin access gated by email domain instead of roles.
  - `next.config.ts` allows serverActions from any origin (`'*'`).
  - Types for Supabase DB are outdated vs schema, risking runtime/type errors.
  - Rate limiter fails open in prod if Redis is unavailable.
  - Chat encryption (pgSodium/Vault) not fully wired client-side.
- __Top Priority Actions__:
  1) Regenerate Supabase TS types to match DB.
  2) Harden RLS policies (payments, sessions, usage_log) and remove duplicates.
  3) Implement atomic `consume_tokens()` RPC and use it in `/api/chat`.
  4) Lock serverActions allowed origins to `SITE_URL`.
  5) Replace email-domain admin gating with role-based check.

---

## 2) System Overview

- __Framework__: Next.js 15 (App Router), React 19, Tailwind CSS.
- __Auth & DB__: Supabase (Auth, Postgres, RLS, Vault planned), `@supabase/ssr`, `@supabase/supabase-js`.
- __Payments__: Stripe Checkout + webhook (`stripe` SDK), `metadata.userId` to correlate payer.
- __Providers__: OpenAI (`openai`), Anthropic (`@anthropic-ai/sdk`).
- __Other__: Redis (`ioredis`) for rate limiting, Zod for input validation.

### Key Flows
- __Authentication__
  - SSR/server APIs use `createSupabaseServerClient()` in `lib/supabase/server.ts`.
  - `requireUser()` in `lib/auth.ts` redirects to `/login` if unauthenticated.
  - `middleware.ts` syncs cookies for Supabase auth on each request.

- __Payments__
  - Checkout created in `lib/payments/stripe.ts` with `metadata.userId`.
  - Webhook (`app/api/payment/webhook/route.ts`) verifies signature, records payment, and grants/extends 24h session.

- __Chat__
  - `app/api/chat/route.ts` enforces auth, validates payload via Zod, checks active session/token limits, applies Redis rate limiting, routes request to selected provider, logs usage, and updates session tokens.
  - Providers in `lib/providers/openai.ts` and `lib/providers/anthropic.ts` handle model calls.

- __Admin__
  - `app/admin/page.tsx` + `app/api/admin/usage/route.ts` are gated (currently by email domain). Service role client pulls `payments` and recent `usage_log` for dashboard stats.

---

## 3) Codebase Structure (selected)

- `app/api/chat/route.ts`: Chat API, auth + Zod + rate limit + provider routing + usage logging + session token updates.
- `components/typescript/customized_components/ModelSelect.tsx`: UI for provider/model selection. Updated to output `{ provider: 'openai'|'anthropic', model: string }` or `{}` for auto.
- `lib/providers/openai.ts`, `lib/providers/anthropic.ts`: Provider adapters for chat completions.
- `lib/auth.ts`: `getUserOrNull()`, `requireUser()` helpers.
- `lib/supabase/server.ts`: SSR client using Next.js headers and Supabase envs.
- `lib/db.ts`: Service role client (server-only usage) for admin/reporting/webhook.
- `app/api/payment/checkout/route.ts`: Creates Stripe Checkout sessions.
- `app/api/payment/webhook/route.ts`: Verifies events, records payments, grants/extends sessions.
- `app/api/admin/usage/route.ts`: Admin summary of last 100 usage entries and total revenue.
- `middleware.ts`: Cookie sync via Supabase middleware.
- `next.config.ts`: Experimental serverActions enabled; currently `allowedOrigins: ['*']`.

---

## 4) Security Posture

- __RLS__
  - Enabled on `public.sessions`, `public.payments`, `public.usage_log`.
  - Dev: advisors show “RLS Enabled No Policy” on `payments` and `usage_log` → authenticated inserts/selects may fail unless service role is used.
  - Prod: multiple permissive/overlapping policies (advisors flagged) → increases complexity and can degrade performance. Needs consolidation and hardening.

- __Admin Access__
  - Currently: email domain gate (`@ruiztechservices.com`). Should migrate to role-based via `user.app_metadata.role === 'admin'`.

- __Rate Limiting__
  - Redis-based rate limiting in chat route; fails open on Redis errors even in prod → increase abuse risk during outages.

- __ServerActions Origin__
  - `next.config.ts` allows from any origin. Should restrict to `SITE_URL`.

- __Stripe Webhook__
  - Uses signature verification; inserts payments idempotently by unique `checkout_session_id`. Good.

- __Encryption__
  - Plan to use pgSodium + Vault for chat messages. Server-side pieces appear planned; client-side integration not implemented yet.

- __Supabase Auth Settings__ (advisors)
  - OTP expiry too long; leaked password protection disabled. Should tighten.

---

## 5) Database & Types

- __Schema alignment__
  - `lib/supabase/database.types.ts` is outdated. `payments` table in code references fields like `checkout_session_id`, `payment_intent_id`, `provider`, `raw`, which are missing or mismatched in current types.

- __Indexes__
  - Prod: duplicate unique index on `payments.checkout_session_id` (`payments_checkout_session_id_key` and `ux_payments_checkout_session_id`).
  - Prod: unused indexes flagged by advisors: `idx_sessions_user_ends_at`, `idx_payments_user_id`, `idx_usage_log_session_id`, `idx_usage_log_user_id`.
  - Keep `idx_sessions_user_status_ends` as it aligns with query pattern in `/api/chat/route.ts`.

---

## 6) Payments Flow Details

- `lib/payments/stripe.ts` creates a $1 Checkout session; sets `metadata.userId` on both Session and PaymentIntent.
- `app/api/payment/webhook/route.ts` verifies signature, extracts `userId`, records payment row with unique `checkout_session_id`, and grants/extends session. Unique constraint prevents duplicates; errors ignored on conflict.

---

## 7) AI Provider Layer

- Routing logic in `/api/chat/route.ts` respects optional override `{ provider, model }`.
- UI bug fixed in `ModelSelect.tsx` so provider strings match backend Zod enum and model IDs are valid:
  - OpenAI: `gpt-4o-mini`
  - Anthropic: `claude-3-5-sonnet-20241022`

---

## 8) Issues & Bugs (Root Causes)

- __Model override mismatch (fixed)__: UI used incorrect provider/model names causing backend validation failures.
- __Non-atomic token updates__: `.update({ tokens_used: tokens_used + est })` risks race conditions.
- __RLS gaps/duplication__: Dev missing policies; Prod has multiple permissive overlapping ones.
- __Outdated Supabase types__: Risk of silent breakages and refactor friction.
- __Rate limiter fails-open in prod__: Abuse risk during Redis incidents.
- __Admin domain gating__: Weak authorization model vs roles/claims.
- __ServerActions `'*'`__: Expanded attack surface.
- __Chat encryption not wired__: Data at rest not encrypted as intended.
- __Auth advisor warnings__: OTP expiry too long; leaked password protection disabled.

---

## 9) What’s Right

- __Separation of concerns__: API routes cleanly organized; provider adapters abstracted.
- __Payment correlation__: Robust use of `metadata.userId` and idempotency via unique keys.
- __Input validation__: Zod schema for chat endpoint.
- __RLS enabled__: Correct default posture; just needs policy refinement.
- __Cookie sync middleware__: Helps SSR auth stability.

---

## 10) Recommendations & Roadmap (Prioritized)

1) __Regenerate Supabase TS types__
   - Regenerate `lib/supabase/database.types.ts` from the dev project to match schema used by code.

2) __Harden & simplify RLS policies__
   - Payments (authenticated users can read own; writes via service role only):
     ```sql
     ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

     DROP POLICY IF EXISTS payments_select_own ON public.payments;
     CREATE POLICY payments_select_own
       ON public.payments
       FOR SELECT TO authenticated
       USING (user_id = auth.uid());
     ```
   - Sessions (authenticated read own; writes via service role):
     ```sql
     ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

     DROP POLICY IF EXISTS sessions_select_own ON public.sessions;
     CREATE POLICY sessions_select_own
       ON public.sessions
       FOR SELECT TO authenticated
       USING (user_id = auth.uid());
     ```
   - Usage log (authenticated insert/select own):
     ```sql
     ALTER TABLE public.usage_log ENABLE ROW LEVEL SECURITY;

     DROP POLICY IF EXISTS usage_log_insert_own ON public.usage_log;
     CREATE POLICY usage_log_insert_own
       ON public.usage_log
       FOR INSERT TO authenticated
       WITH CHECK (user_id = auth.uid());

     DROP POLICY IF EXISTS usage_log_select_own ON public.usage_log;
     CREATE POLICY usage_log_select_own
       ON public.usage_log
       FOR SELECT TO authenticated
       USING (user_id = auth.uid());
     ```
   - In prod, drop redundant/permissive duplicates flagged by advisors.

3) __Atomic token consumption__
   - Create `consume_tokens(p_session_id uuid, p_inc int)` with `SECURITY DEFINER` that updates `tokens_used` only if within limit and returns success flag.
   - Update `/api/chat/route.ts` to call `supabase.rpc('consume_tokens', { p_session_id: session.id, p_inc: est_tokens })` and check the returned `ok`.

4) __Restrict ServerActions origin__
   - In `next.config.ts`, set allowed origins to `[process.env.SITE_URL]` instead of `'*'`.

5) __Admin role-based gating__
   - Assign `app_metadata.role = 'admin'` for admins in Supabase.
   - Replace domain checks in `app/admin/page.tsx` and `/api/admin/usage/route.ts` with role checks.

6) __Rate limiter fail-closed in prod__
   - In `lib/ratelimit.ts`, if Redis errors and `NODE_ENV==='production'`, return `{ allowed: false }` to protect during outages.

7) __Index hygiene__
   - Drop `ux_payments_checkout_session_id` (duplicate of `payments_checkout_session_id_key`).
   - After observation window, drop advisor-flagged unused indexes if confirmed unused.

8) __Chat encryption end-to-end__
   - Create Vault key, implement RPCs `add_encrypted_chat_message`, `get_decrypted_chat_history`, and wire client calls in `lib/hooks/useChat.ts`.

9) __Supabase Auth settings__
   - Reduce OTP expiry to 10–15 minutes.
   - Enable leaked password protection.

10) __Observability__
   - Add structured logging around webhook handling and token consumption RPCs.
   - Consider basic metrics (counts, latency, rate-limit hits) for `/api/chat`.

---

## 11) Alignment with Gio’s Preferences

- __Auth__: Current app uses Supabase Auth, while your preference notes "NextAuth exclusively." If we keep Supabase Auth, I will continue to harden RLS and policies. If you prefer migration, we can scope a phased plan. For now, this report assumes staying on Supabase Auth.
- __Stack__: Next.js App Router, Supabase DB, Stripe, Tailwind, aligns with your standards. Vector storage via Pinecone is not currently necessary.
- __Workflow__: No `.windsurfrules` file found; if you want, we can create and keep it updated with tasks.

---

## 12) File References (citations)

- `app/api/chat/route.ts`
- `components/typescript/customized_components/ModelSelect.tsx`
- `lib/providers/openai.ts`
- `lib/providers/anthropic.ts`
- `lib/auth.ts`
- `lib/supabase/server.ts`
- `lib/db.ts`
- `app/api/payment/checkout/route.ts`
- `app/api/payment/webhook/route.ts`
- `app/api/admin/usage/route.ts`
- `middleware.ts`
- `next.config.ts`
- `lib/supabase/database.types.ts` (stale, action: regenerate)

---

## 13) Status Log of Actions Taken in This Audit

- Fixed model override bug in `ModelSelect.tsx` so it aligns with backend Zod validation and provider model IDs.
- Compiled a prioritized remediation roadmap (RLS hardening, RPC for tokens, index cleanup, admin roles, serverActions origin, encryption E2E, auth settings).
- Verified Stripe metadata usage and webhook idempotency.

---

## 14) Open Questions

- Do you want to keep Supabase Auth or migrate to NextAuth?
- Confirm `SITE_URL` and any additional trusted origins for serverActions.
- Confirm which admins should get `app_metadata.role = 'admin'`.

---

## 15) Appendices

### A) Sample SQL Snippets

- RLS (payments select own):
```sql
CREATE POLICY payments_select_own
  ON public.payments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

- RLS (usage_log insert/select own):
```sql
CREATE POLICY usage_log_insert_own
  ON public.usage_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY usage_log_select_own
  ON public.usage_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

- Atomic token consumption function (sketch):
```sql
CREATE OR REPLACE FUNCTION consume_tokens(p_session_id uuid, p_inc int)
RETURNS TABLE (ok boolean, new_tokens_used int) AS $$
BEGIN
  UPDATE public.sessions
    SET tokens_used = tokens_used + p_inc, updated_at = now()
    WHERE id = p_session_id
      AND tokens_used + p_inc <= token_limit
    RETURNING true, tokens_used
    INTO ok, new_tokens_used;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::int;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### B) Commands/Config (high level)

- Restrict serverActions origins in `next.config.ts` to `[process.env.SITE_URL]`.
- Drop duplicate index:
```sql
DROP INDEX IF EXISTS public.ux_payments_checkout_session_id;
```
