import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, CalendarClock, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 16];

export function ReplayControls({
  playing, onPlayPause, onStep, onJumpStart, onJumpEnd, onReset, onPickDate,
  index, total, speed, onSpeed, onScrub, barTime, disabled,
}: {
  playing: boolean;
  onPlayPause: () => void;
  onStep: (delta: number) => void;
  onJumpStart: () => void;
  onJumpEnd: () => void;
  onReset: () => void;
  onPickDate: () => void;
  index: number;
  total: number;
  speed: number;
  onSpeed: (s: number) => void;
  onScrub: (i: number) => void;
  barTime: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border/60 bg-card/90 px-2 py-1.5 backdrop-blur sm:px-3">
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onJumpStart} disabled={disabled} aria-label="Jump to replay start">
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onStep(-1)} disabled={disabled} aria-label="Previous bar">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          className={cn("h-9 w-9", playing ? "bg-amber-500 hover:bg-amber-400" : "bg-primary")}
          onClick={onPlayPause}
          disabled={disabled}
          aria-label={playing ? "Pause replay" : "Play replay"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onStep(1)} disabled={disabled} aria-label="Next bar">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onJumpEnd} disabled={disabled} aria-label="Jump to last bar">
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      <Select value={String(speed)} onValueChange={(v) => onSpeed(Number(v))}>
        <SelectTrigger className="h-8 w-[86px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {SPEEDS.map((s) => <SelectItem key={s} value={String(s)}>{s}× speed</SelectItem>)}
        </SelectContent>
      </Select>

      <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={onPickDate} disabled={disabled}>
        <CalendarClock className="h-3.5 w-3.5" /> Jump to date
      </Button>
      <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={onReset} disabled={disabled}>
        <RotateCcw className="h-3.5 w-3.5" /> Restart
      </Button>

      <div className="order-last flex min-w-full flex-1 items-center gap-2 sm:order-none sm:min-w-[180px]">
        <Slider
          value={[index]}
          min={0}
          max={Math.max(total - 1, 0)}
          step={1}
          onValueChange={(values) => onScrub(values[0] ?? index)}
          disabled={disabled}
        />
      </div>

      <Badge variant="secondary" className="whitespace-nowrap font-mono text-[10px]">{barTime}</Badge>
      <span className="whitespace-nowrap text-[10px] text-muted-foreground">bar {index + 1} / {total}</span>
    </div>
  );
}
