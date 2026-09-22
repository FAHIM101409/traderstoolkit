# TradingView-Style Backtesting Chart

## Goal

Turn the existing real-candle replay screen into a polished professional chart workspace while preserving blind replay: only candles at or before the replay cursor are ever rendered.

## Build

### Chart workspace
- Refine the full-height chart layout for desktop and smaller screens, keeping the chart as the primary surface.
- Add a compact chart header with instrument, timeframe, candle OHLC readout, replay status, indicators, settings, layouts, and fullscreen controls.
- Keep loading, unavailable-data, and empty-session states clear without covering working controls.

### Multi-timeframe switching
- Make all supported intervals switch directly from the chart header.
- Preserve each session's selected symbol, primary timeframe, secondary panes, chart layout, and replay cursor.
- Keep every secondary chart synchronized to the primary replay cutoff so none reveal future candles.

### Drawing tools
- Complete the left tool rail for cursor, trend line, ray, horizontal/vertical lines, rectangle, Fibonacci retracement, measure, text, eraser, colours, favourites, and clear-all.
- Improve selected-tool feedback, tooltips, mobile access, and pointer behavior.
- Persist drawings with the backtesting session and keep them aligned while zooming or scrolling.

### Indicators
- Provide searchable indicator selection for SMA, EMA, WMA, Bollinger Bands, VWAP, RSI, MACD, ATR, and Stochastic.
- Support editable parameters, colours, visibility, removal, overlays, and separate oscillator panes.
- Show active indicators in the chart header and persist their configuration per session.

### Chart settings
- Support candles, bars, Heikin Ashi, line, and area chart styles.
- Support bullish/bearish colours, background, axis text, grid, volume, crosshair, logarithmic scale, watermark, right margin, and reset.
- Apply changes live and save them with the session.

### Verification
- Validate desktop and mobile layouts.
- Run the complete signed-in workflow: open/create a session, load real candles, switch timeframes, add/edit an indicator, draw and erase an object, change chart settings, select a historical start, and step/play replay.
- Confirm the rendered candle count never passes the replay cursor, including secondary timeframes, and verify saved state after reopening the session.

## Technical details

- Continue using the installed Lightweight Charts engine and the existing real historical candle service; no TradingView iframe or fake controls.
- Keep chart controls in focused React components and session state in the existing `chart_state` / `replay_state` records.
- Fix any integration defects discovered during end-to-end verification, limited to this chart workspace.