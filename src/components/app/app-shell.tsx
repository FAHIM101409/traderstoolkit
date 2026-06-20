import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Calculator, Shield, Building2, Clock, LineChart, LogOut, BookOpen, Brain, BarChart3, Newspaper, Sparkles, FlaskConical, Activity, Cable, Settings as SettingsIcon, Play, CalendarClock, Lock, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useIsAdmin } from "@/hooks/use-admin";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UpgradeDialog } from "./upgrade-dialog";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { section: "Calculators" as const },
  { to: "/lot-size", label: "Lot Size", icon: Calculator },
  { to: "/risk", label: "Risk Manager", icon: Shield },
  { to: "/prop-firm", label: "Prop Firm", icon: Building2 },
  { to: "/sessions", label: "Sessions", icon: Clock },
  { section: "Journal" as const },
  { to: "/journal", label: "Trade Journal", icon: BookOpen },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { section: "AI Tools" as const },
  { to: "/ai-reviewer", label: "AI Reviewer", icon: Brain, pro: true },
  { to: "/fundamentals", label: "Fundamentals Bot", icon: Newspaper },
  { to: "/patterns", label: "Pattern Detection", icon: Sparkles, pro: true },
  { section: "Labs" as const },
  { to: "/backtest", label: "Backtesting Lab", icon: FlaskConical },
  { to: "/replay", label: "Backtesting Station", icon: Play },
  { to: "/news", label: "News Lab", icon: CalendarClock },
  { to: "/simulator", label: "Prop Simulator", icon: Activity },
  { to: "/mt5", label: "MT5 Integration", icon: Cable, pro: true },
];

export function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { isPro } = useProfile();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <Link to="/dashboard" className="flex items-center gap-2 border-b border-sidebar-border px-5 py-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary shadow-glow">
            <LineChart className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Smart Trader</span>
        </Link>
        <nav className="flex-1 space-y-1 p-3 text-sm">
          {nav.map((item: any, i) => {
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
                  <item.icon className="h-4 w-4" /> {item.label}
                </span>
              );
            }
            return (
              <Link key={item.to} to={item.to} className={cls}>
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.pro && !isPro && <Lock className="h-3 w-3 text-muted-foreground/70" />}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          {!isPro && (
            <UpgradeDialog>
              <button className="mb-3 flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-accent px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-90">
                <Sparkles className="h-3.5 w-3.5" />
                Upgrade to Pro · $29/mo
              </button>
            </UpgradeDialog>
          )}
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
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{user?.email ?? "Trader"}</p>
              <p className="text-xs text-muted-foreground">{isPro ? "Pro plan" : "Free plan"}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur-xl">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        </header>
        <div className="container mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  );
}
