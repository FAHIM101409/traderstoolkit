-- Posts table for the Social feed
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  topic text,
  pair text,
  images jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index posts_created_at_idx on public.posts (created_at desc);
create index posts_user_created_idx on public.posts (user_id, created_at desc);

comment on column public.posts.images IS 'Array of post-images storage paths ("uid/file.webp"), max 4; enforced by posts_enforce_limits trigger';

-- RLS
alter table public.posts enable row level security;

create policy "Signed-in users read posts"
on public.posts for select to authenticated using (true);

create policy "Users insert own posts"
on public.posts for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users update own posts"
on public.posts for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users delete own posts"
on public.posts for delete to authenticated
using (auth.uid() = user_id);

-- Grants (Data API has no default privileges on public)
grant select, insert, update, delete on public.posts to authenticated;
grant all on public.posts to service_role;

-- Server-side limits: text length, topic, pair tag, image count/types, 20 posts/hour
create or replace function public.enforce_post_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  trimmed text;
  img jsonb;
  recent int;
begin
  trimmed := btrim(new.body);
  if char_length(trimmed) < 1 then
    raise exception 'Post cannot be empty';
  end if;
  if char_length(trimmed) > 500 then
    raise exception 'Post text must be 500 characters or fewer';
  end if;
  new.body := trimmed;

  if new.topic is not null and new.topic not in ('Meme','Education','Motivation','Markets','Trade Idea') then
    raise exception 'Invalid topic';
  end if;

  if new.pair is not null and new.pair !~ '^[A-Z0-9]{2,12}$' then
    raise exception 'Invalid pair tag';
  end if;

  if new.images is null or jsonb_typeof(new.images) <> 'array' then
    new.images := '[]'::jsonb;
  end if;
  if jsonb_array_length(new.images) > 4 then
    raise exception 'A post can include at most 4 images';
  end if;
  for img in select jsonb_array_elements(new.images) loop
    if jsonb_typeof(img) <> 'string' then
      raise exception 'Invalid image reference';
    end if;
  end loop;

  select count(*) into recent
  from public.posts
  where user_id = new.user_id and created_at > now() - interval '1 hour';
  if recent >= 20 then
    raise exception 'You have reached the limit of 20 posts per hour. Try again later.';
  end if;

  return new;
end;
$$;

create trigger posts_enforce_limits
before insert on public.posts
for each row execute function public.enforce_post_limits();

-- post-images storage: owner-only upload to own folder, images only; reads for signed-in users
create policy "post-images owner upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (metadata->>'mimetype') IN ('image/jpeg','image/png','image/webp')
);

create policy "post-images owner update"
on storage.objects for update to authenticated
using (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (metadata->>'mimetype') IN ('image/jpeg','image/png','image/webp')
);

create policy "post-images owner delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "post-images signed-in read"
on storage.objects for select to authenticated
using (bucket_id = 'post-images');