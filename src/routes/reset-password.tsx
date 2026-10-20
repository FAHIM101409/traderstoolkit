import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import tradivoMark from "@/assets/tradivo-mark.png";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Reset password — Tradivo" },
    { name: "description", content: "Set a new password for your Tradivo account." },
    { property: "og:title", content: "Reset password — Tradivo" },
    { property: "og:description", content: "Set a new password for your Tradivo account." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <img src={tradivoMark} alt="Tradivo" className="h-9 w-9 rounded-lg shadow-glow" />
          <span className="text-sm font-semibold">Tradivo</span>
        </Link>
        <Card className="border-border/60 bg-card/90">
          <CardContent className="p-6">
            <h1 className="mb-4 text-lg font-semibold">Set a new password</h1>
            {ready ? (
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <Label htmlFor="np">New password</Label>
                  <Input id="np" type="password" required minLength={6} className="h-11 text-base" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="h-11 w-full">{loading ? "Saving…" : "Update password"}</Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Open this page from the reset link in your email. <Link to="/auth" className="text-primary hover:underline">Back to sign in</Link></p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
