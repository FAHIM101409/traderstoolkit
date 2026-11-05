CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS profiles_username_prefix_idx
  ON public.profiles (lower(username) text_pattern_ops)
  WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_display_name_trgm_idx
  ON public.profiles USING gin (lower(display_name) extensions.gin_trgm_ops)
  WHERE display_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_body_trgm_idx
  ON public.posts USING gin (lower(body) extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS posts_pair_trgm_idx
  ON public.posts USING gin (lower(pair) extensions.gin_trgm_ops)
  WHERE pair IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_topic_trgm_idx
  ON public.posts USING gin (lower(topic) extensions.gin_trgm_ops)
  WHERE topic IS NOT NULL;

CREATE OR REPLACE FUNCTION public.search_social_people(p_query text)
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text, bio text)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_search text;
  v_escaped text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in is required to search profiles';
  END IF;
  v_search := lower(btrim(coalesce(p_query, '')));
  IF char_length(v_search) < 2 OR char_length(v_search) > 100 THEN
    RETURN;
  END IF;
  v_escaped := replace(replace(replace(v_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_');

  RETURN QUERY
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.bio
  FROM public.profiles AS p
  WHERE (p.username IS NOT NULL AND lower(p.username) LIKE v_escaped || '%' ESCAPE E'\\')
     OR (p.display_name IS NOT NULL AND lower(p.display_name) LIKE '%' || v_escaped || '%' ESCAPE E'\\')
  ORDER BY CASE WHEN p.username IS NOT NULL AND lower(p.username) LIKE v_escaped || '%' ESCAPE E'\\' THEN 0 ELSE 1 END,
           lower(coalesce(p.display_name, p.username, ''))
  LIMIT 30;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_social_posts(p_query text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  body text,
  topic text,
  pair text,
  images jsonb,
  created_at timestamptz,
  author_id uuid,
  username text,
  display_name text,
  avatar_url text
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_search text;
  v_escaped text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in is required to search posts';
  END IF;
  v_search := lower(btrim(coalesce(p_query, '')));
  IF char_length(v_search) < 2 OR char_length(v_search) > 100 THEN
    RETURN;
  END IF;
  v_escaped := replace(replace(replace(v_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_');

  RETURN QUERY
  SELECT po.id, po.user_id, po.body, po.topic, po.pair, po.images, po.created_at,
         pr.id, pr.username, pr.display_name, pr.avatar_url
  FROM public.posts AS po
  LEFT JOIN public.profiles AS pr ON pr.id = po.user_id
  WHERE lower(po.body) LIKE '%' || v_escaped || '%' ESCAPE E'\\'
     OR (po.pair IS NOT NULL AND lower(po.pair) LIKE '%' || v_escaped || '%' ESCAPE E'\\')
     OR (po.topic IS NOT NULL AND lower(po.topic) LIKE '%' || v_escaped || '%' ESCAPE E'\\')
  ORDER BY po.created_at DESC
  LIMIT 30;
END;
$$;

REVOKE ALL ON FUNCTION public.search_social_people(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.search_social_posts(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_social_people(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_social_posts(text) TO authenticated;