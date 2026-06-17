
CREATE TABLE public.mt5_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  label text,
  broker text,
  account_number text,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mt5_tokens TO authenticated;
GRANT ALL ON public.mt5_tokens TO service_role;

ALTER TABLE public.mt5_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mt5 tokens" ON public.mt5_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mt5_ticket text;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
CREATE UNIQUE INDEX IF NOT EXISTS trades_user_mt5_ticket_uniq
  ON public.trades(user_id, mt5_ticket) WHERE mt5_ticket IS NOT NULL;
