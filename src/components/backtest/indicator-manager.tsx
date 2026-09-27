import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Search, Trash2, Plus } from "lucide-react";
import { INDICATOR_META, type IndicatorConfig, type IndicatorKind } from "@/lib/indicators";

const KINDS = Object.keys(INDICATOR_META) as IndicatorKind[];

export function IndicatorManager({
  open, onOpenChange, indicators, onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  indicators: IndicatorConfig[];
  onChange: (next: IndicatorConfig[]) => void;
}) {
  const [kind, setKind] = useState<IndicatorKind>("ema");
  const [query, setQuery] = useState("");
  const matches = KINDS.filter((item) => INDICATOR_META[item].label.toLowerCase().includes(query.trim().toLowerCase()));

  function add() {
    const meta = INDICATOR_META[kind];
    onChange([
      ...indicators,
      {
        id: Math.random().toString(36).slice(2, 9),
        kind,
        length: meta.defaults.length ?? 14,
        param2: meta.defaults.param2,
        param3: meta.defaults.param3,
        color: meta.defaults.color ?? "#38bdf8",
        visible: true,
      },
    ]);
  }

  function patch(id: string, p: Partial<IndicatorConfig>) {
    onChange(indicators.map((i) => (i.id === id ? { ...i, ...p } : i)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-3 p-4 text-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Indicators &amp; Studies</DialogTitle>
          <DialogDescription>Overlays render on the price pane; oscillators get their own pane below the chart.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 border-b border-border/60 pb-4">
          <Label className="text-xs">Indicator library</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search indicators" className="pl-9" />
          </div>
          <div className="grid max-h-36 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {matches.map((item) => (
              <Button key={item} type="button" variant={kind === item ? "secondary" : "ghost"} className="h-auto justify-between px-3 py-2 text-left" onClick={() => setKind(item)}>
                <span>
                  <span className="block text-xs">{INDICATOR_META[item].label}</span>
                  <span className="block text-[10px] font-normal text-muted-foreground">{INDICATOR_META[item].pane === "sub" ? "Separate pane" : "Price overlay"}</span>
                </span>
                {kind === item ? <Plus className="h-4 w-4" /> : null}
              </Button>
            ))}
          </div>
          <Button onClick={add} className="w-full gap-1"><Plus className="h-4 w-4" /> Add {INDICATOR_META[kind].label}</Button>
        </div>

        <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
          {indicators.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No indicators yet.</p>}
          {indicators.map((i) => (
            <div key={i.id} className="flex flex-wrap items-end gap-2 rounded-md border border-border/60 bg-card/60 p-2">
              <div className="min-w-32 flex-1">
                <p className="text-xs font-medium">{INDICATOR_META[i.kind].label}</p>
                <p className="text-[10px] uppercase text-muted-foreground">{INDICATOR_META[i.kind].pane === "sub" ? "Separate pane" : "Overlay"}</p>
              </div>
              <div className="w-20">
                <Label className="text-[10px]">Length</Label>
                <Input type="number" value={i.length} onChange={(e) => patch(i.id, { length: Math.max(1, Number(e.target.value) || 1) })} className="h-8" />
              </div>
              {i.param2 !== undefined && (
                <div className="w-20">
                  <Label className="text-[10px]">{i.kind === "bb" ? "StdDev" : i.kind === "macd" ? "Slow" : "Smooth"}</Label>
                  <Input type="number" value={i.param2} onChange={(e) => patch(i.id, { param2: Number(e.target.value) || 1 })} className="h-8" />
                </div>
              )}
              {i.param3 !== undefined && (
                <div className="w-20">
                  <Label className="text-[10px]">Signal</Label>
                  <Input type="number" value={i.param3} onChange={(e) => patch(i.id, { param3: Number(e.target.value) || 1 })} className="h-8" />
                </div>
              )}
              <div className="w-14">
                <Label className="text-[10px]">Colour</Label>
                <input type="color" value={i.color} onChange={(e) => patch(i.id, { color: e.target.value })} className="h-8 w-full rounded border border-border bg-transparent" />
              </div>
              <div className="flex items-center gap-2 pb-1">
                <Switch checked={i.visible} onCheckedChange={(v) => patch(i.id, { visible: v })} />
                {i.visible ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onChange(indicators.filter((x) => x.id !== i.id))} aria-label={`Remove ${INDICATOR_META[i.kind].label}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}