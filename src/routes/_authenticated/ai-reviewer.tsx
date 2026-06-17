import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app/app-shell";
import { ProGate } from "@/components/app/pro-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { reviewTrade } from "@/lib/ai.functions";
import { Brain, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ai-reviewer")({
  head: () => ({ meta: [{ title: "AI Trade Reviewer — Smart Trader Toolkit" }] }),
  component: ReviewerPage,
});

function ReviewerPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [review, setReview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const run = useServerFn(reviewTrade);

  useEffect(() => {
    if (!user) return;
    supabase.from("trades").select("*").eq("user_id", user.id).order("opened_at", { ascending: false }).limit(50).then(({ data }) => setTrades(data ?? []));
  }, [user]);

  async function go() {
    const trade = trades.find((t) => t.id === selected);
    if (!trade) return toast.error("Pick a trade first");
    setLoading(true);
    setReview("");
    try {
      const r = await run({ data: { trade } });
      setReview(r.content);
    } catch (e: any) {
      toast.error(e.message ?? "Review failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="AI Trade Reviewer">
      <ProGate feature="AI Trade Reviewer" description="Get an elite coach review of every trade — entry quality, structure, risk discipline, exit timing. Unlimited reviews on Pro.">
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="h-4 w-4 text-primary" /> Get an elite coach review of any trade in your journal.
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="sm:w-[420px]"><SelectValue placeholder="Select a trade…" /></SelectTrigger>
                <SelectContent>
                  {trades.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.pair} · {t.direction.toUpperCase()} · {t.status} · {new Date(t.opened_at).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={go} disabled={loading || !selected}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reviewing…</> : "Review trade"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {review && (
          <Card>
            <CardContent className="prose prose-invert max-w-none p-6 text-sm">
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{review}</pre>
            </CardContent>
          </Card>
        )}
      </div>
      </ProGate>
    </AppShell>
  );
}