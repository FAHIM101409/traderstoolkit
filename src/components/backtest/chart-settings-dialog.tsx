import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_CHART_SETTINGS, type ChartSettings, type ChartStyle } from "./chart-types";
import { Button } from "@/components/ui/button";

const STYLES: { value: ChartStyle; label: string }[] = [
  { value: "candles", label: "Candles" },
  { value: "bars", label: "Bars (OHLC)" },
  { value: "heikin", label: "Heikin Ashi" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
];

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs">{label}</Label>
      <input type="color" value={value.startsWith("#") ? value : "#0b0b12"} onChange={(e) => onChange(e.target.value)} className="h-7 w-12 rounded border border-border bg-transparent" />
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function ChartSettingsDialog({
  open, onOpenChange, settings, onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  settings: ChartSettings;
  onChange: (next: ChartSettings) => void;
}) {
  const set = (p: Partial<ChartSettings>) => onChange({ ...settings, ...p });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Chart settings</DialogTitle>
          <DialogDescription>Appearance applies to every chart in this workspace and is saved with the session.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-3 rounded-md border border-border/60 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Appearance</p>
            <div>
              <Label className="text-xs">Chart type</Label>
              <Select value={settings.style} onValueChange={(v) => set({ style: v as ChartStyle })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <ColorRow label="Bullish body" value={settings.upColor} onChange={(v) => set({ upColor: v, wickUp: v })} />
            <ColorRow label="Bearish body" value={settings.downColor} onChange={(v) => set({ downColor: v, wickDown: v })} />
            <ColorRow label="Background" value={settings.background} onChange={(v) => set({ background: v })} />
            <ColorRow label="Axis text" value={settings.textColor} onChange={(v) => set({ textColor: v })} />
          </div>
          <div className="space-y-3 rounded-md border border-border/60 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Display</p>
            <ToggleRow label="Grid lines" checked={settings.showGrid} onChange={(v) => set({ showGrid: v })} />
            <ToggleRow label="Volume" checked={settings.showVolume} onChange={(v) => set({ showVolume: v })} />
            <ToggleRow label="Crosshair" checked={settings.showCrosshair} onChange={(v) => set({ showCrosshair: v })} />
            <ToggleRow label="Logarithmic scale" checked={settings.logScale} onChange={(v) => set({ logScale: v })} />
            <ToggleRow label="Symbol watermark" checked={settings.showWatermark} onChange={(v) => set({ showWatermark: v })} />
            <div>
              <Label className="text-xs">Right margin ({settings.rightOffset} bars)</Label>
              <Slider value={[settings.rightOffset]} min={0} max={60} step={1} onValueChange={(values) => set({ rightOffset: values[0] ?? settings.rightOffset })} />
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => onChange({ ...DEFAULT_CHART_SETTINGS })}>Reset to defaults</Button>
      </DialogContent>
    </Dialog>
  );
}