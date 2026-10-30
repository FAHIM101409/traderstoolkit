import { supabase } from "@/integrations/supabase/client";

/**
 * avatar_url stores the storage object path ("uid/filename.png", optionally
 * prefixed with "avatars/"). The bucket is private, so display URLs are
 * short-lived signed URLs generated on demand and cached in memory.
 * Never store a direct public URL — the bucket is not public.
 */
export async function getAvatarSignedUrl(avatarUrl: string | null | undefined): Promise<string | null> {
  if (!avatarUrl) return null;
  const path = avatarUrl.replace(/^avatars\//, "");
  if (!path) return null;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

export function uploadAvatarFile(path: string, file: File) {
  return supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
}

export const AVATAR_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB, mirrors the bucket limit
