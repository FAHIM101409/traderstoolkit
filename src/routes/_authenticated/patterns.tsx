import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app/app-shell";
import { ProGate } from "@/components/app/pro-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { detectPattern } from "@/lib/ai.functions";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/patterns")({
  head: () => ({ meta: [{ title: "Pattern Detection — Tradivo" }] }),
  component: PatternsPage,
});

function PatternsPage() {
  const [ctx, setCtx] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const detect = useServerFn(detectPattern);

  async function go() {
    if (!ctx.trim()) return;
    setLoading(true);
    setOut("");
    try {
      const r = await detect({ data: { context: ctx } });
      setOut(r.content);
    } catch (e: any) {
      toast.error(e.message ?? "Detection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="SMC Pattern Detection">
      <ProGate feature="SMC Pattern Detection" description="AI-powered detection of Break of Structure, FVGs, order blocks, liquidity sweeps and entry models from any chart context.">
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Describe the price action — pair, timeframe, structure, key candles.
            </div>
            <Textarea rows={6} value={ctx} onChange={(e) => setCtx(e.target.value)} placeholder="E.g. EURUSD 15m swept asian high at 1.0890, dropped sharply through 1.0865 leaving a 5-pip FVG, currently retracing back into the imbalance…" />
            <Button onClick={go} disabled={loading || !ctx.trim()}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</> : "Detect patterns"}
            </Button>
          </CardContent>
        </Card>
        {out && (
          <Card>
            <CardContent className="p-6">
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{out}</pre>
            </CardContent>
          </Card>
        )}
      </div>
      </ProGate>
    </AppShell>
  );
}