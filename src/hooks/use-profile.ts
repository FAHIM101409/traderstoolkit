import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  account_currency: string;
  default_risk_pct: number;
  starting_balance: number;
  plan: "free" | "pro";
  plan_status: string;
  plan_renewal_at: string | null;
  timezone: string;
};

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    // Auto-downgrade if Pro access expired
    await supabase.rpc("expire_my_plan_if_due");
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile((data as Profile) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const isPro = profile?.plan === "pro";
  const proExpiresAt = profile?.plan_renewal_at ?? null;

  return { profile, loading, isPro, proExpiresAt, refresh: load };
}
