import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/lib/currencies";
import { TIMEZONES } from "@/lib/timezones";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Cable, Check, ChevronsUpDown, KeyRound, Sparkles, User } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Tradivo" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const { profile, refresh, isPro } = useProfile();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("UTC");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{ tone: "success" | "error"; message: string; expires?: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.display_name ?? "");
      setCurrency(profile.account_currency);
      setTimezone(profile.timezone);
    }
  }, [profile]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: name,
      account_currency: currency,
      timezone,
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Settings saved"); refresh(); }
  }

  async function changePassword() {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setPw(""); }
  }

  async function redeem() {
    if (!redeemCode.trim()) return;
    setRedeeming(true);
    setRedeemResult(null);
    const { data, error } = await supabase.rpc("redeem_access_code", { p_code: redeemCode.trim() });
    setRedeeming(false);
    if (error) { setRedeemResult({ tone: "error", message: error.message }); return; }
    const res = data as { status: string; message: string; expires_at?: string };
    if (res.status === "success") {
      setRedeemResult({ tone: "success", message: res.message, expires: res.expires_at });
      setRedeemCode("");
      refresh();
    } else {
      setRedeemResult({ tone: "error", message: res.message });
    }
  }

  const selectedCcy = CURRENCIES.find((c) => c.code === currency);

  return (
    <AppShell title="Settings">
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card><CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15"><User className="h-5 w-5 text-primary" /></div>
              <div><h2 className="font-semibold">Account profile</h2><p className="text-sm text-muted-foreground">How you show up across Tradivo.</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Username</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>
              <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
            </div>
            <Button onClick={saveProfile} disabled={saving}>Save profile</Button>
          </CardContent></Card>

          <Card><CardContent className="space-y-4 p-6">
            <h3 className="font-semibold">Change password</h3>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div><Label>New password</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" /></div>
              <Button variant="outline" onClick={changePassword} disabled={!pw}>Update password</Button>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="subscription">
          <Card><CardContent className="space-y-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">Current plan</h2>
                <p className="text-sm text-muted-foreground">Manage your Tradivo subscription.</p>
              </div>
              <Badge className={isPro ? "bg-primary text-primary-foreground" : ""} variant={isPro ? "default" : "outline"}>
                {isPro ? "Pro" : "Free"}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat l="Plan" v={isPro ? "Pro — $29/mo" : "Free"} />
              <Stat l="Status" v={profile?.plan_status ?? "active"} />
              <Stat l="Renews" v={profile?.plan_renewal_at ? new Date(profile.plan_renewal_at).toLocaleDateString() : "—"} />
            </div>
            {!isPro ? (
              <Button asChild className="gap-2"><Link to="/pricing"><Sparkles className="h-4 w-4" /> Upgrade to Pro</Link></Button>
            ) : (
              <Button variant="outline" onClick={() => toast.info("Cancel flow coming soon")}>Cancel subscription</Button>
            )}
          </CardContent></Card>

          <Card><CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15"><KeyRound className="h-5 w-5 text-primary" /></div>
              <div><h2 className="font-semibold">Redeem Access Code</h2><p className="text-sm text-muted-foreground">Have a founder code? Activate Pro instantly.</p></div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={redeemCode} onChange={(e) => setRedeemCode(e.target.value.toUpperCase())} placeholder="STK-XXXXXX" className="font-mono uppercase" />
              <Button onClick={redeem} disabled={redeeming || !redeemCode.trim()}>Redeem</Button>
            </div>
            {redeemResult && (
              <div className={cn("rounded-md border p-3 text-sm", redeemResult.tone === "success" ? "border-primary/40 bg-primary/10 text-primary-foreground" : "border-destructive/40 bg-destructive/10 text-destructive")}>
                <p className="font-medium">{redeemResult.message}</p>
                {redeemResult.expires && <p className="mt-1 text-xs opacity-80">Expires: {new Date(redeemResult.expires).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card><CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15"><Cable className="h-5 w-5 text-primary" /></div>
              <div className="flex-1"><h2 className="font-semibold">MetaTrader 5</h2><p className="text-sm text-muted-foreground">Stream closed trades from MT5 into your journal.</p></div>
              <Button asChild variant="outline"><Link to="/mt5">Manage</Link></Button>
            </div>
            <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
              cTrader, NinjaTrader, TradingView — coming soon.
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card><CardContent className="space-y-4 p-6">
            <h2 className="font-semibold">Preferences</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Account currency</Label>
                <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      {selectedCcy ? `${selectedCcy.code} — ${selectedCcy.name}` : "Select currency"}
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search by name or code…" />
                      <CommandList>
                        <CommandEmpty>No match.</CommandEmpty>
                        <CommandGroup>
                          {CURRENCIES.map((c) => (
                            <CommandItem key={c.code} value={`${c.code} ${c.name}`} onSelect={() => { setCurrency(c.code); setCurrencyOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", currency === c.code ? "opacity-100" : "opacity-0")} />
                              <span className="font-medium">{c.code}</span><span className="ml-2 text-muted-foreground">{c.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((t) => <SelectItem key={t.id} value={t.ianaOrOffset}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">Dark mode is locked in for the trading aesthetic — light mode coming soon.</p>
              </div>
            </div>
            <Button onClick={saveProfile} disabled={saving}>Save preferences</Button>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return <div className="rounded-md border border-border/60 bg-card/40 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p><p className="mt-1 text-sm font-semibold capitalize">{v}</p></div>;
}
