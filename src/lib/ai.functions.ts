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
    const sys =
      "You are a senior macro and fundamental analyst for forex, gold, and crypto traders. Explain news, central bank policy, DXY moves, yields, COT data, and high-impact events in clear, actionable terms. Always frame trade implications (bias, levels to watch, invalidation). Keep responses concise and use markdown bullets.";
    return { content: await callGateway([{ role: "system", content: sys }, ...data.messages]) };
  });

export const detectPattern = createServerFn({ method: "POST" })
  .inputValidator((d: { context: string }) => d)
  .handler(async ({ data }) => {
    const sys =
      "You are an SMC pattern detector. Given the user's described price action, identify likely SMC structures (BOS, CHoCH, FVG, Order Block, Liquidity Sweep, Mitigation, Premium/Discount). Output markdown with: **Detected Patterns**, **Bias**, **Key Levels**, **Confidence (Low/Med/High)**, **Suggested Entry Model**.";
    return { content: await callGateway([{ role: "system", content: sys }, { role: "user", content: data.context }]) };
  });