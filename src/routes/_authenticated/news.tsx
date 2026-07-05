import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, Sparkles, CalendarClock, AlertTriangle } from "lucide-react";
import { getEconomicCalendar, analyzeNewsImpact } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/news")({
  head: () => ({ meta: [{ title: "News Lab — Traders Toolkit" }] }),
  component: NewsLab,
});

type CalEvent = {
  date: string;
  time: string;
  currency: string;
  event: string;
  impact: "high" | "medium" | "low";
  forecast: string | null;
  previous: string | null;
  actual: string | null;
};

function NewsLab() {
  const [range, setRange] = useState<"today" | "week">("today");
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CalEvent | null>(null);
  const [analysis, setAnalysis] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const getCal = useServerFn(getEconomicCalendar);
  const analyze = useServerFn(analyzeNewsImpact);

  async function load(r: "today" | "week" = range) {
    setLoading(true);
    try {
      const res = await getCal({ data: { range: r } });
      setEvents((res as { events: CalEvent[] }).events ?? []);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load("today"); /* eslint-disable-next-line */ }, []);
  // Auto-refresh every 5 minutes so forecasts/actuals stay current
  useEffect(() => {
    const id = setInterval(() => load(range), 5 * 60 * 1000);
    const onFocus = () => load(range);
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
    // eslint-disable-next-line
  }, [range]);

  async function runAnalysis(ev: CalEvent) {
    setAnalyzing(true);
    setAnalysis("");
    try {
      const r = await analyze({ data: { event: { event: ev.event, currency: ev.currency, forecast: ev.forecast, previous: ev.previous, actual: ev.actual } } });
      setAnalysis(r.content);
    } catch (e: any) {
      toast.error(e.message ?? "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  const highToday = useMemo(() => events.filter((e) => e.impact === "high"), [events]);

  return (
    <AppShell title="News Lab">
      <p className="mb-6 text-sm text-muted-foreground">Live economic calendar, red-folder events, and AI market-impact analysis — all inside Traders Toolkit.</p>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 bg-card">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Economic Calendar</h3>
              </div>
              <div className="flex items-center gap-2">
                <Tabs value={range} onValueChange={(v) => { setRange(v as "today" | "week"); load(v as "today" | "week"); }}>
                  <TabsList>
                    <TabsTrigger value="today">Today</TabsTrigger>
                    <TabsTrigger value="week">This Week</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button size="sm" variant="outline" onClick={() => load()} disabled={loading} className="gap-1">
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
                </Button>
              </div>
            </div>

            {loading && events.length === 0 ? (
              <div className="grid h-48 place-items-center text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading calendar…</div>
            ) : events.length === 0 ? (
              <div className="grid h-48 place-items-center text-sm text-muted-foreground">No events. Try refreshing.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Ccy</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Impact</TableHead>
                      <TableHead className="text-right">Forecast</TableHead>
                      <TableHead className="text-right">Previous</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((e, i) => (
                      <TableRow key={i} className={e.impact === "high" ? "bg-danger/5" : ""}>
                        <TableCell className="whitespace-nowrap text-xs"><div>{e.date}</div><div className="text-muted-foreground">{e.time}</div></TableCell>
                        <TableCell><Badge variant="outline">{e.currency}</Badge></TableCell>
                        <TableCell className="font-medium">{e.event}</TableCell>
                        <TableCell><ImpactBadge impact={e.impact} /></TableCell>
                        <TableCell className="text-right tabular-nums">{e.forecast ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{e.previous ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{e.actual ?? "—"}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={() => { setSelected(e); setAnalysis(""); }}>Details</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-danger/30 bg-gradient-to-br from-danger/10 via-card to-card">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-danger" />
              <h3 className="font-semibold">High Impact {range === "today" ? "Today" : "This Week"}</h3>
            </div>
            {highToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">No red-folder events.</p>
            ) : (
              <ul className="space-y-3">
                {highToday.map((e, i) => (
                  <li key={i} className="rounded-md border border-danger/20 bg-card/60 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-danger">{e.currency} · {e.event}</span>
                      <span className="text-xs text-muted-foreground">{e.time}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{e.date} · Forecast {e.forecast ?? "—"} · Prev {e.previous ?? "—"}</p>
                    <Button size="sm" variant="ghost" className="mt-2 h-7 gap-1 px-2 text-xs" onClick={() => { setSelected(e); setAnalysis(""); }}>
                      <Sparkles className="h-3 w-3" /> Analyze Impact
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setAnalysis(""); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{selected?.event}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <Stat label="Currency" value={selected.currency} />
                <Stat label="Impact" value={selected.impact.toUpperCase()} />
                <Stat label="When" value={`${selected.date} ${selected.time}`} />
                <Stat label="Forecast" value={selected.forecast ?? "—"} />
                <Stat label="Previous" value={selected.previous ?? "—"} />
                <Stat label="Actual" value={selected.actual ?? "Not released"} />
              </div>
              <Button onClick={() => runAnalysis(selected)} disabled={analyzing} className="w-full gap-2">
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Analyze Market Impact
              </Button>
              {analysis && (
                <div className="max-h-[400px] overflow-y-auto whitespace-pre-wrap rounded-md border border-border/60 bg-background/40 p-4 text-sm">{analysis}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ImpactBadge({ impact }: { impact: "high" | "medium" | "low" }) {
  if (impact === "high") return <Badge className="bg-danger/20 text-danger hover:bg-danger/20">High</Badge>;
  if (impact === "medium") return <Badge className="bg-accent/20 text-accent hover:bg-accent/20">Medium</Badge>;
  return <Badge variant="outline">Low</Badge>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}