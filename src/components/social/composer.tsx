import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ImagePlus, Loader2, UserRound, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Profile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  TOPICS,
  MAX_POST_CHARS,
  MAX_POST_IMAGES,
  compressImage,
  validateImageFile,
  type Topic,
} from "@/lib/posts";

type Picked = { file: File; url: string };

const topicChip = "rounded-full border px-3.5 py-2 text-xs font-semibold transition min-h-11 flex items-center";
const topicOn = "border-primary bg-primary/10 text-primary";
const topicOff = "border-border text-muted-foreground hover:bg-muted";

export function Composer({ profile, onPosted }: { profile: Profile | null; onPosted: () => void }) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [pair, setPair] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickedRef = useRef(picked);
  pickedRef.current = picked;

  // Revoke preview object URLs on unmount
  useEffect(() => () => {
    for (const p of pickedRef.current) URL.revokeObjectURL(p.url);
  }, []);

  if (!user) return null;

  if (!profile?.username) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 shadow-glow">
          <UserRound className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-semibold">Set a username to post</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Your @username is how other traders will see you in the feed.
        </p>
        <Button asChild className="mt-2 h-11">
          <Link to="/settings">Set a username</Link>
        </Button>
      </div>
    );
  }

  function removeImage(index: number) {
    setPicked((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const errs: string[] = [];
    const next: Picked[] = [];
    let overflow = false;
    for (const file of Array.from(list)) {
      const err = validateImageFile(file);
      if (err) {
        errs.push(err);
        continue;
      }
      if (pickedRef.current.length + next.length >= MAX_POST_IMAGES) {
        overflow = true;
        break;
      }
      next.push({ file, url: URL.createObjectURL(file) });
    }
    if (overflow) errs.push(`Up to ${MAX_POST_IMAGES} images per post`);
    setPicked((prev) => [...prev, ...next]);
    setError(errs.length ? errs.join(" ") : null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit() {
    if (!user || busy) return;
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Write something first — empty posts are not allowed.");
      return;
    }
    if (trimmed.length > MAX_POST_CHARS) {
      setError(`Text must be ${MAX_POST_CHARS} characters or fewer.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const paths: string[] = [];
      for (const p of picked) {
        const blob = await compressImage(p.file);
        const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("post-images").upload(path, blob, {
          contentType: blob.type,
        });
        if (upErr) throw new Error(`Image upload failed: ${upErr.message}`);
        paths.push(path);
      }
      const { error: insErr } = await supabase.from("posts").insert({
        user_id: user.id,
        body: trimmed,
        topic: topic ?? null,
        pair: pair.trim() ? pair.trim().toUpperCase() : null,
        images: paths,
      });
      if (insErr) throw new Error(insErr.message);
      for (const p of picked) URL.revokeObjectURL(p.url);
      setPicked([]);
      setBody("");
      setTopic(null);
      setPair("");
      onPosted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish the post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX_POST_CHARS))}
        maxLength={MAX_POST_CHARS}
        rows={3}
        placeholder="Share a trade, an idea, or a lesson…"
        aria-label="Post text"
        className="min-h-24 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
      />

      {picked.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {picked.map((p, i) => (
            <div key={p.url} className="relative aspect-square overflow-hidden rounded-lg border border-border">
              <img src={p.url} alt={`Selected image ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-background/80 text-foreground shadow"
                aria-label={`Remove image ${i + 1}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {TOPICS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTopic(topic === t ? null : t)}
            className={cn(topicChip, topic === t ? topicOn : topicOff)}
            aria-pressed={topic === t}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={["image/jpeg", "image/png", "image/webp"].join(",")}
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={picked.length >= MAX_POST_IMAGES}
          className="h-11 gap-2"
        >
          <ImagePlus className="h-4 w-4" />
          {picked.length ? `${picked.length}/${MAX_POST_IMAGES} images` : "Add images"}
        </Button>
        <Input
          value={pair}
          onChange={(e) => setPair(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))}
          placeholder="Pair tag (e.g. EURUSD)"
          aria-label="Pair tag (optional)"
          className="h-11 max-w-[220px] flex-1 font-mono text-xs uppercase"
        />
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className={cn("text-xs tabular-nums", body.length > 480 ? "text-destructive" : "text-muted-foreground")}>
            {body.length}/{MAX_POST_CHARS}
          </span>
          <span className="text-[11px] text-muted-foreground">Not financial advice.</span>
        </div>
        <Button
          type="button"
          onClick={submit}
          disabled={busy || body.trim().length === 0}
          className="h-11 min-w-28 gap-2 shadow-glow"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Post
        </Button>
      </div>
    </div>
  );
}
