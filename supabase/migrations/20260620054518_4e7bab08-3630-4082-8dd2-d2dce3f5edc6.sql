
-- Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Access codes
CREATE TABLE IF NOT EXISTS public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  duration_days integer NOT NULL DEFAULT 30,
  max_uses integer,  -- null = unlimited
  uses_count integer NOT NULL DEFAULT 0,
  revoked boolean NOT NULL DEFAULT false,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.access_codes TO authenticated;
GRANT ALL ON public.access_codes TO service_role;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage codes" ON public.access_codes;
CREATE POLICY "admins manage codes" ON public.access_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Redemptions
CREATE TABLE IF NOT EXISTS public.code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.access_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

GRANT SELECT ON public.code_redemptions TO authenticated;
GRANT ALL ON public.code_redemptions TO service_role;
ALTER TABLE public.code_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own redemptions" ON public.code_redemptions;
CREATE POLICY "users read own redemptions" ON public.code_redemptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Redeem function
CREATE OR REPLACE FUNCTION public.redeem_access_code(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code public.access_codes%ROWTYPE;
  v_expires timestamptz;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('status','error','message','Not signed in'); END IF;

  SELECT * INTO v_code FROM public.access_codes WHERE upper(code) = upper(trim(p_code)) LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','invalid','message','Invalid Code'); END IF;
  IF v_code.revoked THEN RETURN jsonb_build_object('status','expired','message','This code has expired.'); END IF;
  IF v_code.max_uses IS NOT NULL AND v_code.uses_count >= v_code.max_uses THEN
    RETURN jsonb_build_object('status','used','message','This code has already been redeemed.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.code_redemptions WHERE code_id = v_code.id AND user_id = v_uid) THEN
    RETURN jsonb_build_object('status','used','message','You have already redeemed this code.');
  END IF;

  v_expires := now() + (v_code.duration_days || ' days')::interval;
  INSERT INTO public.code_redemptions(code_id, user_id, expires_at) VALUES (v_code.id, v_uid, v_expires);
  UPDATE public.access_codes SET uses_count = uses_count + 1 WHERE id = v_code.id;

  UPDATE public.profiles
    SET plan = 'pro', plan_status = 'active',
        plan_renewal_at = GREATEST(COALESCE(plan_renewal_at, now()), v_expires)
    WHERE id = v_uid;

  RETURN jsonb_build_object('status','success','message','Pro Membership Activated','expires_at', v_expires);
END $$;

GRANT EXECUTE ON FUNCTION public.redeem_access_code(text) TO authenticated;

-- Auto-expire self
CREATE OR REPLACE FUNCTION public.expire_my_plan_if_due()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles
    SET plan = 'free', plan_status = 'expired'
    WHERE id = auth.uid()
      AND plan = 'pro'
      AND plan_renewal_at IS NOT NULL
      AND plan_renewal_at < now();
END $$;

GRANT EXECUTE ON FUNCTION public.expire_my_plan_if_due() TO authenticated;

-- First-admin bootstrap
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('status','error','message','Not signed in'); END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN jsonb_build_object('status','exists','message','Admin already exists');
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (v_uid, 'admin') ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('status','success','message','You are now admin');
END $$;

GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

-- Admin list view (codes + redeemer info)
CREATE OR REPLACE FUNCTION public.admin_list_codes()
RETURNS TABLE(
  id uuid, code text, duration_days int, max_uses int, uses_count int, revoked bool, note text,
  created_at timestamptz,
  redemptions jsonb
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT c.id, c.code, c.duration_days, c.max_uses, c.uses_count, c.revoked, c.note, c.created_at,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', r.user_id,
        'display_name', p.display_name,
        'redeemed_at', r.redeemed_at,
        'expires_at', r.expires_at
      ) ORDER BY r.redeemed_at DESC)
      FROM public.code_redemptions r
      LEFT JOIN public.profiles p ON p.id = r.user_id
      WHERE r.code_id = c.id
    ), '[]'::jsonb)
  FROM public.access_codes c
  ORDER BY c.created_at DESC;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_list_codes() TO authenticated;
