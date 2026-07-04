-- 1) Lock down SECURITY DEFINER functions: revoke broad PUBLIC execute, grant narrowly.

-- Trigger-only functions: no one should call directly.
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- User-invoked RPCs: authenticated only, no anon.
REVOKE ALL ON FUNCTION public.expire_my_plan_if_due() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_my_plan_if_due() TO authenticated;

REVOKE ALL ON FUNCTION public.redeem_access_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(text) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_codes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_codes() TO authenticated;

-- has_role is used inside RLS policies evaluated as the calling role; authenticated needs EXECUTE.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2) Explicit write policies on code_redemptions: block all direct client writes.
-- Inserts/updates/deletes must go through the SECURITY DEFINER redeem_access_code function.
CREATE POLICY "No direct inserts on code_redemptions"
  ON public.code_redemptions FOR INSERT TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "No direct updates on code_redemptions"
  ON public.code_redemptions FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);

CREATE POLICY "No direct deletes on code_redemptions"
  ON public.code_redemptions FOR DELETE TO authenticated, anon
  USING (false);