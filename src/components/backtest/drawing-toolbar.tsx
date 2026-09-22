import { MousePointer2, TrendingUp, MoveUpRight, Minus, AlignJustify, Square, Ruler, Type, Eraser, Star, Trash2, GitCommitVertical, Palette } from "lucide-react";
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
  fib: AlignJustify,
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
    <div className="flex h-11 w-full shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 bg-card/80 px-2 backdrop-blur md:h-full md:w-11 md:flex-col md:overflow-x-visible md:border-b-0 md:border-r md:px-0 md:py-2">
      {ordered.map((tool) => {
        const Icon = ICONS[tool];
        return (
          <Tooltip key={tool}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onSelect(tool)}
                onContextMenu={(e) => { e.preventDefault(); onToggleFavorite(tool); }}
                className={cn(
                  "relative h-8 w-8 shrink-0 text-muted-foreground",
                  active === tool && "bg-primary/15 text-primary",
                )}
                aria-label={LABELS[tool]}
              >
                <Icon className="h-4 w-4" />
                {favSet.has(tool) && <Star className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 fill-amber-400 text-amber-400" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {LABELS[tool]} <span className="text-muted-foreground">· right-click to favourite</span>
            </TooltipContent>
          </Tooltip>
        );
      })}

       <div className="mx-1 h-6 w-px shrink-0 bg-border md:my-1 md:h-px md:w-6" />

       <div className="flex items-center gap-1 md:grid md:grid-cols-1">
         <Palette className="mr-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground md:hidden" />
        {COLORS.map((c) => (
           <Button
             type="button"
             variant="ghost"
             size="icon"
            key={c}
            onClick={() => onColor(c)}
            aria-label={`Colour ${c}`}
             className={cn("h-5 w-5 shrink-0 rounded-full border p-0", color === c ? "scale-110 border-foreground" : "border-transparent")}
            style={{ background: c }}
          />
        ))}
      </div>

       <div className="ml-auto md:ml-0 md:mt-auto">
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