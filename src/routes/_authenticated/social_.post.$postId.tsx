import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Lightbox } from "@/components/social/lightbox";
import { PostCard } from "@/components/social/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { fetchSocialPost } from "@/lib/posts";

export const Route = createFileRoute("/_authenticated/social_/post/$postId")({
  head: () => ({
    meta: [
      { title: "Social post — Tradivo" },
      { name: "description", content: "A trader post on Tradivo Social." },
      { property: "og:title", content: "Social post — Tradivo" },
      { property: "og:description", content: "A trader post on Tradivo Social." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SocialPostPage,
});

function SocialPostPage() {
  const { postId } = Route.useParams();
  const { user } = useAuth();
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const postQuery = useQuery({ queryKey: ["social-post", postId], queryFn: () => fetchSocialPost(postId) });

  return (
    <AppShell title="Social post">
      <div className="mx-auto w-full max-w-[640px]">
        {postQuery.isLoading ? <div className="rounded-2xl border border-border bg-card p-5"><Skeleton className="h-10 w-40" /><Skeleton className="mt-5 h-4 w-full" /></div> : postQuery.error || !postQuery.data ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center"><h1 className="font-semibold">Post not found</h1><p className="mt-1 text-sm text-muted-foreground">This post may have been removed.</p></div>
        ) : (
          <PostCard post={postQuery.data} currentUserId={user?.id ?? null} onOpenImages={(images, index) => setLightbox({ images, index })} onDeleted={() => window.history.back()} />
        )}
      </div>
      {lightbox && <Lightbox images={lightbox.images} index={lightbox.index} onClose={() => setLightbox(null)} />}
    </AppShell>
  );
}