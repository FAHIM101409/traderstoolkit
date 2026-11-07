import { useCallback, useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Newspaper, Plus, Search, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Profile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Composer } from "./composer";
import { PostCard } from "./post-card";
import { Lightbox } from "./lightbox";
import { SocialAvatar } from "./social-avatar";
import { fetchFeedPage, searchSocialPeople, searchSocialPosts, type Post, type SocialPerson } from "@/lib/posts";
import { cn } from "@/lib/utils";

type SearchTab = "people" | "posts";

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-3 w-20" /></div>
      </div>
      <Skeleton className="mt-4 h-3.5 w-full" />
      <Skeleton className="mt-2 h-3.5 w-3/4" />
    </div>
  );
}

function useDebouncedSearch(value: string) {
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [value]);
  return debounced.length >= 2 ? debounced : "";
}

function SearchResults({
  query,
  activeTab,
  setActiveTab,
  currentUserId,
  onOpenImages,
  onOpenPost,
  onDeleted,
}: {
  query: string;
  activeTab: SearchTab;
  setActiveTab: (tab: SearchTab) => void;
  currentUserId: string | null;
  onOpenImages: (images: string[], index: number) => void;
  onOpenPost: (post: Post) => void;
  onDeleted: () => void;
}) {
  const peopleQuery = useQuery({
    queryKey: ["social-search", "people", query],
    queryFn: () => searchSocialPeople(query),
    enabled: query.length >= 2,
    staleTime: 15_000,
  });
  const postsQuery = useQuery({
    queryKey: ["social-search", "posts", query],
    queryFn: () => searchSocialPosts(query),
    enabled: query.length >= 2,
    staleTime: 15_000,
  });

  const isPeople = activeTab === "people";
  const loading = isPeople ? peopleQuery.isFetching : postsQuery.isFetching;
  const error = isPeople ? peopleQuery.error : postsQuery.error;
  const people = peopleQuery.data ?? [];
  const posts = postsQuery.data ?? [];
  const hasResults = isPeople ? people.length > 0 : posts.length > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex border-b border-border">
        <button type="button" onClick={() => setActiveTab("people")} className={cn("flex min-h-11 flex-1 items-center justify-center gap-2 border-b-2 px-3 text-sm font-semibold", isPeople ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")} aria-pressed={isPeople}>
          People <span className="text-xs opacity-70">{peopleQuery.data?.length ?? "—"}</span>
        </button>
        <button type="button" onClick={() => setActiveTab("posts")} className={cn("flex min-h-11 flex-1 items-center justify-center gap-2 border-b-2 px-3 text-sm font-semibold", !isPeople ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")} aria-pressed={!isPeople}>
          Posts <span className="text-xs opacity-70">{postsQuery.data?.length ?? "—"}</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 p-4" aria-label="Searching"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
      ) : error ? (
        <p className="p-6 text-center text-sm text-muted-foreground">Search is unavailable right now. Please try again.</p>
      ) : !hasResults ? (
        <div className="p-8 text-center">
          <p className="font-medium">No results</p>
          <p className="mt-1 text-sm text-muted-foreground">Try another name, pair or phrase.</p>
        </div>
      ) : isPeople ? (
        <div className="max-h-[min(55vh,520px)] overflow-y-auto p-2">
          {(people as SocialPerson[]).map((person) => {
            const displayName = person.display_name?.trim() || person.username;
            return (
              <Link
                key={person.id}
                to="/social/profile/$username"
                params={{ username: person.username }}
                className="flex min-h-[68px] items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <SocialAvatar path={person.avatar_url} name={displayName} className="h-11 w-11" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{displayName}</span>
                  <span className="block truncate text-xs text-muted-foreground">@{person.username}</span>
                  {person.bio && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{person.bio}</span>}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="max-h-[min(65vh,640px)] space-y-3 overflow-y-auto p-3">
          {(posts as Post[]).map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onOpen={() => onOpenPost(post)}
              onOpenImages={onOpenImages}
              onDeleted={onDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Feed({ profile }: { profile: Profile | null }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchTab, setSearchTab] = useState<SearchTab>("people");
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const debouncedSearch = useDebouncedSearch(searchText);

  const query = useInfiniteQuery({
    queryKey: ["social-feed"],
    queryFn: ({ pageParam }) => fetchFeedPage(null, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, allPages) => (last.hasMore ? allPages.length : undefined),
  });
  const posts = useMemo(() => query.data?.pages.flatMap((page) => page.posts) ?? [], [query.data]);

  const handlePosted = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["social-feed"] });
    setSheetOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [queryClient]);
  const handleDeleted = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["social-feed"] });
    queryClient.invalidateQueries({ queryKey: ["social-search"] });
  }, [queryClient]);

  const searchResults = () => (
    <SearchResults
      query={debouncedSearch}
      activeTab={searchTab}
      setActiveTab={setSearchTab}
      currentUserId={user?.id ?? null}
      onOpenImages={(images, index) => setLightbox({ images, index })}
      onOpenPost={openPost}
      onDeleted={handleDeleted}
    />
  );

  function openPost(post: Post) {
    void navigate({ to: "/social/post/$postId", params: { postId: post.id } });
  }

  return (
    <div className="mx-auto w-full max-w-[640px] min-w-0">
      <div className="relative mb-4 flex min-h-11 items-center justify-end gap-2">
        {desktopSearchOpen ? (
          <div className="relative hidden w-full md:block">
            <div className="flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 focus-within:ring-2 focus-within:ring-ring">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Escape") { setDesktopSearchOpen(false); setSearchText(""); } }}
                placeholder="Search people and posts"
                aria-label="Search people and posts"
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <Button type="button" variant="ghost" aria-label="Close search" className="h-11 w-11 p-0" onClick={() => { setDesktopSearchOpen(false); setSearchText(""); }}><X /></Button>
            </div>
            {searchText.length > 0 && <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 shadow-xl">{searchText.trim().length < 2 ? <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Enter at least 2 characters.</p> : searchResults()}</div>}
          </div>
        ) : (
          <Button type="button" variant="outline" aria-label="Search Feed" className="hidden h-11 w-11 p-0 md:inline-flex" onClick={() => setDesktopSearchOpen(true)}><Search /></Button>
        )}
        <Button type="button" variant="outline" aria-label="Search Feed" className="h-11 w-11 shrink-0 p-0 md:hidden" onClick={() => setMobileSearchOpen(true)}><Search /></Button>
        <Button type="button" variant="outline" className="hidden h-11 shrink-0 md:inline-flex" onClick={() => setSheetOpen(true)}><Plus /> New post</Button>
      </div>

      {query.isLoading ? (
        <div className="space-y-3"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 shadow-glow"><Newspaper className="h-7 w-7 text-primary" /></div>
          <h3 className="text-base font-semibold">No posts yet</h3>
          <p className="max-w-xs text-sm text-muted-foreground">Be the first to share a trade, an idea or a lesson with the community.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => <PostCard key={post.id} post={post} currentUserId={user?.id ?? null} onOpen={() => openPost(post)} onOpenImages={(images, index) => setLightbox({ images, index })} onDeleted={handleDeleted} />)}
        </div>
      )}

      {query.hasNextPage && !query.isLoading && <div className="mt-4 flex justify-center"><Button variant="outline" className="h-11 min-w-40" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>{query.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}Load more</Button></div>}

      <Button type="button" onClick={() => setSheetOpen(true)} aria-label="New post" className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full p-0 shadow-glow md:hidden"><Plus className="h-6 w-6" /></Button>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-2xl border-border bg-background p-4 sm:p-5">
          <SheetTitle className="sr-only">New post</SheetTitle>
          <Composer profile={profile} onPosted={handlePosted} />
        </SheetContent>
      </Sheet>

      {mobileSearchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search Tradivo"
          className="fixed inset-0 z-50 h-[100dvh] overflow-hidden bg-background md:hidden"
          onKeyDown={(event) => { if (event.key === "Escape") { setMobileSearchOpen(false); setSearchText(""); } }}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-border px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] pr-16">
              <div className="mb-3 text-left text-base font-semibold">Search Tradivo</div>
              <div className="flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 focus-within:ring-2 focus-within:ring-ring">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input autoFocus value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="People, pairs, posts" aria-label="Search people and posts" className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
                {searchText && <Button type="button" variant="ghost" aria-label="Clear search" className="h-11 w-11 p-0" onClick={() => setSearchText("")}><X /></Button>}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {searchText.trim().length < 2 ? <p className="py-8 text-center text-sm text-muted-foreground">Enter at least 2 characters to search.</p> : searchResults()}
            </div>
          </div>
          <Button type="button" variant="ghost" aria-label="Close search" className="absolute right-3 top-3 h-11 w-11 p-0" onClick={() => { setMobileSearchOpen(false); setSearchText(""); }}><X /></Button>
        </div>
      )}

      {lightbox && <Lightbox images={lightbox.images} index={lightbox.index} onClose={() => setLightbox(null)} />}
    </div>
  );
}