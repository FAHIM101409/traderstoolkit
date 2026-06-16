import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cable } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mt5")({
  head: () => ({ meta: [{ title: "MT5 Integration — Smart Trader Toolkit" }] }),
  component: MT5Page,
});

function MT5Page() {
  return (
    <AppShell title="MT5 Integration">
      <Card>
        <CardContent className="space-y-4 p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15"><Cable className="h-5 w-5 text-primary" /></div>
            <div>
              <h2 className="text-lg font-semibold">MetaTrader 5 Sync</h2>
              <p className="text-sm text-muted-foreground">Auto-import your closed trades from MT5 into your journal.</p>
            </div>
            <Badge variant="secondary" className="ml-auto">Beta · Coming Soon</Badge>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-5 text-sm leading-relaxed">
            <p className="font-medium">How it will work</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Install the Smart Trader EA on your MT5 terminal.</li>
              <li>Paste your account API token below to link the terminal.</li>
              <li>Closed trades sync to your journal every 60 seconds — pair, lots, entry/SL/TP, P&L, screenshots.</li>
              <li>Use AI Reviewer + Analytics on real broker data.</li>
            </ol>
          </div>

          <p className="text-xs text-muted-foreground">We're polishing the EA installer. Join the waitlist from your settings to get early access.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}