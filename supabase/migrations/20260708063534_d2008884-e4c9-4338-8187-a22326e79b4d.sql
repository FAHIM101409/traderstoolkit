
ALTER TABLE public.backtest_sessions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_opened_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.backtest_sessions
  ALTER COLUMN symbol SET DEFAULT 'EURUSD';

CREATE TABLE IF NOT EXISTS public.backtest_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.backtest_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('long','short')),
  order_type text NOT NULL DEFAULT 'market' CHECK (order_type IN ('market','limit','stop')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('pending','open','closed','cancelled')),
  entry numeric,
  sl numeric,
  tp numeric,
  exit numeric,
  exit_reason text,
  lots numeric NOT NULL,
  risk_pct numeric,
  risk_amount numeric,
  rr numeric,
  pnl numeric NOT NULL DEFAULT 0,
  opened_at timestamptz,
  closed_at timestamptz,
  duration_sec integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.backtest_trades TO authenticated;
GRANT ALL ON public.backtest_trades TO service_role;

ALTER TABLE public.backtest_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own backtest trades" ON public.backtest_trades
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own backtest trades" ON public.backtest_trades
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own backtest trades" ON public.backtest_trades
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own backtest trades" ON public.backtest_trades
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS backtest_trades_session_idx ON public.backtest_trades(session_id);
CREATE INDEX IF NOT EXISTS backtest_trades_user_idx ON public.backtest_trades(user_id);

CREATE TRIGGER backtest_trades_touch_updated_at
  BEFORE UPDATE ON public.backtest_trades
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
