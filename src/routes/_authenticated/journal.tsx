import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { formatMoney } from "@/lib/currencies";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Image as ImageIcon, Trash2, TrendingUp, TrendingDown, Trophy, Target, Percent, Loader2, X, ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({ meta: [{ title: "Trade Journal — Smart Trader Toolkit" }] }),
  component: JournalPage,
});

type TradeRow = {
  id: string;
  user_id: string;
  pair: string;
  asset_class: string;
  direction: "long" | "short";
  session: string | null;
  strategy: string | null;
  smc_tags: string[];
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  exit_price: number | null;
  lot_size: number | null;
  risk_amount: number | null;
  risk_pct: number | null;
  rr_planned: number | null;
  rr_realized: number | null;
  pnl: number | null;
  status: "open" | "win" | "loss" | "breakeven";
  notes: string | null;
  screenshot_url: string | null;
  opened_at: string;
  closed_at: string | null;
};

const SMC_TAGS = [
  "Order Block", "Breaker Block", "FVG", "Liquidity Sweep", "BOS", "CHoCH",
  "Mitigation", "Premium", "Discount", "Equal Highs", "Equal Lows", "IFVG",
];
const SESSIONS = ["Sydney", "Tokyo", "London", "New York", "London-NY Overlap"];
const ASSET_CLASSES = ["forex", "gold", "crypto", "indices", "stocks"];

function JournalPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const ccy = profile?.account_currency ?? "USD";
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "win" | "loss" | "breakeven">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("opened_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    setTrades((data ?? []) as TradeRow[]);
  }

  useEffect(() => { if (user) load(); }, [user]);

  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.status !== "open");
    const wins = closed.filter((t) => t.status === "win");
    const losses = closed.filter((t) => t.status === "loss");
    const pnl = closed.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const grossWin = wins.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + (Number(t.pnl) || 0), 0));
    return {
      total: trades.length,
      open: trades.length - closed.length,
      winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
      pnl,
      pf: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
      avgRR: closed.length
        ? closed.reduce((s, t) => s + (Number(t.rr_realized) || 0), 0) / closed.length
        : 0,
    };
  }, [trades]);

  const visible = filter === "all" ? trades : trades.filter((t) => t.status === filter);

  async function remove(id: string) {
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Trade removed");
    setTrades((arr) => arr.filter((t) => t.id !== id));
  }

  return (
    <AppShell title="Trade Journal">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Log every setup. Tag your SMC concepts. Review what works. <span className="ml-1 text-xs">All P&amp;L displayed in <span className="font-medium text-foreground">{ccy}</span>.</span></p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar")}>
            <TabsList>
              <TabsTrigger value="list" className="gap-1.5"><List className="h-3.5 w-3.5" /> List</TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Calendar</TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              <Plus className="mr-1 h-4 w-4" /> New Trade
            </Button>
          </DialogTrigger>
          <TradeDialog
            userId={user?.id}
            onSaved={(t) => { setTrades((arr) => [t, ...arr]); setDialogOpen(false); }}
          />
          </Dialog>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Trades" value={String(stats.total)} sub={`${stats.open} open`} icon={Target} />
        <StatCard label="Win Rate" value={stats.total ? `${stats.winRate.toFixed(1)}%` : "—"} sub="Closed trades" icon={Trophy} />
        <StatCard label="Net P&L" value={formatMoney(stats.pnl, ccy)} sub="All closed" icon={stats.pnl >= 0 ? TrendingUp : TrendingDown} accent={stats.pnl >= 0 ? "text-success" : "text-destructive"} />
        <StatCard label="Profit Factor" value={isFinite(stats.pf) ? stats.pf.toFixed(2) : "∞"} sub="Gross win / loss" icon={Percent} />
        <StatCard label="Avg RR" value={stats.avgRR ? stats.avgRR.toFixed(2) : "—"} sub="Realized" icon={Target} />
      </div>

      {view === "list" ? (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {(["all", "open", "win", "loss", "breakeven"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
                {f}
              </Button>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : visible.length === 0 ? (
              <Card className="border-dashed border-border/60 bg-card/40">
                <CardContent className="grid place-items-center py-12 text-center text-sm text-muted-foreground">
                  <p>No trades {filter !== "all" ? `in "${filter}"` : "yet"}.</p>
                  <p className="text-xs">Click "New Trade" to log your first setup.</p>
                </CardContent>
              </Card>
            ) : (
              visible.map((t) => <TradeCard key={t.id} trade={t} onDelete={remove} ccy={ccy} />)
            )}
          </div>
        </>
      ) : (
        <TradingCalendar trades={trades} ccy={ccy} />
      )}
    </AppShell>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent = "text-foreground" }: { label: string; value: string; sub: string; icon: React.ComponentType<{ className?: string }>; accent?: string }) {
  return (
    <Card className="border-border/60 bg-card shadow-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function TradeCard({ trade, onDelete, ccy }: { trade: TradeRow; onDelete: (id: string) => void; ccy: string }) {
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!trade.screenshot_url) return;
    supabase.storage.from("trade-screenshots").createSignedUrl(trade.screenshot_url, 3600)
      .then(({ data }) => setShotUrl(data?.signedUrl ?? null));
  }, [trade.screenshot_url]);

  const statusColor = {
    win: "border-success/40 bg-success/10 text-success",
    loss: "border-destructive/40 bg-destructive/10 text-destructive",
    breakeven: "border-muted-foreground/40 bg-muted text-muted-foreground",
    open: "border-accent/40 bg-accent/10 text-accent",
  }[trade.status];

  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row">
        {shotUrl ? (
          <a href={shotUrl} target="_blank" rel="noreferrer" className="block shrink-0">
            <img src={shotUrl} alt={`${trade.pair} chart`} className="h-24 w-32 rounded-md border border-border/60 object-cover" />
          </a>
        ) : (
          <div className="grid h-24 w-32 shrink-0 place-items-center rounded-md border border-dashed border-border/60 text-muted-foreground">
            <ImageIcon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{trade.pair}</h3>
            <Badge variant="outline" className={trade.direction === "long" ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive"}>
              {trade.direction.toUpperCase()}
            </Badge>
            <Badge variant="outline" className={statusColor + " capitalize"}>{trade.status}</Badge>
            {trade.session && <Badge variant="outline">{trade.session}</Badge>}
            {trade.strategy && <Badge variant="outline">{trade.strategy}</Badge>}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
            <span>Entry: <span className="text-foreground">{fmtNum(trade.entry_price)}</span></span>
            <span>SL: <span className="text-foreground">{fmtNum(trade.stop_loss)}</span></span>
            <span>TP: <span className="text-foreground">{fmtNum(trade.take_profit)}</span></span>
            <span>Lots: <span className="text-foreground">{fmtNum(trade.lot_size)}</span></span>
            <span>RR plan: <span className="text-foreground">{fmtNum(trade.rr_planned)}</span></span>
            <span>RR real: <span className="text-foreground">{fmtNum(trade.rr_realized)}</span></span>
            <span>Risk: <span className="text-foreground">{trade.risk_pct ? `${trade.risk_pct}%` : "—"}</span></span>
            <span>P&L: <span className={Number(trade.pnl) >= 0 ? "text-success" : "text-destructive"}>{trade.pnl != null ? formatMoney(Number(trade.pnl), ccy) : "—"}</span></span>
          </div>
          {trade.smc_tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {trade.smc_tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
              ))}
            </div>
          )}
          {trade.notes && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{trade.notes}</p>}
          <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">{new Date(trade.opened_at).toLocaleString()}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onDelete(trade.id)} aria-label="Delete">
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      </CardContent>
    </Card>
  );
}

function TradeDialog({ userId, onSaved }: { userId: string | undefined; onSaved: (t: TradeRow) => void }) {
  const [form, setForm] = useState({
    pair: "EURUSD",
    asset_class: "forex",
    direction: "long" as "long" | "short",
    session: "London",
    strategy: "",
    entry_price: "",
    stop_loss: "",
    take_profit: "",
    exit_price: "",
    lot_size: "",
    risk_pct: "1",
    risk_amount: "",
    pnl: "",
    status: "open" as TradeRow["status"],
    notes: "",
  });
  const [tags, setTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function toggleTag(tag: string) {
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  }

  const rrPlanned = useMemo(() => {
    const e = Number(form.entry_price), s = Number(form.stop_loss), t = Number(form.take_profit);
    if (!e || !s || !t) return null;
    const r = Math.abs(e - s); const rw = Math.abs(t - e);
    return r > 0 ? rw / r : null;
  }, [form.entry_price, form.stop_loss, form.take_profit]);

  const rrRealized = useMemo(() => {
    const e = Number(form.entry_price), s = Number(form.stop_loss), x = Number(form.exit_price);
    if (!e || !s || !x) return null;
    const r = Math.abs(e - s); const moved = form.direction === "long" ? x - e : e - x;
    return r > 0 ? moved / r : null;
  }, [form.entry_price, form.stop_loss, form.exit_price, form.direction]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return toast.error("Not signed in");
    if (!form.pair.trim()) return toast.error("Pair is required");
    setSaving(true);
    try {
      let screenshotPath: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "png";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("trade-screenshots").upload(path, file, { upsert: false });
        if (up.error) throw up.error;
        screenshotPath = path;
      }
      const payload = {
        user_id: userId,
        pair: form.pair.trim().toUpperCase(),
        asset_class: form.asset_class,
        direction: form.direction,
        session: form.session || null,
        strategy: form.strategy || null,
        smc_tags: tags,
        entry_price: numOrNull(form.entry_price),
        stop_loss: numOrNull(form.stop_loss),
        take_profit: numOrNull(form.take_profit),
        exit_price: numOrNull(form.exit_price),
        lot_size: numOrNull(form.lot_size),
        risk_pct: numOrNull(form.risk_pct),
        risk_amount: numOrNull(form.risk_amount),
        rr_planned: rrPlanned,
        rr_realized: rrRealized,
        pnl: numOrNull(form.pnl),
        status: form.status,
        notes: form.notes || null,
        screenshot_url: screenshotPath,
        closed_at: form.status === "open" ? null : new Date().toISOString(),
      };
      const { data, error } = await supabase.from("trades").insert(payload).select("*").single();
      if (error) throw error;
      toast.success("Trade saved");
      onSaved(data as TradeRow);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save trade");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>New Trade</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Pair / Symbol"><Input value={form.pair} onChange={(e) => set("pair", e.target.value)} placeholder="EURUSD" /></Field>
          <Field label="Asset Class">
            <Select value={form.asset_class} onValueChange={(v) => set("asset_class", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ASSET_CLASSES.map((a) => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Direction">
            <Select value={form.direction} onValueChange={(v) => set("direction", v as "long" | "short")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="long">Long</SelectItem><SelectItem value="short">Short</SelectItem></SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Session">
            <Select value={form.session} onValueChange={(v) => set("session", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SESSIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Strategy"><Input value={form.strategy} onChange={(e) => set("strategy", e.target.value)} placeholder="e.g. SMC OB retest" /></Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => set("status", v as TradeRow["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="win">Win</SelectItem>
                <SelectItem value="loss">Loss</SelectItem>
                <SelectItem value="breakeven">Breakeven</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Entry"><Input type="number" step="any" value={form.entry_price} onChange={(e) => set("entry_price", e.target.value)} /></Field>
          <Field label="Stop Loss"><Input type="number" step="any" value={form.stop_loss} onChange={(e) => set("stop_loss", e.target.value)} /></Field>
          <Field label="Take Profit"><Input type="number" step="any" value={form.take_profit} onChange={(e) => set("take_profit", e.target.value)} /></Field>
          <Field label="Exit"><Input type="number" step="any" value={form.exit_price} onChange={(e) => set("exit_price", e.target.value)} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Lot Size"><Input type="number" step="any" value={form.lot_size} onChange={(e) => set("lot_size", e.target.value)} /></Field>
          <Field label="Risk %"><Input type="number" step="any" value={form.risk_pct} onChange={(e) => set("risk_pct", e.target.value)} /></Field>
          <Field label="Risk $"><Input type="number" step="any" value={form.risk_amount} onChange={(e) => set("risk_amount", e.target.value)} /></Field>
          <Field label="P&L $"><Input type="number" step="any" value={form.pnl} onChange={(e) => set("pnl", e.target.value)} /></Field>
        </div>

        <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          Auto-calculated · Planned RR: <span className="text-foreground">{rrPlanned ? rrPlanned.toFixed(2) : "—"}</span> · Realized RR: <span className="text-foreground">{rrRealized ? rrRealized.toFixed(2) : "—"}</span>
        </div>

        <div>
          <Label className="text-xs">SMC Tags</Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SMC_TAGS.map((tag) => {
              const on = tags.includes(tag);
              return (
                <button type="button" key={tag} onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${on ? "border-primary bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40"}`}>
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Notes">
          <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="What was your thesis? What did you learn?" />
        </Field>

        <div>
          <Label className="text-xs">Chart Screenshot</Label>
          <div className="mt-2 flex items-center gap-3">
            <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && (
              <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)} aria-label="Clear">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={saving} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Trade
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function numOrNull(v: string): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}
function fmtNum(v: number | null) { return v == null ? "—" : String(v); }
function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function TradingCalendar({ trades, ccy }: { trades: TradeRow[]; ccy: string }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const { byDay, monthStats } = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number; wins: number; losses: number }>();
    const inMonth = trades.filter((t) => {
      const ts = new Date(t.closed_at ?? t.opened_at);
      return ts.getFullYear() === cursor.getFullYear() && ts.getMonth() === cursor.getMonth() && t.status !== "open";
    });
    inMonth.forEach((t) => {
      const d = new Date(t.closed_at ?? t.opened_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const e = map.get(k) ?? { pnl: 0, count: 0, wins: 0, losses: 0 };
      e.pnl += Number(t.pnl) || 0;
      e.count += 1;
      if (t.status === "win") e.wins += 1;
      else if (t.status === "loss") e.losses += 1;
      map.set(k, e);
    });
    const totalPnl = inMonth.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const wins = inMonth.filter((t) => t.status === "win").length;
    const losses = inMonth.filter((t) => t.status === "loss").length;
    const grossWin = inMonth.filter((t) => (Number(t.pnl) || 0) > 0).reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const grossLoss = Math.abs(inMonth.filter((t) => (Number(t.pnl) || 0) < 0).reduce((s, t) => s + (Number(t.pnl) || 0), 0));
    return {
      byDay: map,
      monthStats: {
        pnl: totalPnl,
        total: inMonth.length,
        winRate: wins + losses ? (wins / (wins + losses)) * 100 : 0,
        pf: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
      },
    };
  }, [trades, cursor]);

  // Build calendar grid (Sun-first)
  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const leading = firstDay.getDay();
  const cells: ({ day: number; key: string } | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, key });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const today = new Date();
  const isToday = (key: string) => key === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="mt-6 space-y-4">
      <Card className="border-border/60 bg-card">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <p className="min-w-[160px] text-center text-sm font-semibold">{monthLabel}</p>
              <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Today</Button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className={monthStats.pnl >= 0 ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive"}>
                Net: {formatMoney(monthStats.pnl, ccy)}
              </Badge>
              <Badge variant="outline">{monthStats.total} trades</Badge>
              <Badge variant="outline">Win {monthStats.winRate.toFixed(0)}%</Badge>
              <Badge variant="outline">PF {isFinite(monthStats.pf) ? monthStats.pf.toFixed(2) : "∞"}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (!c) return <div key={i} className="aspect-square rounded-md bg-transparent" />;
              const day = byDay.get(c.key);
              const positive = day && day.pnl > 0;
              const negative = day && day.pnl < 0;
              return (
                <div key={c.key} className={cn(
                  "aspect-square rounded-md border p-1.5 text-left text-[10px] transition",
                  "border-border/40 bg-card/40",
                  positive && "border-success/40 bg-success/10",
                  negative && "border-destructive/40 bg-destructive/10",
                  isToday(c.key) && "ring-1 ring-primary",
                )}>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className={cn("text-xs font-semibold", isToday(c.key) && "text-primary")}>{c.day}</span>
                    {day && <span className="text-[9px]">{day.count}T</span>}
                  </div>
                  {day && (
                    <div className={cn(
                      "mt-1 truncate text-[11px] font-semibold tabular-nums",
                      positive ? "text-success" : negative ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {positive ? "+" : ""}{formatMoney(day.pnl, ccy)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// classNames util (local)
function cn(...a: (string | false | null | undefined)[]) { return a.filter(Boolean).join(" "); }