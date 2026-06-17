import { createFileRoute } from "@tanstack/react-router";

type IncomingTrade = {
  ticket: string | number;
  pair: string;
  direction: "long" | "short" | "buy" | "sell";
  lot_size?: number;
  entry_price?: number;
  exit_price?: number;
  stop_loss?: number;
  take_profit?: number;
  pnl?: number;
  opened_at?: string;
  closed_at?: string;
  asset_class?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-MT5-Token",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export const Route = createFileRoute("/api/public/mt5/ingest")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const token =
          request.headers.get("x-mt5-token") ||
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
          "";
        if (!token) return json({ error: "Missing MT5 token" }, 401);

        let payload: { trades?: IncomingTrade[]; account_number?: string; broker?: string };
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        const trades = Array.isArray(payload?.trades) ? payload.trades : [];
        if (trades.length === 0) return json({ error: "No trades provided" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: tokenRow, error: tokenErr } = await supabaseAdmin
          .from("mt5_tokens")
          .select("id, user_id")
          .eq("token", token)
          .maybeSingle();
        if (tokenErr || !tokenRow) return json({ error: "Invalid token" }, 401);

        const userId = tokenRow.user_id;

        await supabaseAdmin
          .from("mt5_tokens")
          .update({
            last_seen_at: new Date().toISOString(),
            account_number: payload.account_number ?? undefined,
            broker: payload.broker ?? undefined,
          })
          .eq("id", tokenRow.id);

        const rows = trades
          .filter((t) => t && t.ticket != null && t.pair && t.direction)
          .map((t) => {
            const dir = String(t.direction).toLowerCase();
            const direction = dir === "buy" || dir === "long" ? "long" : "short";
            const closed = t.closed_at ? new Date(t.closed_at).toISOString() : null;
            const opened = t.opened_at ? new Date(t.opened_at).toISOString() : new Date().toISOString();
            const pnl = typeof t.pnl === "number" ? t.pnl : null;
            const status = closed
              ? pnl != null && pnl > 0
                ? "win"
                : pnl != null && pnl < 0
                ? "loss"
                : "breakeven"
              : "open";
            return {
              user_id: userId,
              mt5_ticket: String(t.ticket),
              source: "mt5",
              pair: String(t.pair).toUpperCase(),
              asset_class: t.asset_class ?? "forex",
              direction,
              lot_size: t.lot_size ?? null,
              entry_price: t.entry_price ?? null,
              exit_price: t.exit_price ?? null,
              stop_loss: t.stop_loss ?? null,
              take_profit: t.take_profit ?? null,
              pnl,
              status,
              opened_at: opened,
              closed_at: closed,
            };
          });

        if (rows.length === 0) return json({ ok: true, imported: 0 });

        const { error: upErr, count } = await supabaseAdmin
          .from("trades")
          .upsert(rows, { onConflict: "user_id,mt5_ticket", count: "exact" });
        if (upErr) return json({ error: upErr.message }, 500);

        return json({ ok: true, imported: count ?? rows.length });
      },
    },
  },
});