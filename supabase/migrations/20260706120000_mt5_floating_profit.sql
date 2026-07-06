-- Add floating profit column so we can store MetaApi's live floating P/L
-- from account-information (`profit` field) instead of deriving it client-side.
ALTER TABLE public.mt5_accounts
  ADD COLUMN IF NOT EXISTS floating_profit numeric;
