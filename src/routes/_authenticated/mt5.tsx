import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { ProGate } from "@/components/app/pro-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cable, ChevronsUpDown, Check, RefreshCw, ShieldCheck, Unplug, Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MT5_BROKERS } from "@/lib/mt5-brokers";
import { connectMt5, disconnectMt5, syncMt5, updateMt5Settings } from "@/lib/mt5.functions";

export const Route = createFileRoute("/_authenticated/mt5")({
  head: () => ({ meta: [{ title: "MT5 Integration — Traders Toolkit" }] }),
  component: MT5Page,
});

type Mt5Row = {
  id: string; name: string | null; broker: string; server: string; login: string;
  metaapi_account_id: string | null; status: string;
  balance: number | null; equity: number | null; margin: number | null; free_margin: number | null;
  margin_level: number | null; currency: string | null; leverage: number | null;
  sync_frequency_minutes: number; last_sync_at: string | null; last_error: string | null;
  created_at: string;
};

function MT5Page() {
  return (
    <AppShell title="MT5 Integration">
      <ProGate feature="MT5 Auto-Sync" description="Connect your MT5 account with your investor (read-only) password and stream live balance, equity, and trade history into your dashboard and journal.">
        <MT5Inner />
      </ProGate>
    </AppShell>
  );
}

function MT5Inner() {
  const [account, setAccount] = useState<Mt5Row | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("mt5_accounts").select("*").maybeSingle();
    setAccount((data as Mt5Row) ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Auto-sync polling based on saved frequency.
  useEffect(() => {
    if (!account || account.sync_frequency_minutes <= 0) return;
    const ms = account.sync_frequency_minutes * 60 * 1000;
    const id = setInterval(() => { runSync(true); }, ms);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.sync_frequency_minutes, account?.id]);

  const syncFn = useServerFn(syncMt5);
  const settingsFn = useServerFn(updateMt5Settings);
  const disconnectFn = useServerFn(disconnectMt5);
  const [syncing, setSyncing] = useState(false);

  async function runSync(silent = false) {
    if (!account) return;
    setSyncing(true);
    try {
      const r = await syncFn();
      if (!silent) toast.success(`Synced · ${r.imported} trades imported/updated`);
      load();
    } catch (e) {
      if (!silent) toast.error((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  async function changeFreq(v: string) {
    if (!account) return;
    const n = +v;
    await settingsFn({ data: { sync_frequency_minutes: n } });
    toast.success(n === 0 ? "Manual sync only" : `Auto-sync every ${n} min`);
    load();
  }

  async function doDisconnect() {
    if (!confirm("Disconnect MT5? All synced trades will be removed.")) return;
    await disconnectFn();
    toast.success("MT5 disconnected");
    load();
  }

  if (loading) return <div className="grid h-40 place-items-center text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  if (!account) return <ConnectForm onConnected={load} />;

  const fmt = (n: number | null) => n == null ? "—" : new Intl.NumberFormat(undefined, { style: "currency", currency: account.currency || "USD", maximumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-6">
      <Card className="border-success/30 bg-gradient-to-br from-success/10 via-card to-card">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-success/15 text-success">
              <span className="text-2xl">🟢</span>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">MT5 Connected</h2>
                <Badge variant="outline" className="border-success/40 bg-success/10 text-success">{account.status}</Badge>
                {account.last_error && <Badge variant="destructive" className="text-[10px]">Last sync failed</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {account.broker} · <span className="font-mono">#{account.login}</span> · {account.server}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Last sync: {account.last_sync_at ? new Date(account.last_sync_at).toLocaleString() : "never"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => runSync(false)} disabled={syncing} className="gap-2">
                <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />{syncing ? "Syncing…" : "Sync now"}
              </Button>
              <Button variant="outline" onClick={doDisconnect} className="gap-2"><Unplug className="h-4 w-4" />Disconnect</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {account.last_error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-sm">
            <p className="font-medium text-destructive">Last sync error</p>
            <p className="mt-1 text-muted-foreground">{account.last_error}</p>
            <p className="mt-2 text-xs text-muted-foreground">Account may still be provisioning (takes up to 60s after first connect). Retry "Sync now" in a moment.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Balance" value={fmt(account.balance)} />
        <Stat label="Equity" value={fmt(account.equity)} />
        <Stat label="Free Margin" value={fmt(account.free_margin)} />
        <Stat label="Used Margin" value={fmt(account.margin)} />
        <Stat label="Currency" value={account.currency || "—"} />
        <Stat label="Leverage" value={account.leverage ? `1:${account.leverage}` : "—"} />
        <Stat label="Margin Level" value={account.margin_level ? `${account.margin_level.toFixed(2)}%` : "—"} />
        <Stat label="Account #" value={`#${account.login}`} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Auto-Sync</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Label className="sm:w-40">Sync Frequency</Label>
            <Select value={String(account.sync_frequency_minutes)} onValueChange={changeFreq}>
              <SelectTrigger className="sm:max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Manual only</SelectItem>
                <SelectItem value="5">Every 5 minutes</SelectItem>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
                <SelectItem value="60">Hourly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">Auto-sync runs while this page is open. The dashboard and journal also pull the latest snapshot whenever they load.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border/60"><CardContent className="p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
    </CardContent></Card>
  );
}

function ConnectForm({ onConnected }: { onConnected: () => void }) {
  const [broker, setBroker] = useState("");
  const [brokerOpen, setBrokerOpen] = useState(false);
  const [server, setServer] = useState("");
  const [serverOpen, setServerOpen] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const connectFn = useServerFn(connectMt5);
  const formRef = useRef<HTMLFormElement>(null);

  const serverOptions = useMemo(() => {
    const b = MT5_BROKERS.find((x) => x.name === broker);
    return b?.servers ?? [];
  }, [broker]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!broker || !server || !login || !password) {
      toast.error("Please fill all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      await connectFn({ data: { broker, server, login, investorPassword: password, name } });
      toast.success("Connecting… your MT5 account is being provisioned.");
      setPassword("");
      onConnected();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
        <CardContent className="flex items-start gap-3 p-5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary"><Cable className="h-5 w-5" /></div>
          <div>
            <p className="font-semibold">Connect MT5 with Investor Password</p>
            <p className="mt-1 text-sm text-muted-foreground">Read-only access — Traders Toolkit can sync your balance, equity, and trade history. It can never place or modify trades.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">MT5 Account Details</CardTitle></CardHeader>
        <CardContent>
          <form ref={formRef} className="space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label>Broker</Label>
              <Popover open={brokerOpen} onOpenChange={setBrokerOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {broker || "Select your broker"}
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search brokers (FTMO, IC Markets, Exness…)" />
                    <CommandList>
                      <CommandEmpty>No broker found. Type your own below.</CommandEmpty>
                      <CommandGroup>
                        {MT5_BROKERS.map((b) => (
                          <CommandItem key={b.name} value={b.name} onSelect={() => { setBroker(b.name); setServer(""); setBrokerOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", broker === b.name ? "opacity-100" : "opacity-0")} />
                            {b.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Input placeholder="…or type a custom broker name" value={broker} onChange={(e) => setBroker(e.target.value)} className="mt-2" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="login">MT5 Account Number</Label>
                <Input id="login" inputMode="numeric" placeholder="e.g. 12345678" value={login} onChange={(e) => setLogin(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div className="space-y-1.5">
                <Label>MT5 Server</Label>
                <Popover open={serverOpen} onOpenChange={setServerOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
                      {server || "Select or type your server"}
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search servers…" />
                      <CommandList>
                        <CommandEmpty>No match. Type the exact server name from MT5.</CommandEmpty>
                        <CommandGroup>
                          {serverOptions.map((s) => (
                            <CommandItem key={s} value={s} onSelect={() => { setServer(s); setServerOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", server === s ? "opacity-100" : "opacity-0")} />
                              <span className="font-mono text-xs">{s}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Input placeholder="…or type your exact server" value={server} onChange={(e) => setServer(e.target.value)} className="mt-2 font-mono text-xs" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pwd">Investor Password (read-only)</Label>
              <div className="relative">
                <Input id="pwd" type={showPwd ? "text" : "password"} placeholder="Your MT5 investor password" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" autoComplete="new-password" />
                <Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPwd((v) => !v)} tabIndex={-1}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-success" />
                Investor Password gives read-only access and cannot execute trades. Never enter your master/trading password.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nm">Nickname (optional)</Label>
              <Input id="nm" placeholder="e.g. FTMO 100k Challenge" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <Button type="submit" disabled={submitting} className="w-full gap-2" size="lg">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cable className="h-4 w-4" />}
              {submitting ? "Connecting…" : "Connect MT5"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}