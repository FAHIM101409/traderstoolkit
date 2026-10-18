import { useState, useEffect } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Calculator, Building2, Clock, LineChart, LogOut, BookOpen, Brain, BarChart3, Newspaper, Sparkles, FlaskConical, Cable, Settings as SettingsIcon, Play, CalendarClock, Lock, KeyRound, Menu, X, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useIsAdmin } from "@/hooks/use-admin";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { UpgradeDialog } from "./upgrade-dialog";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { section: "Calculators" as const },
  { to: "/lot-size", label: "Lot Size", icon: Calculator },
  { to: "/prop-firm", label: "Prop Firm", icon: Building2, hidden: true },
  { to: "/sessions", label: "Sessions", icon: Clock },
  { section: "Journal" as const },
  { to: "/journal", label: "Trade Journal", icon: BookOpen },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { section: "AI Tools" as const },
  { to: "/ai-reviewer", label: "AI Reviewer", icon: Brain, pro: true, hidden: true },
  { to: "/fundamentals", label: "Fundamentals Bot", icon: Newspaper, hidden: true },
  { to: "/patterns", label: "Pattern Detection", icon: Sparkles, pro: true, hidden: true },
  { section: "Labs" as const },
  { to: "/backtest", label: "Backtesting Lab", icon: FlaskConical, hidden: true },
  { to: "/replay", label: "Backtesting Station", icon: Play, hidden: true },
  { to: "/news", label: "Economic Calendar", icon: CalendarClock },
  { to: "/mt5", label: "MT5 Integration", icon: Cable, pro: true, comingSoon: true },
];

// Items flagged `hidden` keep their routes, pages and code — they just stay out of the sidebar.
const visibleNav = nav.filter((item: any) => !item.hidden);
// Drop a section heading when nothing visible sits under it.
const shownNav = visibleNav.filter((item: any, i: number) => {
  if (!("section" in item)) return true;
  const next = visibleNav[i + 1];
  return Boolean(next) && !("section" in next);
});

export function AppShell({ children, title, fullBleed = false }: { children: React.ReactNode; title: string; fullBleed?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { isPro } = useProfile();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const renderNavItems = () => (
    <>
      {shownNav.map((item: any, i) => {
        if ("section" in item) {
          return <p key={`s-${i}`} className="mt-4 px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.section}</p>;
        }
        const cls = cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground/80 transition",
          pathname === item.to && "bg-sidebar-accent text-sidebar-accent-foreground",
          !item.disabled && "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          item.disabled && "opacity-40 cursor-not-allowed",
        );
        if (item.disabled) {
          return (
            <span key={`d-${i}`} className={cls} aria-disabled="true">
              <item.icon className="h-4 w-4 shrink-0" /> {item.label}
            </span>
          );
        }
        return (
          <Link key={item.to} to={item.to} className={cls}>
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{item.label}</span>
            {item.pro && !isPro && <Lock className="h-3 w-3 text-muted-foreground/70 shrink-0" />}
          </Link>
        );
      })}
    </>
  );

  const renderFooter = (variant: "desktop" | "mobile") => (
    <div className={cn("border-t border-sidebar-border p-3", variant === "mobile" && "bg-sidebar")}>
      {!isPro && (
        <UpgradeDialog>
          <button className="mb-3 flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-accent px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-90">
            <Sparkles className="h-3.5 w-3.5" />
            Upgrade to Pro · $29/mo
          </button>
        </UpgradeDialog>
      )}
      <Link
        to="/pricing"
        className={cn(
          "mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          pathname === "/pricing" && "bg-sidebar-accent text-sidebar-accent-foreground",
        )}
      >
        <CreditCard className="h-3.5 w-3.5" /> Subscription
      </Link>
      <Link
        to="/settings"
        className={cn(
          "mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          pathname === "/settings" && "bg-sidebar-accent text-sidebar-accent-foreground",
        )}
      >
        <SettingsIcon className="h-3.5 w-3.5" /> Settings
      </Link>
      {isAdmin && (
        <Link
          to="/admin-codes"
          className={cn(
            "mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            pathname === "/admin-codes" && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <KeyRound className="h-3.5 w-3.5" /> Founder Codes
        </Link>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{user?.email ?? "Trader"}</p>
          <p className="text-xs text-muted-foreground">{isPro ? "Pro plan" : "Free plan"}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" className="shrink-0">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <Link to="/dashboard" className="flex items-center gap-2 border-b border-sidebar-border px-5 py-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary shadow-glow">
            <LineChart className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Tradivo</span>
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3 text-sm">{renderNavItems()}</nav>
        {renderFooter("desktop")}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl md:px-6 md:py-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden shrink-0" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-sm border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
                  <Link to="/dashboard" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary shadow-glow">
                      <LineChart className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="text-sm font-semibold tracking-tight">Tradivo</span>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user?.email ?? "Trader"}</p>
                    <span className={cn(
                      "mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      isPro ? "bg-gradient-to-r from-primary to-accent text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}>{isPro ? "Pro" : "Free"}</span>
                  </div>
                </div>
                <nav className="flex-1 space-y-1 overflow-y-auto p-3 text-sm">{renderNavItems()}</nav>
                {renderFooter("mobile")}
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight md:text-xl">{title}</h1>
        </header>
        {fullBleed ? (
          <div className="w-full flex-1 min-h-0">{children}</div>
        ) : (
          <div className="container mx-auto w-full max-w-6xl p-4 md:p-6">{children}</div>
        )}
      </main>
    </div>
  );
}
