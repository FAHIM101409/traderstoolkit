import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sessions")({
  head: () => ({ meta: [{ title: "Trading Sessions — Smart Trader Toolkit" }] }),
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
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const utcHour = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();

  return (
    <AppShell title="Trading Sessions">
      <p className="mb-6 text-sm text-muted-foreground">Live status across the four major sessions (UTC).</p>

      <Card className="mb-6 border-border/60 bg-card">
        <CardContent className="flex items-center gap-3 p-5">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Current UTC time</p>
            <p className="text-2xl font-semibold tabular-nums">
              {String(utcHour).padStart(2, "0")}:{String(utcMinutes).padStart(2, "0")}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SESSIONS.map((s) => {
          const open = isOpen(s.open, s.close, utcHour);
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
                    {String(s.open).padStart(2, "0")}:00 – {String(s.close).padStart(2, "0")}:00
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">UTC</p>
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
                  <span className="text-muted-foreground">{String(s.open).padStart(2, "0")}:00 – {String(s.close).padStart(2, "0")}:00 UTC</span>
                </div>
                <div className="relative h-3 rounded-full bg-muted">
                  {renderBar(s.open, s.close)}
                  <div className="absolute top-0 h-3 w-px bg-foreground" style={{ left: `${((utcHour + utcMinutes / 60) / 24) * 100}%` }} />
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
