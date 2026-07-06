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

async function loadAll(): Promise<{ events: CalendarEvent[]; error?: string }> {
  if (cache && Date.now() - cache.at < CACHE_MS) return { events: cache.events };
  const [thisWeek, nextWeek] = await Promise.all([
    fetchWeek("https://nfs.faireconomy.media/ff_calendar_thisweek.json"),
    fetchWeek("https://nfs.faireconomy.media/ff_calendar_nextweek.json"),
  ]);
  const raw = [...thisWeek.events, ...nextWeek.events];
  const merged = raw
    .map(normalize)
    .filter((x): x is CalendarEvent => !!x)
    .sort((a, b) => a.timeUtc.localeCompare(b.timeUtc));
  const seen = new Set<string>();
  const out = merged.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
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
        range: z.enum(["today", "week", "upcoming", "released"]).default("week"),
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
      events = all.filter((e) => e.impact === "high" && Date.parse(e.timeUtc) >= now).slice(0, 30);
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
    return { events, fetchedAt: cache?.at ?? Date.now(), error: error ?? null, totalLoaded: all.length };
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