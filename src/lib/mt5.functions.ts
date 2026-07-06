import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const REGION = "new-york";
// Provisioning API is global (not regional). Regional hostnames for provisioning
// return a Cloudflare 526 (invalid SSL cert). Only the client API is regional.
const PROV_BASE = `https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai`;
const CLIENT_BASE = `https://mt-client-api-v1.${REGION}.agiliumtrade.ai`;

async function assertPro(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("plan,plan_status,plan_renewal_at").eq("id", userId).maybeSingle();
  const active = data?.plan === "pro" && (!data.plan_renewal_at || new Date(data.plan_renewal_at) > new Date());
  if (!active) throw new Error("MT5 integration requires a Pro plan.");
}

function metaapi(path: string, init: RequestInit = {}, base = CLIENT_BASE) {
  const token = process.env.METAAPI_AUTH_TOKEN;
  if (!token) throw new Error("MetaApi is not configured. Missing METAAPI_AUTH_TOKEN.");
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      "auth-token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
}

async function readErr(res: Response) {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    return j?.message || j?.error || text || `HTTP ${res.status}`;
  } catch {
    return text || `HTTP ${res.status}`;
  }
}

// Translate raw MetaApi errors into user-friendly messages the UI can trust.
function friendlyMt5Error(raw: string): string {
  const m = (raw || "").toLowerCase();
  if (
    (m.includes("server") && (m.includes("not found") || m.includes("unknown") || m.includes("does not exist"))) ||
    m.includes("server name") ||
    m.includes("no such server") ||
    m.includes("invalid server")
  ) {
    return "Broker server not found. Please verify the exact MT5 server name.";
  }
  if (
    m.includes("invalid account") ||
    m.includes("invalid trading account") ||
    (m.includes("invalid") && (m.includes("password") || m.includes("login") || m.includes("credential"))) ||
    m.includes("authoriz") ||
    m.includes("access denied") ||
    m.includes("wrong password")
  ) {
    return "Invalid MT5 login or investor password.";
  }
  return raw;
}

// ---------- Connect ----------
export const connectMt5 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().trim().max(60).optional(),
        broker: z.string().trim().min(1).max(80),
        server: z.string().trim().min(2).max(80),
        login: z.string().trim().regex(/^\d{3,15}$/, "Account number must be 3-15 digits"),
        investorPassword: z.string().min(1).max(120),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertPro(supabase, userId);

    // Only one account per user (matches unique index).
    const { data: existing } = await supabase.from("mt5_accounts").select("id,metaapi_account_id").eq("user_id", userId).maybeSingle();
    if (existing) throw new Error("An MT5 account is already connected. Disconnect it first.");

    // Create MetaApi account
    const createRes = await metaapi(
      "/users/current/accounts",
      {
        method: "POST",
        body: JSON.stringify({
          name: data.name || `${data.broker} ${data.login}`,
          type: "cloud-g2",
          login: data.login,
          password: data.investorPassword,
          server: data.server,
          platform: "mt5",
          magic: 0,
          application: "MetaApi",
          reliability: "regular",
          region: REGION,
        }),
      },
      PROV_BASE,
    );
    if (!createRes.ok) throw new Error(`MetaApi: ${await readErr(createRes)}`);
    const created = (await createRes.json()) as { id: string };

    // Deploy (start) the account
    await metaapi(`/users/current/accounts/${created.id}/deploy`, { method: "POST" }, PROV_BASE);

    const { data: row, error } = await supabase
      .from("mt5_accounts")
      .insert({
        user_id: userId,
        name: data.name || `${data.broker} ${data.login}`,
        broker: data.broker,
        server: data.server,
        login: data.login,
        metaapi_account_id: created.id,
        region: REGION,
        status: "provisioning",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- Disconnect ----------
export const disconnectMt5 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: acct } = await supabase.from("mt5_accounts").select("id,metaapi_account_id").eq("user_id", userId).maybeSingle();
    if (!acct) return { ok: true };
    if (acct.metaapi_account_id) {
      try {
        await metaapi(`/users/current/accounts/${acct.metaapi_account_id}/undeploy`, { method: "POST" }, PROV_BASE);
        await metaapi(`/users/current/accounts/${acct.metaapi_account_id}`, { method: "DELETE" }, PROV_BASE);
      } catch {
        /* best effort */
      }
    }
    await supabase.from("mt5_accounts").delete().eq("id", acct.id);
    // Optionally remove imported trades:
    await supabase.from("trades").delete().eq("user_id", userId).eq("external_source", "mt5");
    return { ok: true };
  });

// ---------- Sync ----------
type Deal = {
  id: string;
  type: string; // DEAL_TYPE_BUY / SELL / BALANCE / etc
  entryType?: string; // DEAL_ENTRY_IN / OUT / INOUT
  symbol?: string;
  volume?: number;
  price?: number;
  profit?: number;
  swap?: number;
  commission?: number;
  time: string;
  positionId?: string;
  orderId?: string;
  stopLoss?: number;
  takeProfit?: number;
};

export const syncMt5 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertPro(supabase, userId);

    const { data: acct, error: acctErr } = await supabase
      .from("mt5_accounts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (acctErr || !acct) throw new Error("No MT5 account connected.");
    const id = acct.metaapi_account_id;
    if (!id) throw new Error("MetaApi account is not provisioned yet.");

    const updates: {
      last_sync_at: string; last_error: string | null;
      status?: string; balance?: number | null; equity?: number | null;
      margin?: number | null; free_margin?: number | null; margin_level?: number | null;
      currency?: string | null; leverage?: number | null;
    } = { last_sync_at: new Date().toISOString(), last_error: null };

    // Account info
    const infoRes = await metaapi(`/users/current/accounts/${id}/account-information`);
    if (!infoRes.ok) {
      const msg = await readErr(infoRes);
      await supabase.from("mt5_accounts").update({ last_error: msg, last_sync_at: new Date().toISOString() }).eq("id", acct.id);
      throw new Error(`MT5 not ready: ${msg}`);
    }
    const info = (await infoRes.json()) as Record<string, number | string>;
    Object.assign(updates, {
      status: "connected",
      balance: info.balance ?? null,
      equity: info.equity ?? null,
      margin: info.margin ?? null,
      free_margin: info.freeMargin ?? null,
      margin_level: info.marginLevel ?? null,
      currency: info.currency ?? null,
      leverage: info.leverage ?? null,
    });

    // Sync starting balance on profile if user has not customised it (still default 10000)
    if (typeof info.balance === "number") {
      await supabase
        .from("profiles")
        .update({ account_currency: (info.currency as string) || "USD" })
        .eq("id", userId);
    }

    // Deal history (last 180 days, expandable later)
    const end = new Date();
    const start = new Date(end.getTime() - 180 * 86400000);
    const dealsRes = await metaapi(
      `/users/current/accounts/${id}/history-deals/time/${encodeURIComponent(start.toISOString())}/${encodeURIComponent(end.toISOString())}`,
    );
    let imported = 0;
    if (dealsRes.ok) {
      const deals = (await dealsRes.json()) as Deal[];
      // Group deals by positionId. Build closed trades from IN/OUT pairs.
      type Pos = { positionId: string; symbol: string; direction: "long" | "short"; entryPrice: number; exitPrice: number; volume: number; openedAt: string; closedAt: string; pnl: number; sl?: number; tp?: number };
      const positions = new Map<string, Partial<Pos> & { legs: Deal[] }>();
      for (const d of deals) {
        if (!d.positionId || (d.type !== "DEAL_TYPE_BUY" && d.type !== "DEAL_TYPE_SELL")) continue;
        const p = positions.get(d.positionId) ?? { positionId: d.positionId, legs: [] as Deal[] };
        p.legs.push(d);
        positions.set(d.positionId, p);
      }
      const closed: Pos[] = [];
      for (const [, p] of positions) {
        const legs = (p.legs as Deal[]).sort((a, b) => +new Date(a.time) - +new Date(b.time));
        const ins = legs.filter((l) => l.entryType === "DEAL_ENTRY_IN");
        const outs = legs.filter((l) => l.entryType === "DEAL_ENTRY_OUT");
        if (!ins.length || !outs.length) continue;
        const inLeg = ins[0];
        const outLeg = outs[outs.length - 1];
        const direction = inLeg.type === "DEAL_TYPE_BUY" ? "long" : "short";
        const totalProfit = legs.reduce((s, l) => s + (l.profit ?? 0) + (l.swap ?? 0) + (l.commission ?? 0), 0);
        closed.push({
          positionId: p.positionId!,
          symbol: inLeg.symbol || "UNKNOWN",
          direction,
          entryPrice: inLeg.price ?? 0,
          exitPrice: outLeg.price ?? 0,
          volume: inLeg.volume ?? 0,
          openedAt: inLeg.time,
          closedAt: outLeg.time,
          pnl: +totalProfit.toFixed(2),
          sl: inLeg.stopLoss,
          tp: inLeg.takeProfit,
        });
      }

      if (closed.length) {
        const rows = closed.map((c) => {
          const rrPlanned =
            c.sl && c.entryPrice
              ? +(Math.abs(c.exitPrice && c.tp ? (c.tp - c.entryPrice) / (c.entryPrice - c.sl) : 0)).toFixed(2)
              : null;
          const status: "win" | "loss" | "breakeven" = c.pnl > 0 ? "win" : c.pnl < 0 ? "loss" : "breakeven";
          return {
            user_id: userId,
            pair: c.symbol,
            direction: c.direction as "long" | "short",
            entry_price: c.entryPrice,
            exit_price: c.exitPrice,
            stop_loss: c.sl ?? null,
            take_profit: c.tp ?? null,
            lot_size: c.volume,
            pnl: c.pnl,
            rr_planned: rrPlanned,
            status,
            opened_at: c.openedAt,
            closed_at: c.closedAt,
            source: "mt5",
            external_source: "mt5",
            external_id: c.positionId,
            asset_class: c.symbol.toUpperCase().startsWith("XAU") ? "metal" : c.symbol.toUpperCase().includes("BTC") || c.symbol.toUpperCase().includes("ETH") ? "crypto" : "forex",
          };
        });
        const { error: upErr, count } = await supabase.from("trades").upsert(rows, {
          onConflict: "user_id,external_source,external_id",
          ignoreDuplicates: false,
          count: "exact",
        });
        if (upErr) {
          updates.last_error = upErr.message;
        } else {
          imported = count ?? rows.length;
        }
      }
    } else {
      updates.last_error = `History fetch failed: ${await readErr(dealsRes)}`;
    }

    await supabase.from("mt5_accounts").update(updates).eq("id", acct.id);
    return { ok: true, imported };
  });

// ---------- Update sync frequency ----------
export const updateMt5Settings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ sync_frequency_minutes: z.number().int().min(0).max(1440) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("mt5_accounts")
      .update({ sync_frequency_minutes: data.sync_frequency_minutes })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });