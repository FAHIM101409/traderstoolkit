import { createServerFn } from "@tanstack/react-start";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

async function callGateway(messages: ChatMsg[], model = "google/gemini-3-flash-preview") {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({ model, messages }),
  });
  if (res.status === 429) throw new Error("Rate limit reached. Try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in your workspace.");
  if (!res.ok) throw new Error(`AI gateway error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

export const reviewTrade = createServerFn({ method: "POST" })
  .inputValidator((d: { trade: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const sys =
      "You are an elite trading coach specializing in Smart Money Concepts (SMC), risk management, and prop-firm discipline. Review the user's trade and respond in concise markdown with these sections: **Verdict** (one line A-F grade + summary), **What Worked**, **What To Improve**, **SMC Read** (interpret tags + price action), **Risk Discipline** (RR, sizing, stop placement), **Action Plan** (3 bullet points).";
    const user = `Review this trade:\n\n\`\`\`json\n${JSON.stringify(data.trade, null, 2)}\n\`\`\``;
    return { content: await callGateway([{ role: "system", content: sys }, { role: "user", content: user }]) };
  });

export const chatFundamentals = createServerFn({ method: "POST" })
  .inputValidator((d: { messages: ChatMsg[] }) => d)
  .handler(async ({ data }) => {
    const today = new Date().toISOString().slice(0, 10);
    const sys = `You are a senior macro & fundamental analyst for forex, gold, indices and crypto traders. Today is ${today}.

RULES:
- ALWAYS reason in TODAY's market context (2026). Never use stale 2022-2024 anchor prices.
- When you reference a price, use a realistic current-market range (e.g. Gold ~ $4,000+/oz era, BTC six-figure range, EURUSD parity-to-mid-1.1s, DXY mid-90s to 110). If unsure, say "current spot" rather than invent a specific stale figure.
- Be explicit about what drives the asset: CPI, Core CPI, PPI, NFP, unemployment, Fed/ECB/BoE rates & dot plot, DXY, US 2y/10y yields, real yields, geopolitical risk, risk-on/off sentiment.
- For any asset the user names, structure the answer:
  **Bias:** Bullish / Bearish / Neutral
  **Confidence:** Low / Medium / High (with %)
  **Short-Term Outlook (1-2 weeks):**
  **Medium-Term Outlook (1-3 months):**
  **Key Drivers Right Now:** (bullet list of the macro inputs above)
  **Key Risks / Invalidation:**
  **Levels to Watch:** (psychological / structural — frame as "near current spot" if unsure of exact tick)
- Concise markdown, bullets > prose. No disclaimers, no "I'm an AI".`;
    return { content: await callGateway([{ role: "system", content: sys }, ...data.messages]) };
  });

export const detectPattern = createServerFn({ method: "POST" })
  .inputValidator((d: { context: string }) => d)
  .handler(async ({ data }) => {
    const sys =
      "You are an SMC pattern detector. Given the user's described price action, identify likely SMC structures (BOS, CHoCH, FVG, Order Block, Liquidity Sweep, Mitigation, Premium/Discount). Output markdown with: **Detected Patterns**, **Bias**, **Key Levels**, **Confidence (Low/Med/High)**, **Suggested Entry Model**.";
    return { content: await callGateway([{ role: "system", content: sys }, { role: "user", content: data.context }]) };
  });

export const getEconomicCalendar = createServerFn({ method: "POST" })
  .inputValidator((d: { range: "today" | "week" }) => d)
  .handler(async ({ data }) => {
    const today = new Date();
    const sys = `You are an economic-calendar generator. Today is ${today.toISOString().slice(0, 10)} (${today.toUTCString()}).
Return ONLY valid JSON (no prose, no code fences) matching:
{ "events": [ { "date": "YYYY-MM-DD", "time": "HH:MM UTC", "currency": "USD|EUR|GBP|JPY|CAD|AUD|NZD|CHF|CNY", "event": "string", "impact": "high|medium|low", "forecast": "string|null", "previous": "string|null", "actual": "string|null" } ] }
Cover ${data.range === "today" ? "TODAY only" : "the next 7 days starting today"}. Include realistic, plausibly-scheduled high-impact releases (CPI, Core CPI, PPI, NFP, Unemployment, GDP, PMI, Retail Sales, Fed/ECB/BoE rate decisions, FOMC minutes). Use realistic 2026 forecast/previous values. Mark past events with an "actual" value, future events with actual=null. Return 8-20 events.`;
    const raw = await callGateway([{ role: "system", content: sys }, { role: "user", content: `Generate the ${data.range} economic calendar.` }]);
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    try { return JSON.parse(cleaned); } catch { return { events: [] }; }
  });

export const analyzeNewsImpact = createServerFn({ method: "POST" })
  .inputValidator((d: { event: { event: string; currency: string; forecast?: string | null; previous?: string | null; actual?: string | null } }) => d)
  .handler(async ({ data }) => {
    const sys = `You analyze the market impact of an economic event for retail traders. Output markdown:
**Event Summary:** one-liner explanation of what this is
**Why It Matters:** 2-3 bullets
**Expected Impact**
- USD (DXY): bullish/bearish + why
- Gold (XAUUSD): bullish/bearish + why
- EURUSD: bullish/bearish + why
- GBPUSD: bullish/bearish + why
- BTCUSD: bullish/bearish + why
**Trade Plan Considerations:** entry triggers, invalidation, RR notes
Use current 2026 market context. Be specific, no fluff.`;
    const user = `Event: ${data.event.event} (${data.event.currency})\nForecast: ${data.event.forecast ?? "n/a"}\nPrevious: ${data.event.previous ?? "n/a"}\nActual: ${data.event.actual ?? "not yet released"}`;
    return { content: await callGateway([{ role: "system", content: sys }, { role: "user", content: user }]) };
  });