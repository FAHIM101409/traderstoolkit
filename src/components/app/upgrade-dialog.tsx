import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

const FREE = [
  "Dashboard",
  "Lot Size Calculator",
  "Risk Calculator",
  "Prop Firm Drawdown",
  "Trading Sessions",
  "Basic Trade Journal",
  "Analytics",
  "Fundamentals Bot (5/day)",
];

const PRO = [
  "Everything in Free",
  "Unlimited AI Trade Reviews",
  "Unlimited Fundamentals Bot",
  "Pattern Detection (SMC)",
  "MT5 Auto-Journaling",
  "TradingView Backtesting Station",
  "Unlimited historical replay data",
  "Advanced Analytics",
  "All future premium features",
];

export function UpgradeDialog({ children, open, onOpenChange }: { children?: ReactNode; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const o = isControlled ? open : internalOpen;
  const setO = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  function checkout() {
    toast.info("Payments coming soon", { description: "Stripe checkout will go live shortly. We'll email you the moment Pro opens." });
  }

  return (
    <Dialog open={o} onOpenChange={setO}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upgrade to Traders Toolkit Pro</DialogTitle>
          <DialogDescription>Unlock the full trading OS — AI, MT5 sync, and the Backtesting Station.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Free</h3>
              <Badge variant="outline">Current</Badge>
            </div>
            <p className="mt-1 text-3xl font-bold">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
            <ul className="mt-4 space-y-2 text-sm">
              {FREE.map((f) => (
                <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-success" /> {f}</li>
              ))}
              <li className="flex items-start gap-2 text-muted-foreground"><X className="mt-0.5 h-4 w-4" /> AI tools limited</li>
              <li className="flex items-start gap-2 text-muted-foreground"><X className="mt-0.5 h-4 w-4" /> No MT5 sync</li>
            </ul>
          </div>
          <div className="relative rounded-xl border border-primary/60 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-glow">
            <Badge className="absolute -top-3 right-4 bg-primary text-primary-foreground">Most popular</Badge>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-semibold">Pro</h3>
            </div>
            <p className="mt-1 text-3xl font-bold">$29<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
            <ul className="mt-4 space-y-2 text-sm">
              {PRO.map((f) => (
                <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" /> {f}</li>
              ))}
            </ul>
            <Button className="mt-5 w-full" onClick={checkout}>Upgrade to Pro — $29/month</Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Cancel anytime · Secure Stripe checkout</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
