ALTER TABLE public.backtest_sessions
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS strategy text,
  ADD COLUMN IF NOT EXISTS account_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS risk_pct numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS commission_per_lot numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spread_points numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replay_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS chart_state jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.backtest_trades
  ADD COLUMN IF NOT EXISTS gross_pnl numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mfe numeric,
  ADD COLUMN IF NOT EXISTS mae numeric,
  ADD COLUMN IF NOT EXISTS notes text;