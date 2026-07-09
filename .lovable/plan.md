
# Backtesting Lab → Immersive Trading Workspace + Backtesting Station

Before I write code, a hard reality check on what the free TradingView embeddable widget actually allows, because several items in your spec are physically impossible without a licensed **TradingView Charting Library** (signed contract with TradingView, self-hosted JS bundle, own datafeed). I don't want to fake these.

## What the free TV widget CAN do (we'll surface all of it)

- Candles, all timeframes, symbol search, indicators, drawing tools, chart settings (candle/wick/border/bg/grid/watermark/timezone/price scale/time scale/sessions/themes), templates, save-image, watchlist, calendar, hotlist, details.
- Fullscreen chart taking ~90% of viewport.
- All customization lives inside the TV chart UI (right-click → settings, format menus). We can't rebuild that menu outside the iframe — but everything you listed under "TradingView Customization" is already there.

## What the free TV widget CANNOT do (needs licensed Charting Library)

The widget is an **iframe** we don't control. We cannot reach into it. This blocks:

- **Draggable entry/SL/TP lines on the chart** — no drawing API exposed.
- **Bar Replay controls driven from our UI** (play/pause/step/speed/jump-to-date buttons outside the iframe) — TV's Replay tool exists **inside** the widget toolbar and users can use it there, but we can't script it from outside.
- **Favoriting drawing tools into our own toolbar** — favorites live in TV's own left toolbar (already visible); we can't mirror them.
- **Price alerts tied to the chart's live price** — no price feed leaves the iframe. We can build alerts against a separate quote source, but they won't render as lines on the chart.
- **Saved chart layouts to the user's account** (requires TV login inside the iframe, which is fine, or Charting Library + our backend).

**Options for the blocked items:**

1. **Ship the widget as-is** (recommended for beta): tell users Replay/Alerts/Drawing favorites live inside the TV chart itself. Everything you listed is available — just not re-skinned by us.
2. **License TradingView Charting Library** later (paid, signed agreement, own datafeed backend). Then we can build draggable trade lines, external Replay controls, custom alert lines, favorited drawing toolbar. Out of scope for this turn.
3. **Fake it** — build UI buttons that look like Replay/Alerts but don't actually control the chart. I refuse; it would mislead users.

**I'll build option 1 and clearly label the widget-native features in the UI** ("Use TV's built-in Replay in the chart toolbar", etc.). If you want option 2, it's a separate, much larger project.

## What I WILL build this turn

### 1. Immersive workspace layout (`/backtest`)

- Chart takes 88vh, near edge-to-edge. Session bar collapses to a slim strip.
- App shell sidebar auto-collapses when on this route.
- Real Fullscreen API button (already have) — refined.
- Trading panel removed from above the chart.

### 2. Floating MT5-style trading toolbar

- Compact draggable floating card, bottom-right by default, collapsible.
- Six order buttons: Buy/Sell Market, Buy/Sell Limit, Buy/Sell Stop.
- Inputs: Lot, Risk %, SL, TP, Price (for pendings). Auto-lot from `calculatePosition()`.
- One click = order recorded to `backtest_trades`.
- **No draggable chart lines** (blocked — see above). Instead, a numeric SL/TP row per open position in the floating positions dock with ±pip quick-adjust buttons. Users can visually mark levels with TV's horizontal-line drawing tool.

### 3. Positions/Orders dock

- Compact floating dock, bottom-left, tabs Open / Pending / History.
- Actions: Close, Close 50%, Move to BE, Modify SL/TP, Cancel.
- Shows floating P&L using a lightweight quote server fn (FX/crypto free source).

### 4. Move analytics out to `/backtesting-station`

- New route `Labs → Backtesting Station` (`/backtesting-station`).
- Lists all sessions as cards: name, symbol, trades, win rate, PF, net P&L, last opened. Search + archive filter.
- Click a card → `/backtesting-station/$sessionId` with: Win rate, PF, avg RR, expectancy, net/gross/max DD, largest win/loss, equity curve, calendar heatmap, daily/weekly/monthly/pair/timeframe breakdowns, trade list, session notes.
- Distribution + heatmap charts using existing recharts.
- "Most common mistakes" and "AI summary" as placeholder cards with typed contracts wired but empty (future feature).

### 5. `/backtest` is now trading-only

- Chart + floating toolbar + floating positions dock. No stats. No charts panel. No numbers.
- Session picker modal on entry (existing) stays.

### 6. Media-player Backtesting Controls bar (bottom of chart)

I'll add a slim bottom bar with ⏮ ◀ ▶ ⏯ ⏩ 📅 buttons. **They will open TV's built-in Bar Replay tool via a helper tooltip on first click**, since we cannot programmatically step the widget. Speed/date pickers will be present but explicitly labelled "TV Replay tool". If you'd rather I remove the bar entirely instead of showing a scaffolded version that hands off to TV's own Replay, tell me.

### 7. Free/Pro gates (existing pattern)

- Free: 2 active sessions (existing).
- Alerts / unlimited replay / etc. → deferred with the Charting Library work.

## What I will NOT build this turn

- Charting-Library-only features: draggable trade lines, external replay driving the chart, favorited drawing toolbar mirroring TV, alert lines on chart.
- Multi-chart layouts, Monte Carlo, strategy scoring, AI coach — Phase 3 hooks only.

## Files touched

- `src/routes/_authenticated/backtest.tsx` — full redesign, chart-first, floating toolbars.
- `src/components/app/tradingview-chart.tsx` — expose more props (studies, watchlist config), remove chrome.
- New: `src/components/backtest/floating-trade-toolbar.tsx`, `src/components/backtest/floating-positions-dock.tsx`, `src/components/backtest/replay-controls-bar.tsx`.
- New route: `src/routes/_authenticated/backtesting-station.tsx` (list).
- New route: `src/routes/_authenticated/backtesting-station.$sessionId.tsx` (detail + analytics).
- `src/components/app/app-shell.tsx` — add nav entry, auto-collapse sidebar on `/backtest`.
- Analytics helpers extended in `src/lib/backtest.ts` (equity curve, DD, breakdowns).
- Quote server fn `src/lib/quotes.functions.ts` for floating P&L.
- No DB migration (Phase 1 schema already covers everything).

## Confirm

Reply **"go"** to build this, or tell me:

- **"skip the replay bar"** — I'll drop the fake bottom media controls entirely (cleaner, more honest).
- **"drop the floating dock, put positions in a slide-out panel instead"**.
- **"do analytics station later"** — I'll only redesign the workspace this turn.
- **"license Charting Library"** — separate quote, out of scope.
