-- Social foundation: extend profiles with social fields
ALTER TABLE public.profiles
  ADD COLUMN username text,
  ADD COLUMN bio text,
  ADD COLUMN trading_style text[] NOT NULL DEFAULT '{}',
  ADD COLUMN experience_level text,
  ADD COLUMN favorite_pairs text[] NOT NULL DEFAULT '{}',
  ADD COLUMN country text,
  ADD COLUMN show_stats_on_profile boolean NOT NULL DEFAULT false;

-- Backfill: generate a unique username from each user's current display name
DO $$
DECLARE
  r record;
  base text;
  cand text;
  n int;
  reserved text[] := ARRAY['admin','administrator','support','tradivo','moderator','mod','team','official','root','staff','help','security','billing','sales','system','lovable','null','undefined'];
BEGIN
  FOR r IN SELECT id, display_name FROM public.profiles WHERE username IS NULL LOOP
    base := lower(regexp_replace(COALESCE(r.display_name, 'trader'), '[^a-zA-Z0-9_]', '', 'g'));
    base := regexp_replace(base, '^_+|_+$', '', 'g');
    base := left(base, 20);
    IF length(base) < 3 THEN base := 'trader'; END IF;
    cand := base;
    n := 0;
    LOOP
      IF cand = ANY(reserved) OR EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = cand AND id <> r.id) THEN
        n := n + 1;
        cand := left(base, 20 - length(n::text)) || n::text;
      ELSE
        EXIT;
      END IF;
    END LOOP;
    UPDATE public.profiles SET username = cand WHERE id = r.id;
  END LOOP;
END $$;

-- Username format + reserved-name rules (case-insensitive uniqueness via index)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format CHECK (
    username IS NULL OR (
      username ~ '^[a-z0-9_]{3,20}$'
      AND username NOT IN ('admin','administrator','support','tradivo','moderator','mod','team','official','root','staff','help','security','billing','sales','system','lovable','null','undefined')
    )
  ),
  ADD CONSTRAINT profiles_bio_len CHECK (bio IS NULL OR char_length(bio) <= 160),
  ADD CONSTRAINT profiles_experience_level CHECK (experience_level IS NULL OR experience_level IN ('beginner','intermediate','advanced','professional'));

CREATE UNIQUE INDEX profiles_username_lower_key ON public.profiles (lower(username)) WHERE username IS NOT NULL;

-- A username, once claimed, cannot be removed
CREATE OR REPLACE FUNCTION public.prevent_username_clear()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.username IS NULL AND OLD.username IS NOT NULL THEN
    RAISE EXCEPTION 'Username cannot be removed once set';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER profiles_prevent_username_clear
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_username_clear();

-- Public (signed-in-wide) reads of profile data; the email column does not exist on profiles,
-- so no email is ever stored in or exposed through profile data
DROP POLICY "Users view own profile" ON public.profiles;
CREATE POLICY "Signed-in users view public profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Avatars bucket: owner-scoped folder, images only (mimetype enforced), 2MB cap enforced by the bucket
CREATE POLICY "Avatar owners upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (metadata->>'mimetype') IN ('image/png','image/jpeg','image/webp','image/gif')
  );

CREATE POLICY "Avatar owners update own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatar owners delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Signed-in users view avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');