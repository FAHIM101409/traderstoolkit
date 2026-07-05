# Traders Toolkit — Refinement Update Plan

## 1. Universal MT5 broker & server support

- Remove the hardcoded broker list as the "only" source. Keep `MT5_BROKERS` as suggestions only.
- Rework `src/routes/_authenticated/mt5.tsx` connect form:
  - Broker field → searchable Combobox (Command component). Accepts free text; suggests from expanded local list.
  - Server field → searchable Combobox that:
    - Suggests servers for the selected broker (from list).
    - Also queries MetaApi's public broker-servers lookup server-side (`GET /users/current/servers/mt5` via a new `listMt5Servers` serverFn) filtered client-side.
    - Always allows manual entry of any custom server name.
- Expand `src/lib/mt5-brokers.ts` with the additional named brokers (5ers, Alpha Capital, Fusion Markets, Forex.com, RoboForex, etc.) but treat the list as suggestions only.
- Validation: keep login as 3-15 digits; server accepts any non-empty string up to 80 chars (already OK).

## 2. News Lab — live economic calendar

Replace the current static/outdated data source with a live feed.

- New serverFn `getEconomicCalendar` in `src/lib/news.functions.ts`:
  - Fetches Forex Factory's public weekly JSON (`https://nfs.faireconomy.media/ff_calendar_thisweek.json`) — free, no key, updates continuously.
  - Also fetches next week's file so "Upcoming" isn't empty near week-end.
  - Normalizes into `{ id, title, country, currency, impact, timeUtc, previous, forecast, actual, description }`.
  - Caches for 5 minutes in module memory to reduce load.
- Rewrite `src/routes/_authenticated/news.tsx`:
  - Tabs: **Today / This Week / Upcoming High-Impact / Recently Released**.
  - Timezone selector (reuses `src/lib/timezones.ts`, defaults to profile timezone).
  - Impact filter (Low/Med/High), currency filter (multi).
  - Row expands to details: why it matters, markets affected, expected volatility, historical impact (a small mapping keyed by event name; falls back to generic guidance).
  - Auto-refetch every 60s via react-query.
- Fundamentals AI (`src/routes/_authenticated/fundamentals.tsx` + `src/lib/ai.functions.ts`):
  - Before calling the model, fetch today's & this-week's calendar events server-side and inject a compact structured summary into the system prompt.
  - Prompt instructs the AI to reference actual/forecast/previous and explain impact on XAUUSD, EURUSD, GBPUSD, USDJPY, BTCUSD and correlated assets, and never to invent stale numbers.

## 3. Dashboard: MT5 vs Journal data source

- In `src/routes/_authenticated/dashboard.tsx`:
  - Load MT5 account row (already available) — detect `status === "connected"` and recent `last_sync_at`.
  - **If not connected**: keep current Journal-based stats. Add a prominent info banner: "You're viewing stats from your Trade Journal. Connect MT5 for live account sync." + **Connect MT5** button linking to `/mt5`.
  - **If connected**: switch all stat cards to MT5-sourced data.
    - Live account fields from `mt5_accounts` row (balance, equity, free_margin, margin_level, currency).
    - Trade-derived stats (win rate, PF, avg RR, equity curve, weekly/monthly P&L, recent trades, drawdown) computed from `trades` where `external_source = 'mt5'` only.
    - Add a small "Live from MT5 · synced {relative time}" chip; add "Sync now" button that calls `syncMt5`.
    - Floating P/L = equity − balance. Current drawdown = balance peak − current equity (from equity curve derived from MT5 trades).
- Journal page: no functional change — still shows all trades incl. MT5-imported, with notes/tags/psychology/setup/screenshots.

## 4. Rebrand: "Smart Traders Toolkit" → "Traders Toolkit"

Global search-and-replace across:
- `src/routes/__root.tsx` (title, meta, JSON-LD org name)
- `src/routes/index.tsx` (landing hero/copy)
- `src/routes/auth.tsx` (login/register copy)
- `src/components/landing/site-header.tsx`, `site-footer.tsx`
- `src/components/app/app-shell.tsx` (sidebar/header brand)
- `src/components/app/upgrade-dialog.tsx` (rename "Smart Trader Pro" → "Traders Toolkit Pro")
- `src/routes/best-trading-journal-for-metatrader.tsx` (SEO copy + JSON-LD)
- `src/routes/_authenticated/*` any inline brand copy (mt5, news, fundamentals, pricing, settings)
- README / any other visible strings
- `index.html` if present (title/description)

I'll grep `Smart Trader` project-wide and replace every hit. The route slugs / file names do not contain the brand so no route renames are required.

## Technical notes

- Forex Factory JSON is CORS-free from the server side; must be fetched via a serverFn, not the browser.
- MetaApi server-list endpoint requires the same `METAAPI_AUTH_TOKEN` already configured; no new secret needed.
- No DB schema changes required. No new migrations.
- All new server logic in `*.functions.ts` under `src/lib/`, wired through react-query in components (SSR-safe: news page stays under `_authenticated/`).
- Preserve existing premium UI, mobile responsiveness, and design tokens.

## Out of scope for this pass

- Historical events archive beyond current+next week (noted as future).
- Custom-domain email templates for the rename (Cloud auth emails will just use the new product name string; SMTP branding untouched).
