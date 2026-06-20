import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, KeyRound, ShieldCheck, Ban, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-codes")({
  head: () => ({ meta: [{ title: "Founder Access Codes — Smart Trader Toolkit" }] }),
  component: AdminCodesPage,
});

type Redemption = { user_id: string; display_name: string | null; redeemed_at: string; expires_at: string };
type Row = {
  id: string; code: string; duration_days: number; max_uses: number | null; uses_count: number;
  revoked: boolean; note: string | null; created_at: string; redemptions: Redemption[];
};

function genCode(prefix = "STK") {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${prefix}-${out}`;
}

function AdminCodesPage() {
  const { isAdmin, loading } = useIsAdmin();
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const [code, setCode] = useState(genCode());
  const [duration, setDuration] = useState("30");
  const [usage, setUsage] = useState<"single" | "multi">("single");
  const [maxUses, setMaxUses] = useState("10");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  async function refresh() {
    setLoadingRows(true);
    const { data, error } = await supabase.rpc("admin_list_codes");
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setLoadingRows(false);
  }

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  async function claimAdmin() {
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_first_admin");
    setClaiming(false);
    if (error) return toast.error(error.message);
    const res = data as { status: string; message: string };
    if (res.status === "success") { toast.success(res.message); window.location.reload(); }
    else toast.error(res.message);
  }

  async function createCode() {
    if (!code.trim()) return toast.error("Enter a code");
    setCreating(true);
    const { error } = await supabase.from("access_codes").insert({
      code: code.trim().toUpperCase(),
      duration_days: Number(duration),
      max_uses: usage === "single" ? 1 : (maxUses ? Number(maxUses) : null),
      note: note || null,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success(`Code ${code} created`);
    setCode(genCode());
    setNote("");
    refresh();
  }

  async function toggleRevoke(row: Row) {
    const { error } = await supabase.from("access_codes").update({ revoked: !row.revoked }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(row.revoked ? "Code reactivated" : "Code revoked");
    refresh();
  }

  function copy(text: string) { navigator.clipboard.writeText(text); toast.success("Copied"); }

  function status(row: Row): { label: string; tone: "active" | "used" | "revoked" } {
    if (row.revoked) return { label: "Revoked", tone: "revoked" };
    if (row.max_uses !== null && row.uses_count >= row.max_uses) return { label: "Used", tone: "used" };
    return { label: "Active", tone: "active" };
  }

  if (loading) return <AppShell title="Founder Access Codes"><p className="text-muted-foreground">Loading…</p></AppShell>;

  if (!isAdmin) {
    return (
      <AppShell title="Founder Access Codes">
        <Card><CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary"><ShieldCheck className="h-6 w-6" /></div>
          <div>
            <h2 className="text-xl font-semibold">Admin only</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">This area is reserved for the platform owner. If you're the founder and no admin exists yet, you can claim ownership.</p>
          </div>
          <Button onClick={claimAdmin} disabled={claiming}>Claim founder access</Button>
        </CardContent></Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Founder Access Codes">
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15"><KeyRound className="h-5 w-5 text-primary" /></div>
              <div><h2 className="font-semibold">Generate a new code</h2><p className="text-sm text-muted-foreground">Grant temporary Pro access without payment.</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Code</Label>
                <div className="flex gap-2">
                  <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono" />
                  <Button type="button" variant="outline" onClick={() => setCode(genCode())} title="Regenerate"><RotateCcw className="h-4 w-4" /></Button>
                </div>
              </div>
              <div>
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="14">14 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="60">60 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Usage limit</Label>
                <Select value={usage} onValueChange={(v) => setUsage(v as "single" | "multi")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Use</SelectItem>
                    <SelectItem value="multi">Multi Use</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {usage === "multi" && (
                <div>
                  <Label>Max uses (blank = unlimited)</Label>
                  <Input type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
                </div>
              )}
              <div className="sm:col-span-2">
                <Label>Note (optional)</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Beta tester — @username" />
              </div>
            </div>
            <Button onClick={createCode} disabled={creating}>Create code</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="border-b border-border/60 p-4">
              <h2 className="font-semibold">All codes</h2>
              <p className="text-sm text-muted-foreground">Track redemptions, expirations and revoke unused codes.</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Redeemed by</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRows && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
                {!loadingRows && rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No codes yet.</TableCell></TableRow>}
                {rows.map((r) => {
                  const s = status(r);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono font-medium">{r.code}{r.note && <span className="ml-2 text-xs text-muted-foreground">· {r.note}</span>}</TableCell>
                      <TableCell>{r.duration_days}d</TableCell>
                      <TableCell>{r.uses_count}{r.max_uses !== null ? ` / ${r.max_uses}` : ""}</TableCell>
                      <TableCell>
                        <Badge variant={s.tone === "active" ? "default" : "outline"} className={s.tone === "active" ? "bg-primary text-primary-foreground" : ""}>{s.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {r.redemptions.length === 0 ? <span className="text-muted-foreground">—</span> : (
                          <div className="space-y-1">
                            {r.redemptions.map((red, i) => (
                              <div key={i} className="text-xs">
                                <span className="font-medium">{red.display_name ?? red.user_id.slice(0, 8)}</span>
                                <span className="text-muted-foreground"> · {new Date(red.redeemed_at).toLocaleDateString()} → expires {new Date(red.expires_at).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => copy(r.code)}><Copy className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleRevoke(r)} title={r.revoked ? "Reactivate" : "Revoke"}><Ban className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
