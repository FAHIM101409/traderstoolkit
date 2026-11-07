import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Sparkles, Users, MessageCircle, UserCircle, Hourglass, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import { Feed } from "@/components/social/feed";

export const Route = createFileRoute("/_authenticated/social")({
  head: () => ({
    meta: [
      { title: "Social — Tradivo" },
      { name: "description", content: "Discover trader profiles and posts in the Tradivo Social hub." },
      { property: "og:title", content: "Social — Tradivo" },
      { property: "og:description", content: "Discover trader profiles and posts in the Tradivo Social hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SocialPage,
});

const TABS = [
  {
    id: "feed",
    label: "Feed",
    icon: Newspaper,
    title: "Feed",
    blurb: "A personalized feed of trades, ideas and milestones from traders you follow.",
  },
  {
    id: "communities",
    label: "Communities",
    icon: Users,
    title: "Communities",
    blurb: "Join groups built around strategies like SMC, ICT, scalping and swing trading.",
  },
  {
    id: "chat",
    label: "Chat",
    icon: MessageCircle,
    title: "Chat",
    blurb: "Direct messages and group chats with your trading circle.",
  },
  {
    id: "profile",
    label: "Profile",
    icon: UserCircle,
    title: "Your Profile",
    blurb: "Your public trader profile — trading style, favorite pairs, experience level and more.",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

function SocialPage() {
  const [tab, setTab] = useState<TabId>("feed");
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const ActiveIcon = active.icon;
  const { profile } = useProfile();

  return (
    <AppShell title="Social">
      <div className="space-y-6">
        {/* Tab bar — horizontally scrollable on narrow screens */}
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <div className="flex w-max min-w-full gap-1 border-b border-border">
            {TABS.map((t) => {
              const Icon = t.icon;
              const selected = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-md px-4 py-2.5 text-sm font-medium transition",
                    selected
                      ? "border-b-2 border-primary bg-primary/10 text-primary"
                      : "border-b-2 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                  aria-current={selected ? "page" : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {tab === "feed" ? (
          <Feed profile={profile} />
        ) : (
          /* Coming-soon placeholder for the remaining tabs */
          <div className="flex min-h-[380px] items-center justify-center">
            <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 shadow-glow">
                <ActiveIcon className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">{active.title}</h2>
              <p className="text-sm text-muted-foreground">{active.blurb}</p>
              <div className="mt-2 flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Hourglass className="h-3.5 w-3.5" />
                Coming soon
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
