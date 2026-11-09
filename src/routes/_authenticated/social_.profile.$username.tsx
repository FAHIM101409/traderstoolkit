import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Newspaper, UserCircle } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { SocialAvatar } from "@/components/social/social-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/social_/profile/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Tradivo Social` },
      { name: "description", content: `Public trader profile for @${params.username} on Tradivo.` },
      { property: "og:title", content: `@${params.username} — Tradivo Social` },
      { property: "og:description", content: `Public trader profile for @${params.username} on Tradivo.` },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SocialProfilePage,
});

function SocialProfilePage() {
  const { username } = Route.useParams();
  const profileQuery = useQuery({
    queryKey: ["social-profile", username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, trading_style, experience_level, favorite_pairs, country, created_at")
        .eq("username", username.toLowerCase())
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const profile = profileQuery.data;
  const displayName = profile?.display_name?.trim() || profile?.username || "Trader";

  return (
    <AppShell title="Trader profile">
      <div className="mx-auto w-full max-w-2xl">
        {profileQuery.isLoading ? (
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6"><Skeleton className="h-16 w-16 rounded-full" /><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-full" /></div>
        ) : profileQuery.error || !profile ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <UserCircle className="mx-auto h-9 w-9 text-muted-foreground" />
            <h1 className="mt-3 text-lg font-semibold">Profile not found</h1>
            <p className="mt-1 text-sm text-muted-foreground">This trader profile may no longer be available.</p>
          </div>
        ) : (
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex min-w-0 items-center gap-4">
              <SocialAvatar path={profile.avatar_url} name={displayName} className="h-16 w-16 text-lg" />
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold">{displayName}</h1>
                <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>
              </div>
            </div>
            {profile.bio && <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-relaxed">{profile.bio}</p>}
            {profile.country && <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{profile.country}</p>}
            <div className="mt-6 grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
              {profile.trading_style?.length > 0 && <div><h2 className="text-xs font-semibold uppercase text-muted-foreground">Trading style</h2><div className="mt-2 flex flex-wrap gap-2">{profile.trading_style.map((tag) => <span key={tag} className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">{tag}</span>)}</div></div>}
              {profile.experience_level && <div><h2 className="text-xs font-semibold uppercase text-muted-foreground">Experience</h2><p className="mt-2 text-sm capitalize">{profile.experience_level}</p></div>}
              {profile.favorite_pairs?.length > 0 && <div className="sm:col-span-2"><h2 className="text-xs font-semibold uppercase text-muted-foreground">Favorite pairs</h2><div className="mt-2 flex flex-wrap gap-2">{profile.favorite_pairs.map((pair) => <span key={pair} className="rounded-md bg-muted px-3 py-1.5 font-mono text-xs">{pair}</span>)}</div></div>}
            </div>
            <p className="mt-6 flex items-center gap-2 border-t border-border pt-5 text-sm text-muted-foreground"><Newspaper className="h-4 w-4" />Trader on Tradivo</p>
          </section>
        )}
      </div>
    </AppShell>
  );
}