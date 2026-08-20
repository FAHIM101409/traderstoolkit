import { MousePointer2, TrendingUp, MoveUpRight, Minus, Separator as SeparatorIcon, Square, Ruler, Type, Eraser, Star, Trash2, GitCommitVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DrawingTool } from "./chart-types";

const ICONS: Record<DrawingTool, any> = {
  cursor: MousePointer2,
  trend: TrendingUp,
  ray: MoveUpRight,
  hline: Minus,
  vline: GitCommitVertical,
  rect: Square,
  fib: SeparatorIcon,
  measure: Ruler,
  text: Type,
  erase: Eraser,
};

const LABELS: Record<DrawingTool, string> = {
  cursor: "Cursor",
  trend: "Trend line",
  ray: "Ray",
  hline: "Horizontal line",
  vline: "Vertical line",
  rect: "Rectangle",
  fib: "Fib retracement",
  measure: "Measure",
  text: "Text note",
  erase: "Erase drawing",
};

const ORDER: DrawingTool[] = ["cursor", "trend", "ray", "hline", "vline", "rect", "fib", "measure", "text", "erase"];

const COLORS = ["#38bdf8", "#22c55e", "#ef4444", "#eab308", "#a78bfa", "#f472b6", "#e2e8f0"];

export function DrawingToolbar({
  active, onSelect, favorites, onToggleFavorite, color, onColor, onClearAll, drawingCount,
}: {
  active: DrawingTool;
  onSelect: (t: DrawingTool) => void;
  favorites: DrawingTool[];
  onToggleFavorite: (t: DrawingTool) => void;
  color: string;
  onColor: (c: string) => void;
  onClearAll: () => void;
  drawingCount: number;
}) {
  const favSet = new Set(favorites);
  const ordered = [...ORDER].sort((a, b) => Number(favSet.has(b)) - Number(favSet.has(a)));

  return (
    <div className="flex h-full w-11 shrink-0 flex-col items-center gap-1 border-r border-border/60 bg-card/70 py-2 backdrop-blur">
      {ordered.map((tool) => {
        const Icon = ICONS[tool];
        return (
          <Tooltip key={tool}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSelect(tool)}
                onContextMenu={(e) => { e.preventDefault(); onToggleFavorite(tool); }}
                className={cn(
                  "relative grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground",
                  active === tool && "bg-primary/15 text-primary",
                )}
                aria-label={LABELS[tool]}
              >
                <Icon className="h-4 w-4" />
                {favSet.has(tool) && <Star className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 fill-amber-400 text-amber-400" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {LABELS[tool]} <span className="text-muted-foreground">· right-click to favourite</span>
            </TooltipContent>
          </Tooltip>
        );
      })}

      <div className="my-1 h-px w-6 bg-border" />

      <div className="grid grid-cols-1 gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColor(c)}
            aria-label={`Colour ${c}`}
            className={cn("h-4 w-4 rounded-full border transition", color === c ? "border-foreground scale-110" : "border-transparent")}
            style={{ background: c }}
          />
        ))}
      </div>

      <div className="mt-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClearAll} disabled={!drawingCount}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Clear all drawings ({drawingCount})</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}