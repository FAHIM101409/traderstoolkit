import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIMEZONES, getZonedHM } from "@/lib/timezones";
import { useProfile } from "@/hooks/use-profile";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sessions")({
  head: () => ({ meta: [{ title: "Trading Sessions — Traders Toolkit" }] }),
  component: SessionsPage,
});

const SESSIONS = [
  { name: "Sydney",   open: 22, close: 7,  color: "from-secondary/40 to-secondary/10" },
  { name: "Tokyo",    open: 0,  close: 9,  color: "from-accent/40 to-accent/10" },
  { name: "London",   open: 7,  close: 16, color: "from-primary/40 to-primary/10" },
  { name: "New York", open: 12, close: 21, color: "from-danger/40 to-danger/10" },
];

function isOpen(open: number, close: number, hour: number) {
  return open < close ? hour >= open && hour < close : hour >= open || hour < close;
}

function SessionsPage() {
  const [now, setNow] = useState(new Date());
  const { profile } = useProfile();
  const [zone, setZone] = useState<string>("UTC");
  useEffect(() => { if (profile?.timezone) setZone(profile.timezone); }, [profile]);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const { hour: zoneHour, minute: zoneMinutes } = getZonedHM(now, zone);
  // Compute the offset (in hours) between the chosen zone and UTC so session windows shift correctly.
  const utcHM = getZonedHM(now, "UTC");
  let offset = zoneHour - utcHM.hour + (zoneMinutes - utcHM.minute) / 60;
  if (offset > 12) offset -= 24;
  if (offset < -12) offset += 24;
  const shift = (h: number) => ((h + offset) % 24 + 24) % 24;
  const zoneLabel = TIMEZONES.find((t) => t.ianaOrOffset === zone)?.label ?? zone;

  return (
    <AppShell title="Trading Sessions">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">Live status across the four major sessions.</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Timezone</span>
          <Select value={zone} onValueChange={setZone}>
            <SelectTrigger className="w-[230px]"><SelectValue /></SelectTrigger>
            <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t.id} value={t.ianaOrOffset}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Card className="mb-6 border-border/60 bg-card">
        <CardContent className="flex items-center gap-3 p-5">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Current time · {zoneLabel}</p>
            <p className="text-2xl font-semibold tabular-nums">
              {String(zoneHour).padStart(2, "0")}:{String(zoneMinutes).padStart(2, "0")}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SESSIONS.map((s) => {
          const so = Math.floor(shift(s.open));
          const sc = Math.floor(shift(s.close));
          const open = isOpen(s.open, s.close, utcHM.hour);
          return (
            <Card key={s.name} className="border-border/60 bg-card overflow-hidden">
              <CardContent className="p-0">
                <div className={`bg-gradient-to-br ${s.color} p-5`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{s.name}</h3>
                    {open ? (
                      <Badge className="bg-success/20 text-success border-success/40 border">Open</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Closed</Badge>
                    )}
                  </div>
                  <p className="mt-3 text-2xl font-semibold tabular-nums">
                    {String(so).padStart(2, "0")}:00 – {String(sc).padStart(2, "0")}:00
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{zoneLabel.split(" — ")[0]}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 border-border/60 bg-card">
        <CardContent className="p-6">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">24-hour overview</h3>
          <div className="space-y-3">
            {SESSIONS.map((s) => (
              <div key={s.name}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{s.name}</span>
                  <span className="text-muted-foreground">{String(Math.floor(shift(s.open))).padStart(2, "0")}:00 – {String(Math.floor(shift(s.close))).padStart(2, "0")}:00</span>
                </div>
                <div className="relative h-3 rounded-full bg-muted">
                  {renderBar(s.open, s.close)}
                  <div className="absolute top-0 h-3 w-px bg-foreground" style={{ left: `${((utcHM.hour + utcHM.minute / 60) / 24) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function renderBar(open: number, close: number) {
  if (open < close) {
    return <div className="absolute h-3 rounded-full bg-gradient-primary" style={{ left: `${(open / 24) * 100}%`, width: `${((close - open) / 24) * 100}%` }} />;
  }
  return (
    <>
      <div className="absolute h-3 rounded-l-full bg-gradient-primary" style={{ left: `${(open / 24) * 100}%`, width: `${((24 - open) / 24) * 100}%` }} />
      <div className="absolute h-3 rounded-r-full bg-gradient-primary" style={{ left: 0, width: `${(close / 24) * 100}%` }} />
    </>
  );
}
