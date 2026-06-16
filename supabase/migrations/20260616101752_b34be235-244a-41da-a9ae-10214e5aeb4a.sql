
CREATE TYPE public.trade_direction AS ENUM ('long','short');
CREATE TYPE public.trade_status AS ENUM ('open','win','loss','breakeven');

CREATE TABLE public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair text NOT NULL,
  asset_class text NOT NULL DEFAULT 'forex',
  direction public.trade_direction NOT NULL,
  session text,
  strategy text,
  smc_tags text[] NOT NULL DEFAULT '{}',
  entry_price numeric,
  stop_loss numeric,
  take_profit numeric,
  exit_price numeric,
  lot_size numeric,
  risk_amount numeric,
  risk_pct numeric,
  rr_planned numeric,
  rr_realized numeric,
  pnl numeric,
  status public.trade_status NOT NULL DEFAULT 'open',
  notes text,
  screenshot_url text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trades TO authenticated;
GRANT ALL ON public.trades TO service_role;

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own trades" ON public.trades FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own trades" ON public.trades FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own trades" ON public.trades FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own trades" ON public.trades FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trades_updated_at BEFORE UPDATE ON public.trades FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX trades_user_opened_idx ON public.trades(user_id, opened_at DESC);

-- Storage policies for trade-screenshots bucket (created via tool)
CREATE POLICY "Users view own screenshots" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own screenshots" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own screenshots" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own screenshots" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
