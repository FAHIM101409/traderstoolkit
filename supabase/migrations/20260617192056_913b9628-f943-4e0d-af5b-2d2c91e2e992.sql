
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS plan_renewal_at timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';

CREATE TABLE IF NOT EXISTS public.backtest_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled session',
  symbol text NOT NULL,
  timeframe text NOT NULL DEFAULT '1h',
  starting_balance numeric NOT NULL DEFAULT 10000,
  ending_balance numeric NOT NULL DEFAULT 10000,
  trades jsonb NOT NULL DEFAULT '[]'::jsonb,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.backtest_sessions TO authenticated;
GRANT ALL ON public.backtest_sessions TO service_role;

ALTER TABLE public.backtest_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own backtest sessions" ON public.backtest_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own backtest sessions" ON public.backtest_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own backtest sessions" ON public.backtest_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own backtest sessions" ON public.backtest_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER backtest_sessions_touch_updated_at
  BEFORE UPDATE ON public.backtest_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
