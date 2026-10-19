import { createServerFn } from "@tanstack/react-start";

let cache: { at: number; rates: Record<string, number>; updated: string } | null = null;

/** Live FX rates (1 USD = x units) from a free, keyless source. Cached 30 min. */
export const getFxRates = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && Date.now() - cache.at < 30 * 60_000) return { rates: cache.rates, updated: cache.updated };
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const json = (await res.json()) as { result?: string; rates?: Record<string, number>; time_last_update_utc?: string };
    if (json.result !== "success" || !json.rates) throw new Error("bad response");
    cache = { at: Date.now(), rates: json.rates, updated: json.time_last_update_utc ?? "" };
    return { rates: cache.rates, updated: cache.updated };
  } catch {
    return { rates: {} as Record<string, number>, updated: "" };
  }
});
