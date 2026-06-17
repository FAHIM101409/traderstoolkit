import { useState, type ReactNode } from "react";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import { UpgradeDialog } from "./upgrade-dialog";

export function ProGate({ feature, description, children }: { feature: string; description: string; children: ReactNode }) {
  const { isPro, loading } = useProfile();
  const [open, setOpen] = useState(false);

  if (loading) return null;
  if (isPro) return <>{children}</>;

  return (
    <>
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-glow">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{feature} is a Pro feature</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
          </div>
          <Button onClick={() => setOpen(true)} size="lg" className="gap-2">
            <Sparkles className="h-4 w-4" /> Upgrade to Pro — $29/month
          </Button>
          <p className="text-xs text-muted-foreground">14-day money back · Cancel anytime</p>
        </CardContent>
      </Card>
      <UpgradeDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
