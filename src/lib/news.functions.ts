import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------- Types ----------
export type CalendarEvent = {
  id: string;
  title: string;
  currency: string;
  country: string;
  impact: "high" | "medium" | "low" | "holiday";
  timeUtc: string; // ISO
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  hasTime: boolean; // false for "All Day" / "Tentative"
};

type FFEvent = {
  title: string;
  country: string; // currency code (USD, EUR, ...)
  date: string; // ISO w/ offset
  impact: "High" | "Medium" | "Low" | "Holiday" | string;
  forecast: string;
  previous: string;
};

// ---------- In-memory cache ----------
let cache: { at: number; events: CalendarEvent[] } | null = null;
const CACHE_MS = 5 * 60 * 1000;

async function fetchWeek(url: string): Promise<{ events: FFEvent[]; error?: string }> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "TradersToolkit/1.0 (+https://traderstoolkit.lovable.app)" } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[news] feed HTTP error", res.status, url, body.slice(0, 200));
      return { events: [], error: `Feed HTTP ${res.status}` };
    }
    const json = (await res.json()) as FFEvent[];
    console.log("[news] fetched", url, "count=", Array.isArray(json) ? json.length : 0);
    return { events: Array.isArray(json) ? json : [] };
  } catch (e: any) {
    console.error("[news] feed fetch failed", url, e?.message ?? e);
    return { events: [], error: e?.message ?? "Network error" };
  }
}

function normalize(e: FFEvent): CalendarEvent | null {
  if (!e?.date) return null;
  const d = new Date(e.date);
  if (isNaN(d.getTime())) return null;
  const impactRaw = String(e.impact || "").toLowerCase();
  const impact: CalendarEvent["impact"] =
    impactRaw.includes("high") ? "high" :
    impactRaw.includes("medium") ? "medium" :
    impactRaw.includes("holiday") ? "holiday" : "low";
  const hasTime = !/00:00:00/.test(e.date.slice(11, 19)) || /T\d{2}:\d{2}/.test(e.date);
  return {
    id: `${e.country}-${e.title}-${d.toISOString()}`,
    title: e.title,
    currency: e.country || "",
    country: e.country || "",
    impact,
    timeUtc: d.toISOString(),
    forecast: e.forecast || null,
    previous: e.previous || null,
    actual: null, // FF public JSON does not include actuals
    hasTime,
  };
}

// Optional actuals provider (Financial Modeling Prep). Only used when the
// FMP_API_KEY secret is set; the key never leaves the server.
type FmpEvent = { date: string; currency?: string; event?: string; actual?: number | string | null };
async function fetchActuals(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const key = process.env["FMP_API_KEY"];
  if (!key) return out;
  try {
    const from = new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10);
    const to = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10);
    const res = await fetch(`https://financialmodelingprep.com/stable/economic-calendar?from=${from}&to=${to}&apikey=${encodeURIComponent(key)}`);
    if (!res.ok) { console.error("[news] actuals HTTP", res.status); return out; }
    const rows = (await res.json()) as FmpEvent[];
    if (!Array.isArray(rows)) return out;
    for (const r of rows) {
      if (r.actual === null || r.actual === undefined || r.actual === "" || !r.currency || !r.date) continue;
      const t = Date.parse(r.date.replace(" ", "T") + "Z");
      if (isNaN(t)) continue;
      const k = `${r.currency}|${Math.round(t / 60000)}`;
      out.set(k + "|" + (r.event ?? "").toLowerCase(), String(r.actual));
      if (!out.has(k)) out.set(k, String(r.actual));
    }
  } catch (e: any) {
    console.error("[news] actuals fetch failed", e?.message ?? e);
  }
  return out;
}

function wordsMatch(a: string, b: string) {
  const wa = new Set(a.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));
  return b.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && wa.has(w)).length >= 1;
}

function attachActuals(events: CalendarEvent[], actuals: Map<string, string>) {
  if (actuals.size === 0) return;
  const byKey = new Map<string, { title: string; value: string }[]>();
  for (const [k, v] of actuals) {
    const parts = k.split("|");
    if (parts.length !== 3) continue;
    const base = `${parts[0]}|${parts[1]}`;
    const arr = byKey.get(base) ?? [];
    arr.push({ title: parts[2], value: v });
    byKey.set(base, arr);
  }
  for (const e of events) {
    const base = `${e.currency}|${Math.round(Date.parse(e.timeUtc) / 60000)}`;
    const cands = byKey.get(base);
    if (!cands) continue;
    const hit = cands.length === 1 ? cands[0] : cands.find((c) => wordsMatch(c.title, e.title));
    if (hit) e.actual = hit.value;
  }
}

async function loadAll(): Promise<{ events: CalendarEvent[]; error?: string }> {
  if (cache && Date.now() - cache.at < CACHE_MS) return { events: cache.events };
  const [thisWeek, nextWeek, actuals] = await Promise.all([
    fetchWeek("https://nfs.faireconomy.media/ff_calendar_thisweek.json"),
    fetchWeek("https://nfs.faireconomy.media/ff_calendar_nextweek.json"),
    fetchActuals(),
  ]);
  const raw = [...thisWeek.events, ...nextWeek.events];
  const merged = raw
    .map(normalize)
    .filter((x): x is CalendarEvent => !!x)
    .sort((a, b) => a.timeUtc.localeCompare(b.timeUtc));
  const seen = new Set<string>();
  const out = merged.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
  attachActuals(out, actuals);
  console.log("[news] normalized events:", out.length, "raw:", raw.length);
  if (out.length > 0) {
    cache = { at: Date.now(), events: out };
    return { events: out };
  }
  const err = thisWeek.error ?? nextWeek.error ?? "Calendar provider returned no data";
  // Serve stale cache if we have one
  if (cache) return { events: cache.events, error: err };
  return { events: [], error: err };
}

// ---------- Public server fn ----------
export const getEconomicCalendar = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        range: z.enum(["today", "week", "upcoming", "released", "past"]).default("week"),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { events: all, error } = await loadAll();
    const now = Date.now();
    // Use a wide UTC window so no user timezone loses "today". Client
    // narrows to the user's local day when rendering.
    const startUtc = new Date();
    startUtc.setUTCHours(0, 0, 0, 0);
    const dayStart = startUtc.getTime() - 24 * 3600 * 1000; // include yesterday UTC → catches early-Asia sessions viewed as "today" in west
    const dayEnd = startUtc.getTime() + 2 * 24 * 3600 * 1000; // include tomorrow UTC → catches late-US session viewed as "today" in east

    let events = all;
    if (data.range === "today") {
      events = all.filter((e) => {
        const t = Date.parse(e.timeUtc);
        return t >= dayStart && t < dayEnd;
      });
    } else if (data.range === "upcoming") {
      events = all.filter((e) => Date.parse(e.timeUtc) >= now - 15 * 60000);
    } else if (data.range === "past") {
      events = all.filter((e) => Date.parse(e.timeUtc) < now).reverse();
    } else if (data.range === "released") {
      events = all.filter((e) => Date.parse(e.timeUtc) < now).slice(-40);
    } else {
      const cutoff = startUtc.getTime() + 8 * 86400000;
      events = all.filter((e) => {
        const t = Date.parse(e.timeUtc);
        return t >= dayStart && t < cutoff;
      });
    }
    console.log("[news] range=", data.range, "total=", all.length, "returned=", events.length, "error=", error ?? "none");
    return { events, fetchedAt: cache?.at ?? Date.now(), error: error ?? null, totalLoaded: all.length, hasActualsProvider: !!process.env["FMP_API_KEY"] };
  });

// Server-side helper for the fundamentals AI. Returns a compact string
// summary of today's + this week's high/medium events with prev/forecast.
export async function getCalendarBriefing(): Promise<string> {
  try {
    const { events: all } = await loadAll();
    const now = Date.now();
    const cutoff = now + 7 * 86400000;
    const rows = all
      .filter((e) => {
        const t = Date.parse(e.timeUtc);
        return t >= now - 86400000 && t < cutoff && (e.impact === "high" || e.impact === "medium");
      })
      .slice(0, 40)
      .map((e) => `- ${e.timeUtc.slice(0, 16).replace("T", " ")}Z | ${e.currency} | ${e.impact.toUpperCase()} | ${e.title} | prev=${e.previous ?? "n/a"} | forecast=${e.forecast ?? "n/a"}`);
    if (rows.length === 0) return "No calendar events available.";
    return `LIVE ECONOMIC CALENDAR (source: Forex Factory, next 7 days):\n${rows.join("\n")}`;
  } catch {
    return "Calendar temporarily unavailable.";
  }
}