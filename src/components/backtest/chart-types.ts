export type ChartStyle = "candles" | "bars" | "line" | "area" | "heikin";

export type DrawingTool =
  | "cursor"
  | "trend"
  | "ray"
  | "hline"
  | "vline"
  | "rect"
  | "fib"
  | "measure"
  | "text"
  | "erase";

export type DrawPoint = { logical: number; price: number };

export type Drawing = {
  id: string;
  tool: Exclude<DrawingTool, "cursor" | "erase">;
  points: DrawPoint[];
  color: string;
  width: number;
  text?: string;
};

export type ChartSettings = {
  style: ChartStyle;
  upColor: string;
  downColor: string;
  wickUp: string;
  wickDown: string;
  background: string;
  gridColor: string;
  textColor: string;
  showGrid: boolean;
  showVolume: boolean;
  showCrosshair: boolean;
  logScale: boolean;
  showWatermark: boolean;
  rightOffset: number;
};

export const DEFAULT_CHART_SETTINGS: ChartSettings = {
  style: "candles",
  upColor: "#26a69a",
  downColor: "#ef5350",
  wickUp: "#26a69a",
  wickDown: "#ef5350",
  background: "#0b0b12",
  gridColor: "rgba(255,255,255,0.05)",
  textColor: "#94a3b8",
  showGrid: true,
  showVolume: true,
  showCrosshair: true,
  logScale: false,
  showWatermark: true,
  rightOffset: 12,
};

export const DRAWING_TOOLS: { tool: DrawingTool; label: string }[] = [
  { tool: "cursor", label: "Cursor" },
  { tool: "trend", label: "Trend line" },
  { tool: "ray", label: "Ray" },
  { tool: "hline", label: "Horizontal line" },
  { tool: "vline", label: "Vertical line" },
  { tool: "rect", label: "Rectangle" },
  { tool: "fib", label: "Fib retracement" },
  { tool: "measure", label: "Measure" },
  { tool: "text", label: "Text note" },
  { tool: "erase", label: "Erase drawing" },
];

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];