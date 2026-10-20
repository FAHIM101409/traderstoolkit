import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import tradivoMark from "@/assets/tradivo-mark.png";
import heroSummit from "@/assets/hero-summit.jpg";
import { Calculator, BookOpen, BarChart3, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Tradivo" }, { name: "description", content: "Sign in to Tradivo — lot sizing, journal, analytics and economic calendar for traders." }, { property: "og:title", content: "Sign in — Tradivo" }, { property: "og:description", content: "Better Tools. Smarter Traders. Stronger Together." }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + "/dashboard", data: { display_name: name } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. Check your email if confirmation is required.");
    navigate({ to: "/dashboard" });
  }

  async function forgot() {
    if (!email) return toast.error("Enter your email above first");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) return toast.error(error.message);
    toast.success("Check your email for a password reset link");
  }

  async function google() {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (res.error) toast.error("Google sign-in failed");
  }

  const features = [
    { i: Calculator, t: "Precise lot sizing", d: "Every pair, metal, index and crypto — live FX rates." },
    { i: BookOpen, t: "Trade journal", d: "Turn every trade into a lesson." },
    { i: BarChart3, t: "Real analytics", d: "Win rate, profit factor and equity curve." },
    { i: CalendarClock, t: "Economic calendar", d: "High-impact news in your timezone." },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <img src={heroSummit} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30 lg:hidden" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background lg:hidden" aria-hidden />
      <div className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)_minmax(0,1fr)]">
        {/* Left panel: headline over artwork */}
        <aside className="relative order-2 overflow-hidden px-4 pb-6 md:px-10 lg:order-1 lg:flex lg:flex-col lg:justify-center lg:p-10">
          <img src={heroSummit} alt="" aria-hidden className="absolute inset-0 hidden h-full w-full object-cover object-right lg:block" />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-background/30 via-background/60 to-background lg:block" aria-hidden />
          <h2 className="relative text-center text-3xl font-semibold leading-tight tracking-tight md:text-4xl lg:text-left xl:text-5xl">
            Better Tools.<br />Smarter Traders.<br /><span className="text-primary">Stronger Together.</span>
          </h2>
        </aside>

        {/* Right panel: feature cards */}
        <aside className="relative order-3 overflow-hidden px-4 pb-10 md:px-10 lg:flex lg:flex-col lg:justify-center lg:p-10">
          <img src={heroSummit} alt="" aria-hidden className="absolute inset-0 hidden h-full w-full -scale-x-100 object-cover object-right lg:block" />
          <div className="absolute inset-0 hidden bg-gradient-to-l from-background/30 via-background/60 to-background lg:block" aria-hidden />
          <ul className="relative mx-auto grid w-full max-w-md gap-3 md:max-w-2xl md:grid-cols-2 lg:max-w-sm lg:grid-cols-1">
            {features.map((f) => (
              <li key={f.t} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/70 p-3 backdrop-blur">
                <f.i className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0"><p className="text-sm font-semibold">{f.t}</p><p className="text-xs text-muted-foreground">{f.d}</p></div>
              </li>
            ))}
          </ul>
        </aside>

        {/* Center: sign-in card */}
        <div className="relative order-1 flex flex-col items-center justify-center px-4 pb-8 pt-6 lg:order-2 lg:py-10">
          <div className="absolute inset-0 hidden bg-gradient-hero lg:block" aria-hidden />
          <div className="relative w-full max-w-md">
            <Link to="/" className="mb-2 flex items-center justify-center gap-2">
              <img src={tradivoMark} alt="Tradivo" className="h-9 w-9 rounded-lg shadow-glow" />
              <span className="text-sm font-semibold">Tradivo</span>
            </Link>
            <p className="mb-5 text-center text-xs text-muted-foreground">Tools · Traders · Together</p>
        <Card className="border-border/60 bg-card/90 backdrop-blur">
          <CardContent className="p-5 sm:p-6">
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="pt-4">
                <form onSubmit={signIn} className="space-y-3">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input className="h-11 text-base" id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input className="h-11 text-base" id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    <div className="mt-1.5 text-right">
                      <button type="button" onClick={forgot} className="text-xs text-primary hover:underline">Forgot password?</button>
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="h-11 w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="pt-4">
                <form onSubmit={signUp} className="space-y-3">
                  <div>
                    <Label htmlFor="name">Display name</Label>
                    <Input className="h-11 text-base" id="name" required value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="email2">Email</Label>
                    <Input className="h-11 text-base" id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="password2">Password</Label>
                    <Input className="h-11 text-base" id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={loading} className="h-11 w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
              <div className="relative flex justify-center"><span className="bg-card px-2 text-xs text-muted-foreground">or</span></div>
            </div>

            <Button type="button" variant="outline" className="h-11 w-full" onClick={google}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 10.2v3.84h5.4c-.24 1.44-1.68 4.2-5.4 4.2-3.24 0-5.88-2.7-5.88-6s2.64-6 5.88-6c1.84 0 3.08.78 3.78 1.44l2.58-2.5C16.92 3.7 14.7 2.7 12 2.7 6.96 2.7 2.94 6.78 2.94 12s4.02 9.3 9.06 9.3c5.22 0 8.7-3.66 8.7-8.82 0-.6-.06-1.04-.12-1.5H12z"/></svg>
              Continue with Google
            </Button>
          </CardContent>
        </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
