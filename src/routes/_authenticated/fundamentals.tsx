import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatFundamentals } from "@/lib/ai.functions";
import { Loader2, Send, Newspaper, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { UpgradeDialog } from "@/components/app/upgrade-dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/fundamentals")({
  head: () => ({ meta: [{ title: "Fundamental Bot — Smart Trader Toolkit" }] }),
  component: FundPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What's the macro bias for gold this week?",
  "Explain the impact of a hawkish Fed on DXY and EURUSD.",
  "Why did BTC pump on the latest CPI print?",
  "Summarize this week's high-impact events.",
];

function FundPage() {
  const { isPro } = useProfile();
  const FREE_LIMIT = 5;
  const todayKey = `fund-used-${new Date().toISOString().slice(0, 10)}`;
  const [used, setUsed] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(window.localStorage.getItem(todayKey) ?? "0", 10);
  });
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chat = useServerFn(chatFundamentals);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    if (!isPro && used >= FREE_LIMIT) {
      setUpgradeOpen(true);
      return;
    }
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const r = await chat({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: r.content }]);
      if (!isPro) {
        const n = used + 1;
        setUsed(n);
        window.localStorage.setItem(todayKey, String(n));
      }
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e: any) {
      toast.error(e.message ?? "Chat failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Fundamental Analysis Bot">
      <div className="space-y-4">
        {!isPro && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-xs">
            <span className="text-muted-foreground">Free plan · <span className="font-medium text-foreground">{Math.max(0, FREE_LIMIT - used)}</span> of {FREE_LIMIT} daily queries remaining</span>
            <button onClick={() => setUpgradeOpen(true)} className="flex items-center gap-1 font-semibold text-primary hover:underline">
              <Sparkles className="h-3 w-3" /> Upgrade for unlimited
            </button>
          </div>
        )}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Newspaper className="h-4 w-4 text-primary" /> Ask about macro, news events, central banks, or market structure.
              {isPro && <Badge variant="outline" className="ml-auto border-primary/40 text-primary">Pro · unlimited</Badge>}
            </div>
            <div className="h-[460px] space-y-4 overflow-y-auto rounded-md border border-border/60 bg-background/40 p-4">
              {messages.length === 0 && (
                <div className="space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="block w-full rounded-md border border-border/60 bg-card/40 px-3 py-2 text-left text-sm hover:bg-card/60">{s}</button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border/60"}`}>{m.content}</div>
                </div>
              ))}
              {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Thinking…</div>}
              <div ref={endRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-3 flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about EURUSD, gold, Fed, NFP…" />
              <Button type="submit" disabled={loading}><Send className="h-4 w-4" /></Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </AppShell>
  );
}