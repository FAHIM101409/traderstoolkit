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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Sparkles, CalendarClock, AlertTriangle, Info } from "lucide-react";
import { getEconomicCalendar, type CalendarEvent } from "@/lib/news.functions";
import { analyzeNewsImpact } from "@/lib/ai.functions";
import { TIMEZONES } from "@/lib/timezones";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/_authenticated/news")({
  head: () => ({ meta: [{ title: "Economic Calendar — Tradivo" }] }),
  component: NewsLab,
});

type RangeKey = "today" | "upcoming" | "past";

function num(v: string | null): number | null {
  if (!v) return null;
  const m = v.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  let n = parseFloat(m[0]);
  const u = v.trim().slice(-1).toUpperCase();
  if (u === "K") n *= 1e3; else if (u === "M") n *= 1e6; else if (u === "B") n *= 1e9; else if (u === "T") n *= 1e12;
  return n;
}
const LOWER_IS_BETTER = /unemployment|jobless|claims|claimant/i;
function actualTone(e: CalendarEvent): string {
  const a = num(e.actual), f = num(e.forecast ?? e.previous);
  if (a === null || f === null || a === f) return "";
  const better = LOWER_IS_BETTER.test(e.title) ? a < f : a > f;
  return better ? "text-success" : "text-danger";
}
function isNow(e: CalendarEvent, now: number) {
  const t = Date.parse(e.timeUtc);
  return e.hasTime && now >= t - 10 * 60000 && now <= t + 30 * 60000;
}

// Compact reference for common events. Anything not listed falls back to a
// generic message; the AI dialog gives full analysis.
const EVENT_META: Record<string, { why: string; markets: string; volatility: "High" | "Medium" | "Low"; historical: string }> = {
  cpi: { why: "Consumer price inflation drives central-bank rate expectations, which move currencies, bonds and gold.", markets: "USD pairs, XAUUSD, US indices, BTCUSD", volatility: "High", historical: "Surprises frequently move DXY 40-80 pips and Gold $10-$30 in minutes." },
  "core cpi": { why: "Core CPI strips food & energy and is the Fed's preferred inflation signal.", markets: "DXY, EURUSD, XAUUSD, USDJPY", volatility: "High", historical: "Hotter print usually strengthens USD and pressures gold; softer print does the opposite." },
  nfp: { why: "Non-Farm Payrolls headline the US jobs report and set the risk tone for the month.", markets: "All USD pairs, XAUUSD, US500, BTCUSD", volatility: "High", historical: "Miss/beat > 50k typically triggers 60-120 pip DXY moves and $20+ moves on gold." },
  "non-farm employment change": { why: "The headline US jobs number that anchors monthly Fed expectations.", markets: "All USD pairs, XAUUSD, US indices", volatility: "High", historical: "Miss/beat > 50k typically triggers 60-120 pip DXY moves and $20+ moves on gold." },
  ppi: { why: "Producer prices lead consumer inflation by 1-2 months.", markets: "DXY, XAUUSD, US10Y yield", volatility: "Medium", historical: "Second-tier: only really moves markets on large surprises." },
  "unemployment rate": { why: "Weakness feeds Fed easing bets; strength pushes the opposite.", markets: "USD pairs, XAUUSD", volatility: "Medium", historical: "Directional confirmation of the NFP print." },
  gdp: { why: "Growth rate — the ultimate lagging indicator of the economy.", markets: "Domestic-currency pairs, indices", volatility: "Medium", historical: "Meaningful moves only on ±0.3% surprises." },
  "retail sales": { why: "Consumer spending pulse — feeds into GDP nowcasts.", markets: "USD pairs, XAUUSD", volatility: "Medium", historical: "Strong beat/miss can move DXY 30-60 pips." },
  fomc: { why: "Fed rate decisions & Powell's presser reset the entire rate curve.", markets: "Everything USD, gold, equities, crypto", volatility: "High", historical: "Sub-day ranges often exceed weekly averages. Trade with reduced size." },
  "federal funds rate": { why: "Fed policy rate — the anchor of global USD funding.", markets: "Everything USD, gold, equities, crypto", volatility: "High", historical: "Even a hold can whip 100+ pips on DXY via the dot plot." },
  "ecb press conference": { why: "Lagarde's guidance often moves EUR more than the rate print itself.", markets: "EURUSD, EURGBP, EURJPY, DAX", volatility: "High", historical: "EURUSD moves 60-150 pips during the presser." },
  "boe monetary policy report": { why: "BoE's growth & inflation outlook drives GBP curve pricing.", markets: "GBPUSD, EURGBP, FTSE", volatility: "High", historical: "Cable moves 80-150 pips on hawkish/dovish surprises." },
  pmi: { why: "Purchasing Managers' surveys lead GDP by 1-2 quarters.", markets: "Domestic currency, indices", volatility: "Medium", historical: "The 50 line matters — crosses trigger the biggest reactions." },
};

function eventMeta(title: string) {
  const k = title.toLowerCase();
  for (const [key, val] of Object.entries(EVENT_META)) {
    if (k.includes(key)) return val;
  }
  return {
    why: "Second-tier release. Watch for outsized surprises versus forecast.",
    markets: "Primarily affects the event's currency and related crosses.",
    volatility: "Low" as const,
    historical: "Typically limited market impact; may compound with other data.",
  };
}

function fmtWhen(iso: string, tz: string): { date: string; time: string } {
  const d = new Date(iso);
  const useZone = tz === "local" ? undefined : tz;
  try {
    const date = new Intl.DateTimeFormat("en-GB", { timeZone: useZone, weekday: "short", month: "short", day: "2-digit" }).format(d);
    const time = new Intl.DateTimeFormat("en-GB", { timeZone: useZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
    return { date, time };
  } catch {
    return { date: d.toDateString(), time: d.toTimeString().slice(0, 5) };
  }
}

function NewsLab() {
  const { profile } = useProfile();
  const [range, setRange] = useState<RangeKey>("today");
  const [tz, setTz] = useState<string>("local");
  const [impacts, setImpacts] = useState<Set<string>>(new Set(["high", "medium", "low", "holiday"]));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);
  const [currency, setCurrency] = useState<string>("all");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const getCal = useServerFn(getEconomicCalendar);
  const analyze = useServerFn(analyzeNewsImpact);

  useEffect(() => {
    if (profile?.timezone) setTz(profile.timezone);
  }, [profile?.timezone]);

  async function load(r: RangeKey = range) {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getCal({ data: { range: r } });
      setEvents(res.events ?? []);
      setTotalLoaded(res.totalLoaded ?? (res.events?.length ?? 0));
      if (res.error) setLoadError(res.error);
      console.log("[NewsLab] load", { range: r, returned: res.events?.length ?? 0, totalLoaded: res.totalLoaded, error: res.error });
    } catch (e: any) {
      const msg = e?.message ?? "Failed to load calendar";
      setLoadError(msg);
      setEvents([]);
      console.error("[NewsLab] load failed", e);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(range); /* eslint-disable-next-line */ }, [range]);
  useEffect(() => {
    const id = setInterval(() => load(range), 60 * 1000);
    const onFocus = () => load(range);
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
    // eslint-disable-next-line
  }, [range]);

  const filtered = useMemo(() => {
    const out = events.filter((e) => {
      if (!impacts.has(e.impact)) return false;
      if (currency !== "all" && e.currency !== currency) return false;
      // For "today" tab, narrow to the user's selected timezone day
      if (range === "today") {
        try {
          const zone = tz === "local" ? undefined : tz;
          const d = new Date(e.timeUtc);
          const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
          const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
          if (dayKey !== todayKey) return false;
        } catch { /* ignore */ }
      }
      return true;
    });
    return out;
  }, [events, impacts, currency, range, tz]);

  const currencies = useMemo(() => Array.from(new Set(events.map((e) => e.currency).filter(Boolean))).sort(), [events]);
  const highHits = useMemo(() => filtered.filter((e) => e.impact === "high").slice(0, 8), [filtered]);

  async function runAnalysis(ev: CalendarEvent) {
    setAnalyzing(true);
    setAnalysis("");
    try {
      const r = await analyze({ data: { event: { event: ev.title, currency: ev.currency, forecast: ev.forecast, previous: ev.previous, actual: ev.actual, timeUtc: ev.timeUtc } } });
      setAnalysis(r.content);
    } catch (e: any) {
      toast.error(e.message ?? "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <AppShell title="Economic Calendar">
      <p className="mb-6 text-sm text-muted-foreground">Live economic calendar — refreshed every minute, times shown in your timezone. Events happening now are highlighted.</p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={tz} onValueChange={setTz}>
            <SelectTrigger className="h-9 w-[190px]"><SelectValue placeholder="Timezone" /></SelectTrigger>
            <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t.id} value={t.ianaOrOffset}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex items-center gap-1" aria-label="Impact filter">
            {(["high", "medium", "low"] as const).map((k) => {
              const on = impacts.has(k);
              return (
                <Button key={k} size="sm" variant={on ? "secondary" : "outline"} className="h-9 gap-1.5 px-2.5 text-xs capitalize" aria-pressed={on}
                  onClick={() => setImpacts((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; })}>
                  <ImpactDot impact={k} /> {k}
                </Button>
              );
            })}
          </div>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All currencies</SelectItem>
              {currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => load(range)} disabled={loading} className="gap-1">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 bg-card">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Economic Calendar</h3>
              <Badge variant="outline" className="ml-auto text-[10px]">{filtered.length} events</Badge>
            </div>
            {loading && filtered.length === 0 ? (
              <div className="grid h-48 place-items-center text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading calendar…</div>
            ) : filtered.length === 0 ? (
              <div className="grid h-48 place-items-center gap-3 text-sm text-muted-foreground">
                {loadError || totalLoaded === 0 ? (
                  <>
                    <div className="text-center">
                      <p className="font-medium text-foreground">Unable to load economic calendar.</p>
                      <p className="mt-1 text-xs">{loadError ?? "The provider returned no data."}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => load(range)} disabled={loading} className="gap-1">
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Retry
                    </Button>
                  </>
                ) : (
                  <div className="text-center">
                    <p>No matching events for the current filters.</p>
                    <p className="mt-1 text-xs">{totalLoaded} events loaded — try widening impact / currency filters.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Impact</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Forecast</TableHead>
                      <TableHead className="text-right">Previous</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((e) => {
                      const w = fmtWhen(e.timeUtc, tz);
                      const live = isNow(e, now);
                      const isPast = Date.parse(e.timeUtc) < now;
                      return (
                        <TableRow key={e.id} className={live ? "bg-primary/10 ring-1 ring-inset ring-primary/40" : isPast ? "opacity-80" : ""}>
                          <TableCell className="whitespace-nowrap text-xs"><div className="text-muted-foreground">{w.date}</div><div className="font-medium">{e.hasTime ? w.time : "All day"}</div>{live && <Badge className="mt-1 h-4 px-1.5 text-[9px]">NOW</Badge>}</TableCell>
                          <TableCell><Badge variant="outline">{e.currency}</Badge></TableCell>
                          <TableCell><ImpactBadge impact={e.impact} /></TableCell>
                          <TableCell className="font-medium">{e.title}</TableCell>
                          <TableCell className={`text-right font-semibold tabular-nums ${actualTone(e)}`}>{e.actual ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{e.forecast ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{e.previous ?? "—"}</TableCell>
                          <TableCell><Button size="sm" variant="ghost" onClick={() => { setSelected(e); setAnalysis(""); }}>Details</Button></TableCell>
                        </TableRow>
                      );
                    })}
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
              <h3 className="font-semibold">High Impact Feed</h3>
            </div>
            {highHits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No red-folder events in range.</p>
            ) : (
              <ul className="space-y-3">
                {highHits.map((e) => {
                  const w = fmtWhen(e.timeUtc, tz);
                  return (
                    <li key={e.id} className="rounded-md border border-danger/20 bg-card/60 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-danger">{e.currency} · {e.title}</span>
                        <span className="text-xs text-muted-foreground">{e.hasTime ? w.time : "All day"}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{w.date} · Forecast {e.forecast ?? "—"} · Prev {e.previous ?? "—"}</p>
                      <Button size="sm" variant="ghost" className="mt-2 h-7 gap-1 px-2 text-xs" onClick={() => { setSelected(e); setAnalysis(""); }}>
                        <Sparkles className="h-3 w-3" /> Analyze Impact
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setAnalysis(""); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{selected?.title}</DialogTitle></DialogHeader>
          {selected && (() => {
            const meta = eventMeta(selected.title);
            const w = fmtWhen(selected.timeUtc, tz);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <Stat label="Currency" value={selected.currency} />
                  <Stat label="Impact" value={selected.impact.toUpperCase()} />
                  <Stat label="When" value={`${w.date} ${selected.hasTime ? w.time : ""}`} />
                  <Stat label="Actual" value={selected.actual ?? "—"} />
                  <Stat label="Forecast" value={selected.forecast ?? "—"} />
                  <Stat label="Previous" value={selected.previous ?? "—"} />
                  <Stat label="Volatility" value={meta.volatility} />
                </div>
                <div className="rounded-md border border-border/60 bg-card/40 p-3 text-sm">
                  <div className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 text-primary shrink-0" /><div>
                    <p className="font-medium">Why it matters</p>
                    <p className="text-muted-foreground">{meta.why}</p>
                    <p className="mt-2 font-medium">Markets typically affected</p>
                    <p className="text-muted-foreground">{meta.markets}</p>
                    <p className="mt-2 font-medium">Historical impact</p>
                    <p className="text-muted-foreground">{meta.historical}</p>
                  </div></div>
                </div>
                <Button onClick={() => runAnalysis(selected)} disabled={analyzing} className="w-full gap-2">
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Analyze Market Impact with AI
                </Button>
                {analysis && (
                  <div className="max-h-[400px] overflow-y-auto whitespace-pre-wrap rounded-md border border-border/60 bg-background/40 p-4 text-sm">{analysis}</div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ImpactDot({ impact }: { impact: CalendarEvent["impact"] }) {
  const c = impact === "high" ? "bg-danger" : impact === "medium" ? "bg-impact-medium" : impact === "low" ? "bg-impact-low" : "bg-muted-foreground";
  return <span className={`inline-block h-2.5 w-2.5 rounded-sm ${c}`} />;
}

function ImpactBadge({ impact }: { impact: CalendarEvent["impact"] }) {
  if (impact === "high") return <Badge className="gap-1 bg-danger/20 text-danger hover:bg-danger/20"><ImpactDot impact={impact} />High</Badge>;
  if (impact === "medium") return <Badge className="gap-1 bg-impact-medium/20 text-impact-medium hover:bg-impact-medium/20"><ImpactDot impact={impact} />Medium</Badge>;
  if (impact === "holiday") return <Badge variant="outline">Holiday</Badge>;
  return <Badge className="gap-1 bg-impact-low/15 text-impact-low hover:bg-impact-low/15"><ImpactDot impact={impact} />Low</Badge>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}