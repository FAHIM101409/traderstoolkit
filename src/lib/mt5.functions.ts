import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// MT5 Integration is a Pro feature that is coming soon. It is hard-disabled
// on the server: every function below throws before doing anything, so no
// call ever reaches MetaApi and no MT5 credentials are ever stored.
const LOCKED_MESSAGE = "MT5 Integration is a Pro feature coming soon.";

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
  .handler(async () => {
    throw new Error(LOCKED_MESSAGE);
  });

export const disconnectMt5 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    throw new Error(LOCKED_MESSAGE);
  });

export const syncMt5 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    throw new Error(LOCKED_MESSAGE);
  });

export const updateMt5Settings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ sync_frequency_minutes: z.number().int().min(0).max(1440) }).parse(data),
  )
  .handler(async () => {
    throw new Error(LOCKED_MESSAGE);
  });

export type Mt5Phase =
  | "none"
  | "provisioning"
  | "deploying"
  | "connecting"
  | "connected"
  | "auth_failed"
  | "server_invalid"
  | "error";

export const getMt5Status = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    throw new Error(LOCKED_MESSAGE);
  });
