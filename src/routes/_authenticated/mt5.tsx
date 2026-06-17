import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { ProGate } from "@/components/app/pro-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cable, Copy, Plus, Trash2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mt5")({
  head: () => ({ meta: [{ title: "MT5 Integration — Smart Trader Toolkit" }] }),
  component: MT5Page,
});

type TokenRow = {
  id: string;
  token: string;
  label: string | null;
  broker: string | null;
  account_number: string | null;
  last_seen_at: string | null;
  created_at: string;
};

const INGEST_URL = "https://project--5ff05887-f0ab-4a9c-92dd-c62f286e3343.lovable.app/api/public/mt5/ingest";

function genToken() {
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  return "stt_" + Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function MT5Page() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mt5_tokens")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setTokens((data ?? []) as TokenRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createToken = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const token = genToken();
    const { error } = await supabase
      .from("mt5_tokens")
      .insert({ user_id: u.user.id, token, label: label || "MT5 Account" });
    if (error) toast.error(error.message);
    else {
      toast.success("Token created");
      setLabel("");
      load();
    }
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("mt5_tokens").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Token revoked");
      load();
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <AppShell title="MT5 Integration">
      <ProGate feature="MT5 Auto-Journaling" description="Stream every closed deal from your MetaTrader 5 terminal straight into your journal — pair, lots, entry, exit, P&L. No manual entry, ever.">
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15">
                <Cable className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">MetaTrader 5 Auto-Journal</h2>
                <p className="text-sm text-muted-foreground">
                  Closed trades stream from your MT5 terminal into your journal — no manual entry.
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto">Live</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">1 · Create an account token</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="label">Label (e.g. FundedNext 100k)</Label>
                <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="My MT5 Account" />
              </div>
              <Button onClick={createToken}>
                <Plus className="mr-2 h-4 w-4" />Generate token
              </Button>
              <Button variant="outline" size="icon" onClick={load} disabled={loading}>
                <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              </Button>
            </div>

            <div className="space-y-2">
              {tokens.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground">No tokens yet. Generate one to link your terminal.</p>
              )}
              {tokens.map((t) => (
                <div key={t.id} className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/40 p-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t.label ?? "MT5 Account"}</span>
                      {t.last_seen_at ? (
                        <Badge variant="secondary" className="text-[10px]">Synced {new Date(t.last_seen_at).toLocaleString()}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Awaiting first sync</Badge>
                      )}
                    </div>
                    <code className="mt-1 block truncate font-mono text-xs text-muted-foreground">{t.token}</code>
                    {(t.broker || t.account_number) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t.broker} {t.account_number ? `· #${t.account_number}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => copy(t.token)}>
                      <Copy className="mr-2 h-3.5 w-3.5" />Copy
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => revoke(t.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2 · Install the Smart Trader EA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
              <li>In MT5: <span className="text-foreground">Tools → Options → Expert Advisors</span> — enable <em>Allow WebRequest for listed URL</em> and add:
                <code className="mt-1 block rounded bg-muted/40 px-2 py-1 font-mono text-xs text-foreground">https://project--5ff05887-f0ab-4a9c-92dd-c62f286e3343.lovable.app</code>
              </li>
              <li>Attach the <span className="text-foreground">SmartTraderJournal.ex5</span> EA to any chart.</li>
              <li>Paste your token into the EA's <span className="text-foreground">Token</span> input and click OK.</li>
              <li>Every closed deal is posted to your journal within 60 seconds — pair, direction, lots, entry, exit, SL/TP, P&L.</li>
            </ol>

            <div className="rounded-lg border border-border/60 bg-card/40 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Endpoint (configured in the EA)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate font-mono text-xs">{INGEST_URL}</code>
                <Button size="sm" variant="outline" onClick={() => copy(INGEST_URL)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <details className="rounded-lg border border-border/60 bg-card/40 p-3 text-xs">
              <summary className="cursor-pointer font-medium text-foreground">Test sync (curl)</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground">{`curl -X POST ${INGEST_URL} \\
  -H "Content-Type: application/json" \\
  -H "X-MT5-Token: YOUR_TOKEN" \\
  -d '{"account_number":"123456","broker":"FundedNext","trades":[{"ticket":"1001","pair":"EURUSD","direction":"buy","lot_size":0.5,"entry_price":1.085,"exit_price":1.090,"stop_loss":1.082,"take_profit":1.092,"pnl":250,"opened_at":"2026-06-17T10:00:00Z","closed_at":"2026-06-17T13:00:00Z"}]}'`}</pre>
            </details>
          </CardContent>
        </Card>
      </div>
      </ProGate>
    </AppShell>
  );
}