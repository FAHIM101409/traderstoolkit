# Backtesting Lab → Professional Trading Simulator

This is a large upgrade. To keep quality high and avoid a monolithic edit that regresses the current lab, I'll ship it in **three phases**. Each phase is independently usable and reviewable. Confirm the phasing (or tell me to compress) before I start.

## Scope reality check

A few items in the spec have hard technical limits worth naming up front so we don't over-promise:

- **TradingView "full experience"**: the free embeddable widget already includes candlesticks, all timeframes, symbol search, watchlist, drawing tools, indicators, templates, replay, object tree, chart settings, timezone, theme, price/time-scale settings. It does **not** support: saving layouts to the user's account (requires TradingView login inside the iframe), programmatically drawing SL/TP/entry lines on the chart, or reading the replay clock. Charting Library (with drawings API + saved layouts on our backend) requires a signed licence from TradingView — out of scope for beta. **Plan**: use the widget with every supported feature enabled; render SL/TP/entry/P&L as an **overlay panel docked to the chart** (MT5-style "Trade" tab), not as lines drawn inside the TV iframe. Interactive SL/TP dragging happens in that overlay via numeric inputs + quick-adjust buttons.
- **Fullscreen**: real fullscreen via the Fullscreen API (hides sidebar, header, everything except chart + trade toolbar + replay + trade controls).
- **Screenshots** of trades: deferred (spec says "optional later").

## Phase 1 — Sessions foundation + trading panel (this turn)

**DB (migration):**
- `backtest_sessions` already exists — extend with: `status` (`active|archived`), `starting_balance`, `symbol`, `timeframe`, `notes`, `last_opened_at`.
- New `backtest_trades` table: session_id, symbol, direction, order_type (`market|limit|stop`), status (`pending|open|closed|cancelled`), entry, sl, tp, exit, exit_reason (`tp|sl|manual|be|cancelled`), lots, risk_pct, risk_amount, rr, pnl, opened_at, closed_at, duration_sec. RLS + GRANTs.
- Free-plan cap enforced in a server fn (2 active sessions).

**UI (`/backtest`):**
- Session picker modal on entry: "Resume existing" (cards with name, trades, win rate, PF, net P&L, last opened) or "Create new" (name, symbol, timeframe, starting balance).
- Session bar at top: name, balance, equity, floating P&L, "Change session" / rename / duplicate / archive / delete / export JSON.
- **MT5-style trading toolbar** above the chart: order type buttons (Buy/Sell Market, Buy/Sell Limit, Buy/Sell Stop), lot size, risk %, SL, TP, price (for pendings). Auto-computes lot from risk % using the instrument engine from the Lot Size Calculator.
- **Positions/Orders dock** beside the chart (tabbed: Open / Pending / History): each row shows entry, SL, TP, floating P&L, and buttons for **Close**, **Close 50%**, **Move to BE**, **Modify SL/TP**, **Cancel** (pendings). All auto-recorded to `backtest_trades`.
- **Fullscreen button** — real Fullscreen API, hides app shell, keeps chart + toolbar + dock.
- TradingView widget config maxed: `withdateranges`, `details`, `hotlist`, `calendar`, `hide_side_toolbar:false`, `allow_symbol_change`, `save_image`, `studies_overrides`, `enabled_features: ["header_saveload","use_localstorage_for_settings"]` where supported by the free widget, plus theme/watermark/timezone settings surfaced in a "Chart settings" popover.

## Phase 2 — Session dashboard & analytics (next turn)

- Per-session dashboard route `/backtest/$sessionId`: equity curve, calendar heatmap, win/loss distribution, PF, expectancy, max DD, avg RR, avg hold time, largest win/loss, avg risk %, breakdown by pair / timeframe / day of week / session (London/NY/Asia/Sydney).
- Sessions list route `/backtest` (when no session selected) with cards + search/filter/archive toggle.
- Import/export JSON.

## Phase 3 — Future-proofing hooks (later)

- Interfaces for AI Coach, mistake detection, session comparison, Monte Carlo, strategy scoring. Stubs + typed contracts; no ML work in beta.

## Technical notes

- Backtest "current price" for filling market orders and floating P&L uses the last symbol quote we can get from a lightweight quote endpoint (server fn hitting a free FX/crypto quote source; falls back to user-entered price if unavailable). Pending order fills are simulated when the user clicks "Fill now at price X" — we do not stream live ticks into the TV iframe (not exposed by the widget).
- All trade math (pip value, P&L, RR) reuses `src/lib/instruments.ts` for consistency with the Lot Size Calculator.
- Free-plan gate uses existing `useProfile().isPro`.

## Confirm

Reply "go" to start Phase 1, or tell me to change the split (e.g. "do phases 1+2 in one go", "skip pending orders for now", "keep it single-session only").
