import { useCallback, useMemo, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Hourglass, Loader2, Newspaper, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Profile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Composer } from "./composer";
import { PostCard } from "./post-card";
import { Lightbox } from "./lightbox";
import { FEED_PAGE_SIZE, TOPICS, fetchFeedPage } from "@/lib/posts";
import { cn } from "@/lib/utils";

const FILTERS = ["All", ...TOPICS] as const;

const filterChip = "flex min-h-11 items-center rounded-full border px-4 text-xs font-semibold transition";
const filterOn = "border-primary bg-primary/10 text-primary";
const filterOff = "border-border text-muted-foreground hover:bg-muted";

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="mt-4 h-3.5 w-full" />
      <Skeleton className="mt-2 h-3.5 w-3/4" />
    </div>
  );
}

export function Feed({ profile }: { profile: Profile | null }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  const query = useInfiniteQuery({
    queryKey: ["social-feed", filter],
    queryFn: ({ pageParam }) => fetchFeedPage(filter === "All" ? null : filter, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, allPages) => (last.hasMore ? allPages.length : undefined),
  });

  const posts = useMemo(() => query.data?.pages.flatMap((p) => p.posts) ?? [], [query.data]);

  const handlePosted = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["social-feed"] });
    setSheetOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [queryClient]);

  const handleDeleted = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["social-feed"] });
  }, [queryClient]);

  return (
    <div className="mx-auto w-full max-w-[640px]">
      {/* Topic filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn(filterChip, filter === f ? filterOn : filterOff)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Desktop composer */}
      <div className="mb-4 hidden md:block">
        <Composer profile={profile} onPosted={handlePosted} />
      </div>

      {/* Feed list */}
      {query.isLoading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 shadow-glow">
            <Newspaper className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold">
            {filter === "All" ? "No posts yet" : `No ${filter.toLowerCase()} posts yet`}
          </h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            {filter === "All"
              ? "Be the first to share a trade, an idea or a lesson with the community."
              : "Try another topic, or start the conversation yourself."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id ?? null}
              onOpenImages={(images, index) => setLightbox({ images, index })}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {query.hasNextPage && !query.isLoading && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            className="h-11 min-w-40"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
            Load more
          </Button>
        </div>
      )}

      {/* Mobile: floating compose button + bottom sheet */}
      <Button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label="New post"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full p-0 shadow-glow md:hidden"
      >
        <Plus className="h-6 w-6" />
      </Button>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[88vh] overflow-y-auto rounded-t-2xl border-border bg-background p-4 sm:p-5"
        >
          <SheetTitle className="sr-only">New post</SheetTitle>
          <Composer profile={profile} onPosted={handlePosted} />
        </SheetContent>
      </Sheet>

      {lightbox && (
        <Lightbox images={lightbox.images} index={lightbox.index} onClose={() => setLightbox(null)} />
      )}

      {/* keep FEED_PAGE_SIZE referenced for clarity of page size tuning */}
      <span className="hidden">{FEED_PAGE_SIZE}</span>
    </div>
  );
}

// Unused placeholder to keep the Hourglass icon imported for future tabs parity
void Hourglass;
