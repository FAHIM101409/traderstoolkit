import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Cable, ShieldCheck, RefreshCw, LineChart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mt5")({
  head: () => ({ meta: [{ title: "MT5 Integration — Tradivo" }] }),
  component: MT5Page,
});

function MT5Page() {
  return (
    <AppShell title="MT5 Integration">
      <div className="mx-auto flex max-w-xl flex-col items-center pt-8 text-center md:pt-16">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
          <Lock className="h-7 w-7 text-primary-foreground" />
        </div>
        <span className="mt-4 inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pro · Coming soon
        </span>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">MT5 Integration is coming soon</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Connect your MetaTrader 5 account with a read-only investor password and stream live
          balance, equity, and trade history straight into your dashboard and journal. This is a
          Pro feature and is not available yet.
        </p>

        <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
          {[
            { icon: Cable, t: "One-click connect", d: "Account number, server, investor password — no EA needed." },
            { icon: RefreshCw, t: "Auto-sync", d: "Trades import into your journal automatically." },
            { icon: LineChart, t: "Live metrics", d: "Balance, equity, margin and floating P&L on your dashboard." },
          ].map((f) => (
            <Card key={f.t} className="border-border/60">
              <CardContent className="flex flex-col items-center gap-2 p-4">
                <f.icon className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium">{f.t}</p>
                <p className="text-xs text-muted-foreground">{f.d}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button disabled className="mt-8 gap-2" size="lg">
          <ShieldCheck className="h-4 w-4" />
          Connect MT5 account
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          You'll be able to connect as soon as this feature launches.
        </p>
      </div>
    </AppShell>
  );
}
