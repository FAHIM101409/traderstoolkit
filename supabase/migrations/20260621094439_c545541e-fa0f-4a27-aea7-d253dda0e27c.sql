
-- MT5 Accounts table
CREATE TABLE public.mt5_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  broker text NOT NULL,
  server text NOT NULL,
  login text NOT NULL,
  metaapi_account_id text,
  region text NOT NULL DEFAULT 'new-york',
  status text NOT NULL DEFAULT 'provisioning',
  -- cached snapshot
  balance numeric,
  equity numeric,
  margin numeric,
  free_margin numeric,
  margin_level numeric,
  currency text,
  leverage numeric,
  -- sync
  sync_frequency_minutes integer NOT NULL DEFAULT 15,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mt5_accounts TO authenticated;
GRANT ALL ON public.mt5_accounts TO service_role;

ALTER TABLE public.mt5_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mt5 accounts" ON public.mt5_accounts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER mt5_accounts_updated_at
  BEFORE UPDATE ON public.mt5_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE UNIQUE INDEX mt5_accounts_user_unique ON public.mt5_accounts(user_id);

-- Trade dedup columns for external imports (MT5, MT4, cTrader, etc.)
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS external_source text,
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS trades_external_unique
  ON public.trades(user_id, external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;
