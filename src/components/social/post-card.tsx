import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { linkify, relTime, signedUrl, type Post } from "@/lib/posts";
import { SocialAvatar } from "./social-avatar";

export function PostCard({
  post,
  currentUserId,
  onOpen,
  onOpenImages,
  onDeleted,
}: {
  post: Post;
  currentUserId: string | null | undefined;
  onOpen?: () => void;
  onOpenImages: (images: string[], index: number) => void;
  onDeleted: () => void;
}) {
  const author = post.profile;
  const name = author?.display_name?.trim() || author?.username || "Trader";
  const mine = Boolean(currentUserId && currentUserId === post.user_id);

  const [imgUrls, setImgUrls] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    const paths = post.images ?? [];
    Promise.all(paths.map((p) => signedUrl("post-images", p))).then((urls) => {
      if (on) setImgUrls(urls.filter((u): u is string => Boolean(u)));
    });
    return () => {
      on = false;
    };
  }, [post.images]);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  async function remove() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const paths = post.images ?? [];
      if (paths.length) await supabase.storage.from("post-images").remove(paths);
      const { error: delErr } = await supabase.from("posts").delete().eq("id", post.id);
      if (delErr) throw new Error(delErr.message);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the post.");
      setDeleting(false);
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <SocialAvatar path={author?.avatar_url ?? null} name={name} />
          <div className="min-w-0">
            {author?.username ? (
              <Link to="/social/profile/$username" params={{ username: author.username }} className="block truncate text-sm font-semibold hover:text-primary">
                {name}
              </Link>
            ) : <p className="truncate text-sm font-semibold">{name}</p>}
            <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              {author?.username ? <Link to="/social/profile/$username" params={{ username: author.username }} className="truncate hover:text-primary">@{author.username}</Link> : <span>Trader</span>}
              <span>· {relTime(post.created_at)}</span>
            </div>
          </div>
        </div>
        {mine && (
          <button
            type="button"
            onClick={confirming ? remove : () => setConfirming(true)}
            className="-m-1 grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-destructive"
            aria-label={confirming ? "Tap again to confirm delete" : "Delete post"}
          >
            {deleting ? (
              <span className="text-[11px] font-semibold text-destructive">…</span>
            ) : confirming ? (
              <span className="text-[11px] font-semibold text-destructive">Sure?</span>
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {onOpen ? (
        <button type="button" onClick={onOpen} className="mt-3 block min-h-11 w-full text-left whitespace-pre-wrap break-words text-sm leading-relaxed hover:text-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {post.body}
        </button>
      ) : (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
          {linkify(post.body).map((piece, i) => piece.type === "link" ? (
            <a key={i} href={piece.value.startsWith("www.") ? `https://${piece.value}` : piece.value} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-2">{piece.value}</a>
          ) : <span key={i}>{piece.value}</span>)}
        </p>
      )}

      {(post.topic || post.pair) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {post.topic && (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              {post.topic}
            </span>
          )}
          {post.pair && (
            <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] font-semibold text-muted-foreground">
              {post.pair}
            </span>
          )}
        </div>
      )}

      {imgUrls.length > 0 && (
        <div className={cn("mt-3 grid gap-1 overflow-hidden rounded-xl", imgUrls.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
          {imgUrls.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => onOpenImages(imgUrls, i)}
              className={cn("group relative overflow-hidden bg-muted", imgUrls.length === 3 && i === 0 && "col-span-2")}
              aria-label={`Open image ${i + 1}`}
            >
              <img
                src={url}
                alt={`Post image ${i + 1}`}
                loading="lazy"
                className={cn(
                  "w-full object-cover transition group-hover:opacity-90",
                  imgUrls.length === 1 ? "max-h-[420px]" : "aspect-square",
                )}
              />
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </article>
  );
}
