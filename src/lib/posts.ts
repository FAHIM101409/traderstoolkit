import { supabase } from "@/integrations/supabase/client";

export const TOPICS = ["Meme", "Education", "Motivation", "Markets", "Trade Idea"] as const;
export type Topic = (typeof TOPICS)[number];

export const MAX_POST_CHARS = 500;
export const MAX_POST_IMAGES = 4;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const POST_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const FEED_PAGE_SIZE = 20;
export const POSTS_PER_HOUR = 20;

export type PostAuthor = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type Post = {
  id: string;
  user_id: string;
  body: string;
  topic: string | null;
  pair: string | null;
  images: string[];
  created_at: string;
  profile: PostAuthor | null;
};

export type SocialPerson = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

/** Search RPCs return only approved profile fields; email is never selected. */
export async function searchSocialPeople(query: string): Promise<SocialPerson[]> {
  const { data, error } = await supabase.rpc("search_social_people", { p_query: query });
  if (error) throw new Error(error.message);
  return (data ?? []).map((person) => ({
    id: person.id,
    username: person.username ?? "",
    display_name: person.display_name,
    avatar_url: person.avatar_url,
    bio: person.bio,
  }));
}

/** Search posts and their public author fields without exposing private profile data. */
export async function searchSocialPosts(query: string): Promise<Post[]> {
  const { data, error } = await supabase.rpc("search_social_posts", { p_query: query });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    body: row.body,
    topic: row.topic,
    pair: row.pair,
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
    created_at: row.created_at,
    profile: {
      id: row.author_id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
    },
  }));
}

export async function fetchSocialPost(id: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, user_id, body, topic, pair, images, created_at, profile:profiles!posts_user_id_fkey(id, username, display_name, avatar_url)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    user_id: data.user_id,
    body: data.body,
    topic: data.topic,
    pair: data.pair,
    images: Array.isArray(data.images) ? (data.images as string[]) : [],
    created_at: data.created_at,
    profile: data.profile ?? null,
  };
}

/** Fetch one page of the feed, newest first. topic=null means every topic. */
export async function fetchFeedPage(topic: string | null, page: number): Promise<{ posts: Post[]; hasMore: boolean }> {
  let q = supabase
    .from("posts")
    .select("id, user_id, body, topic, pair, images, created_at, profile:profiles!posts_user_id_fkey(id, username, display_name, avatar_url)")
    .order("created_at", { ascending: false });
  if (topic) q = q.eq("topic", topic);
  const { data, error } = await q.range(page * FEED_PAGE_SIZE, page * FEED_PAGE_SIZE + FEED_PAGE_SIZE);
  if (error) throw new Error(error.message);
  const posts: Post[] = (data ?? []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    body: row.body,
    topic: row.topic,
    pair: row.pair,
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
    created_at: row.created_at,
    profile: row.profile ?? null,
  }));
  return { posts, hasMore: posts.length === FEED_PAGE_SIZE };
}

// --- Signed URLs (both social buckets are private) with an in-memory cache ---

const signedCache = new Map<string, { url: string; exp: number }>();
const SIGNED_TTL = 60 * 60 * 23; // seconds; re-sign before the 24h expiry

export async function signedUrl(bucket: string, path: string): Promise<string | null> {
  const key = `${bucket}/${path}`;
  const hit = signedCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_TTL);
  if (!data?.signedUrl) return null;
  signedCache.set(key, { url: data.signedUrl, exp: Date.now() + (SIGNED_TTL - 60) * 1000 });
  return data.signedUrl;
}

// --- Image handling ---

/** Returns an error message, or null when the file is an accepted post image. */
export function validateImageFile(file: File): string | null {
  if (!POST_IMAGE_TYPES.includes(file.type)) return `${file.name}: use JPG, PNG or WebP`;
  if (file.size > MAX_IMAGE_BYTES) return `${file.name}: images must be 5MB or smaller`;
  return null;
}

/**
 * Downscale + re-encode in the browser before upload so large photos still fit
 * the 5MB bucket limit. Shrinks progressively until the result is under 5MB.
 */
export async function compressImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // not decodable in-browser; the server/bucket still enforces limits
  }
  try {
    let maxDim = 1600;
    let quality = 0.82;
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (blob && blob.size <= MAX_IMAGE_BYTES) return blob;
      maxDim = Math.round(maxDim * 0.7);
      quality = Math.max(0.5, quality - 0.08);
    }
    return file;
  } finally {
    bitmap.close?.();
  }
}

// --- Formatting helpers ---

export function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const URL_RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

export type TextPiece = { type: "text"; value: string } | { type: "link"; value: string };

/** Splits post text into plain-text and URL pieces. Rendered as text nodes/anchors — never HTML. */
export function linkify(text: string): TextPiece[] {
  const parts: TextPiece[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const i = m.index ?? 0;
    if (i > last) parts.push({ type: "text", value: text.slice(last, i) });
    parts.push({ type: "link", value: m[0] });
    last = i + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}
