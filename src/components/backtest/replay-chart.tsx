import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  createChart, CandlestickSeries, BarSeries, LineSeries, AreaSeries, HistogramSeries,
  createSeriesMarkers, ColorType, CrosshairMode, LineStyle,
  type IChartApi, type ISeriesApi, type IPriceLine, type Time,
} from "lightweight-charts";
import type { Candle } from "@/lib/marketdata";
import { computeIndicator, heikinAshi, INDICATOR_META, type IndicatorConfig } from "@/lib/indicators";
import type { BacktestTrade } from "@/lib/backtest";
import { DEFAULT_CHART_SETTINGS, FIB_LEVELS, type ChartSettings, type Drawing, type DrawingTool, type DrawPoint } from "./chart-types";
import { cn } from "@/lib/utils";

type LevelKey = "entry" | "sl" | "tp";

export type ReplayChartProps = {
  candles: Candle[];
  settings?: Partial<ChartSettings>;
  indicators?: IndicatorConfig[];
  positions?: BacktestTrade[];
  closedTrades?: BacktestTrade[];
  digits?: number;
  symbol?: string;
  timeframe?: string;
  activeTool?: DrawingTool;
  drawings?: Drawing[];
  drawColor?: string;
  onDrawingsChange?: (next: Drawing[]) => void;
  onToolDone?: () => void;
  onCrosshair?: (info: { price: number | null; time: number | null; candle: Candle | null }) => void;
  onLevelDrag?: (tradeId: string, key: LevelKey, price: number) => void;
  className?: string;
};

const uid = () => Math.random().toString(36).slice(2, 10);

export function ReplayChart(props: ReplayChartProps) {
  const settings: ChartSettings = { ...DEFAULT_CHART_SETTINGS, ...props.settings };
  const {
    candles, indicators = [], positions = [], closedTrades = [],
    digits = 5, activeTool = "cursor", drawings = [], drawColor = "#38bdf8",
  } = props;

  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainRef = useRef<ISeriesApi<any> | null>(null);
  const volRef = useRef<ISeriesApi<any> | null>(null);
  const indicatorRefs = useRef<ISeriesApi<any>[]>([]);
  const priceLines = useRef<IPriceLine[]>([]);
  const markersRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [handles, setHandles] = useState<{ tradeId: string; key: LevelKey; y: number; price: number; label: string; color: string }[]>([]);
  const draftRef = useRef<DrawPoint[]>([]);
  const [seriesVersion, setSeriesVersion] = useState(0);
  const repaintRef = useRef<() => void>(() => {});
  const fittedDataKeyRef = useRef("");

  const data = useMemo(
    () => (settings.style === "heikin" ? heikinAshi(candles) : candles),
    [candles, settings.style],
  );

  // ---------------------------------------------------------------- chart
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const chart = createChart(host, {
      layout: {
        background: { type: ColorType.Solid, color: settings.background },
        textColor: settings.textColor,
        attributionLogo: false,
        panes: { separatorColor: "rgba(255,255,255,0.08)" },
      },
      grid: {
        vertLines: { color: settings.showGrid ? settings.gridColor : "transparent" },
        horzLines: { color: settings.showGrid ? settings.gridColor : "transparent" },
      },
      crosshair: { mode: settings.showCrosshair ? CrosshairMode.Normal : CrosshairMode.Hidden },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)", mode: settings.logScale ? 1 : 0 },
      timeScale: {
        borderColor: "rgba(255,255,255,0.1)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: settings.rightOffset,
      },
      autoSize: true,
      handleScroll: true,
      handleScale: true,
    });
    chartRef.current = chart;
    const readyFrame = window.requestAnimationFrame(() => setReady(true));
    return () => {
      window.cancelAnimationFrame(readyFrame);
      chart.remove();
      chartRef.current = null;
      mainRef.current = null;
      volRef.current = null;
      indicatorRefs.current = [];
      priceLines.current = [];
      markersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live option updates
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({
      layout: { background: { type: ColorType.Solid, color: settings.background }, textColor: settings.textColor },
      grid: {
        vertLines: { color: settings.showGrid ? settings.gridColor : "transparent" },
        horzLines: { color: settings.showGrid ? settings.gridColor : "transparent" },
      },
      crosshair: { mode: settings.showCrosshair ? CrosshairMode.Normal : CrosshairMode.Hidden },
      rightPriceScale: { mode: settings.logScale ? 1 : 0 },
      timeScale: { rightOffset: settings.rightOffset },
    });
  }, [settings.background, settings.textColor, settings.showGrid, settings.gridColor, settings.showCrosshair, settings.logScale, settings.rightOffset]);

  // ------------------------------------------------------- main + volume
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready) return;
    if (mainRef.current) { chart.removeSeries(mainRef.current); mainRef.current = null; }
    if (volRef.current) { chart.removeSeries(volRef.current); volRef.current = null; }
    markersRef.current = null;
    priceLines.current = [];

    const priceFormat = { type: "price" as const, precision: digits, minMove: Math.pow(10, -digits) };
    let series: ISeriesApi<any>;
    if (settings.style === "line") {
      series = chart.addSeries(LineSeries, { color: settings.upColor, lineWidth: 2, priceFormat });
    } else if (settings.style === "area") {
      series = chart.addSeries(AreaSeries, { lineColor: settings.upColor, topColor: `${settings.upColor}55`, bottomColor: "transparent", priceFormat });
    } else if (settings.style === "bars") {
      series = chart.addSeries(BarSeries, { upColor: settings.upColor, downColor: settings.downColor, priceFormat });
    } else {
      series = chart.addSeries(CandlestickSeries, {
        upColor: settings.upColor, downColor: settings.downColor,
        borderUpColor: settings.upColor, borderDownColor: settings.downColor,
        wickUpColor: settings.wickUp, wickDownColor: settings.wickDown,
        priceFormat,
      });
    }
    mainRef.current = series;
    if (settings.style === "line" || settings.style === "area") {
      series.setData(data.map((c) => ({ time: c.time as Time, value: c.close })));
    } else {
      series.setData(data.map((c) => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close })));
    }

    if (settings.showVolume) {
      const vol = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
        color: "rgba(148,163,184,0.4)",
      });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      vol.setData(data.map((c) => ({
        time: c.time as Time,
        value: c.volume,
        color: c.close >= c.open ? "rgba(38,166,154,0.35)" : "rgba(239,83,80,0.35)",
      })));
      volRef.current = vol;
    }
    if (data.length) window.requestAnimationFrame(() => {
      const host = hostRef.current;
      if (host) chart.resize(host.clientWidth, host.clientHeight, true);
      chart.timeScale().fitContent();
      window.requestAnimationFrame(() => {
        const last = data[data.length - 1];
        void last;
        repaintRef.current();
      });
    });
    setSeriesVersion((n) => n + 1);
  }, [ready, settings.style, settings.upColor, settings.downColor, settings.wickUp, settings.wickDown, settings.showVolume, digits, data]);

  // Data updates
  useEffect(() => {
    const s = mainRef.current;
    if (!s) return;
    if (settings.style === "line" || settings.style === "area") {
      s.setData(data.map((c) => ({ time: c.time as Time, value: c.close })));
    } else {
      s.setData(data.map((c) => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close })));
    }
    if (volRef.current) {
      volRef.current.setData(
        data.map((c) => ({
          time: c.time as Time,
          value: c.volume,
          color: c.close >= c.open ? "rgba(38,166,154,0.35)" : "rgba(239,83,80,0.35)",
        })),
      );
    }
    const dataKey = `${props.symbol ?? ""}:${props.timeframe ?? ""}:${data[0]?.time ?? 0}`;
    if (data.length && fittedDataKeyRef.current !== dataKey) {
      fittedDataKeyRef.current = dataKey;
      window.requestAnimationFrame(() => {
        const chart = chartRef.current;
        if (!chart) return;
        chart.timeScale().fitContent();
      });
    }
    repaintRef.current();
  }, [data, ready, seriesVersion, settings.style, settings.showVolume, settings.rightOffset, props.symbol, props.timeframe]);

  // ------------------------------------------------------------ indicators
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready || !mainRef.current) return;
    indicatorRefs.current.forEach((s) => { try { chart.removeSeries(s); } catch { /* removed with pane */ } });
    indicatorRefs.current = [];

    let pane = 1;
    for (const cfg of indicators.filter((i) => i.visible)) {
      const res = computeIndicator(cfg, data);
      const isSub = INDICATOR_META[cfg.kind].pane === "sub";
      const paneIndex = isSub ? pane++ : 0;
      if (res.histogram) {
        const h = chart.addSeries(HistogramSeries, { color: "rgba(96,165,250,0.5)", priceLineVisible: false, lastValueVisible: false }, paneIndex);
        h.setData(res.histogram.points.map((p) => ({ time: p.time as Time, value: p.value, color: p.value >= 0 ? "rgba(38,166,154,0.5)" : "rgba(239,83,80,0.5)" })));
        indicatorRefs.current.push(h);
      }
      for (const line of res.lines) {
        const l = chart.addSeries(LineSeries, {
          color: line.color,
          lineWidth: (line.lineWidth ?? 2) as 1 | 2 | 3,
          priceLineVisible: false,
          lastValueVisible: false,
          title: line.key,
        }, paneIndex);
        l.setData(line.points.map((p) => ({ time: p.time as Time, value: p.value })));
        indicatorRefs.current.push(l);
      }
      if (isSub && res.levels?.length) {
        const anchor = indicatorRefs.current[indicatorRefs.current.length - 1];
        res.levels.forEach((lv) =>
          anchor?.createPriceLine({ price: lv, color: "rgba(148,163,184,0.35)", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: "" }),
        );
      }
      if (isSub) {
        try { chart.panes()[paneIndex]?.setHeight(120); } catch { /* pane sizing best effort */ }
      }
    }
  }, [indicators, data, ready, seriesVersion]);

  // ---------------------------------------------------- position price lines
  useEffect(() => {
    const s = mainRef.current;
    if (!s) return;
    priceLines.current.forEach((l) => { try { s.removePriceLine(l); } catch { /* series replaced */ } });
    priceLines.current = [];
    const live = positions.filter((p) => p.status === "open" || p.status === "pending");
    for (const p of live) {
      const dirColor = p.direction === "long" ? "#22c55e" : "#ef4444";
      if (p.entry != null) {
        priceLines.current.push(s.createPriceLine({
          price: p.entry, color: p.status === "pending" ? "#eab308" : dirColor, lineWidth: 1,
          lineStyle: p.status === "pending" ? LineStyle.Dotted : LineStyle.Solid,
          axisLabelVisible: true,
          title: `${p.status === "pending" ? "PEND " : ""}${p.direction === "long" ? "BUY" : "SELL"} ${p.lots}`,
        }));
      }
      if (p.sl != null) {
        priceLines.current.push(s.createPriceLine({ price: p.sl, color: "#ef4444", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "SL" }));
      }
      if (p.tp != null) {
        priceLines.current.push(s.createPriceLine({ price: p.tp, color: "#22c55e", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "TP" }));
      }
    }
    repaintRef.current();
  }, [positions, data, seriesVersion]);

  // ------------------------------------------------------------- markers
  useEffect(() => {
    const s = mainRef.current;
    if (!s) return;
    const marks: any[] = [];
    for (const t of closedTrades) {
      if (t.opened_at && t.entry != null) {
        marks.push({
          time: Math.floor(Date.parse(t.opened_at) / 1000) as Time,
          position: t.direction === "long" ? "belowBar" : "aboveBar",
          color: t.direction === "long" ? "#22c55e" : "#ef4444",
          shape: t.direction === "long" ? "arrowUp" : "arrowDown",
          text: `${t.direction === "long" ? "B" : "S"} ${t.lots}`,
        });
      }
      if (t.closed_at && t.exit != null) {
        marks.push({
          time: Math.floor(Date.parse(t.closed_at) / 1000) as Time,
          position: t.direction === "long" ? "aboveBar" : "belowBar",
          color: (t.pnl ?? 0) >= 0 ? "#38bdf8" : "#f97316",
          shape: "square",
          text: `${(t.pnl ?? 0) >= 0 ? "+" : ""}${(t.pnl ?? 0).toFixed(0)}`,
        });
      }
    }
    marks.sort((a, b) => (a.time as number) - (b.time as number));
    if (!markersRef.current) markersRef.current = createSeriesMarkers(s, marks);
    else markersRef.current.setMarkers(marks);
  }, [closedTrades, data, seriesVersion]);

  // ------------------------------------------------------- crosshair report
  useEffect(() => {
    const chart = chartRef.current;
    const s = mainRef.current;
    if (!chart || !s || !props.onCrosshair) return;
    const handler = (param: any) => {
      const price = param.seriesData?.get(s);
      const value = price ? (price.close ?? price.value ?? null) : null;
      const time = (param.time as number) ?? null;
      const candle = time === null ? null : data.find((item) => item.time === time) ?? null;
      props.onCrosshair?.({ price: value ?? null, time, candle });
    };
    chart.subscribeCrosshairMove(handler);
    return () => chart.unsubscribeCrosshairMove(handler);
  }, [ready, seriesVersion, props.onCrosshair, data]);

  // ------------------------------------------------------- drawing overlay
  useEffect(() => {
    const chart = chartRef.current;
    const s = mainRef.current;
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!chart || !s || !canvas || !host) return;

    const paint = () => {
      const rect = host.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const ts = chart.timeScale();
      const x = (logical: number) => ts.logicalToCoordinate(logical as any);
      const y = (price: number) => s.priceToCoordinate(price);

      // Lightweight Charts can occasionally retain a transparent series layer
      // after a hidden dialog mount. Paint the same real OHLC data on the
      // interaction canvas so the replay never presents an empty workspace.
      const visibleStart = Math.max(0, data.length - 180);
      const visibleBars = data.slice(visibleStart);
      const chartWidth = Math.max(1, rect.width - 66);
      const chartHeight = Math.max(1, rect.height - 28);
      const minPrice = Math.min(...visibleBars.map((c) => c.low));
      const maxPrice = Math.max(...visibleBars.map((c) => c.high));
      const priceSpan = Math.max(Number.EPSILON, maxPrice - minPrice);
      const candleX = (index: number) => ((index - visibleStart + 0.5) / Math.max(1, visibleBars.length)) * chartWidth;
      const candleY = (price: number) => 12 + ((maxPrice - price) / priceSpan) * Math.max(1, chartHeight - 24);
      const spacing = chartWidth / Math.max(1, visibleBars.length);
      const bodyWidth = Math.max(1, Math.min(10, spacing * 0.72));
      ctx.lineWidth = 1;
      if (settings.style === "line" || settings.style === "area") {
        ctx.beginPath();
        let started = false;
        for (let i = visibleStart; i < data.length; i++) {
          const cx = candleX(i), cy = candleY(data[i].close);
          if (!started) { ctx.moveTo(cx, cy); started = true; } else ctx.lineTo(cx, cy);
        }
        ctx.strokeStyle = settings.upColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        for (let i = visibleStart; i < data.length; i++) {
          const c = data[i];
          const cx = candleX(i), openY = candleY(c.open), closeY = candleY(c.close), highY = candleY(c.high), lowY = candleY(c.low);
          const color = c.close >= c.open ? settings.upColor : settings.downColor;
          ctx.strokeStyle = color;
          ctx.fillStyle = color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx, highY);
          ctx.lineTo(cx, lowY);
          ctx.stroke();
          if (settings.style === "bars") {
            ctx.beginPath();
            ctx.moveTo(cx - bodyWidth / 2, openY);
            ctx.lineTo(cx, openY);
            ctx.moveTo(cx, closeY);
            ctx.lineTo(cx + bodyWidth / 2, closeY);
            ctx.stroke();
          } else {
            ctx.fillRect(cx - bodyWidth / 2, Math.min(openY, closeY), bodyWidth, Math.max(1, Math.abs(closeY - openY)));
          }
        }
      }

      const all = [...drawings];
      if (draftRef.current.length) {
        all.push({ id: "__draft", tool: (activeTool === "cursor" || activeTool === "erase" ? "trend" : activeTool) as Drawing["tool"], points: draftRef.current, color: drawColor, width: 2 });
      }

      for (const d of all) {
        const pts = d.points.map((p) => ({ x: x(p.logical), y: y(p.price) }));
        if (pts.some((p) => p.x === null || p.y === null)) continue;
        const P = pts as { x: number; y: number }[];
        ctx.strokeStyle = d.color;
        ctx.fillStyle = d.color;
        ctx.lineWidth = d.width;
        ctx.setLineDash([]);
        ctx.beginPath();
        switch (d.tool) {
          case "trend":
            if (P.length < 2) break;
            ctx.moveTo(P[0].x, P[0].y); ctx.lineTo(P[1].x, P[1].y); ctx.stroke();
            break;
          case "ray": {
            if (P.length < 2) break;
            const dx = P[1].x - P[0].x, dy = P[1].y - P[0].y;
            const k = dx === 0 ? 1e4 : (rect.width * 2) / Math.abs(dx);
            ctx.moveTo(P[0].x, P[0].y); ctx.lineTo(P[0].x + dx * k, P[0].y + dy * k); ctx.stroke();
            break;
          }
          case "hline":
            ctx.moveTo(0, P[0].y); ctx.lineTo(rect.width, P[0].y); ctx.stroke();
            break;
          case "vline":
            ctx.moveTo(P[0].x, 0); ctx.lineTo(P[0].x, rect.height); ctx.stroke();
            break;
          case "rect": {
            if (P.length < 2) break;
            ctx.globalAlpha = 0.12;
            ctx.fillRect(P[0].x, P[0].y, P[1].x - P[0].x, P[1].y - P[0].y);
            ctx.globalAlpha = 1;
            ctx.strokeRect(P[0].x, P[0].y, P[1].x - P[0].x, P[1].y - P[0].y);
            break;
          }
          case "fib": {
            if (P.length < 2) break;
            const p0 = d.points[0].price, p1 = d.points[1].price;
            ctx.font = "10px ui-sans-serif, system-ui";
            FIB_LEVELS.forEach((lv) => {
              const price = p0 + (p1 - p0) * lv;
              const yy = y(price);
              if (yy === null) return;
              ctx.setLineDash([4, 3]);
              ctx.beginPath();
              ctx.moveTo(Math.min(P[0].x, P[1].x), yy);
              ctx.lineTo(Math.max(P[0].x, P[1].x), yy);
              ctx.stroke();
              ctx.fillText(`${(lv * 100).toFixed(1)}%  ${price.toFixed(digits)}`, Math.max(P[0].x, P[1].x) + 4, yy - 2);
            });
            ctx.setLineDash([]);
            break;
          }
          case "measure": {
            if (P.length < 2) break;
            ctx.setLineDash([5, 4]);
            ctx.strokeRect(P[0].x, P[0].y, P[1].x - P[0].x, P[1].y - P[0].y);
            ctx.setLineDash([]);
            const diff = d.points[1].price - d.points[0].price;
            const pct = d.points[0].price ? (diff / d.points[0].price) * 100 : 0;
            const bars = Math.abs(Math.round(d.points[1].logical - d.points[0].logical));
            ctx.font = "11px ui-sans-serif, system-ui";
            ctx.fillText(`${diff >= 0 ? "+" : ""}${diff.toFixed(digits)} (${pct.toFixed(2)}%) · ${bars} bars`, P[1].x + 6, P[1].y);
            break;
          }
          case "text":
            ctx.font = "12px ui-sans-serif, system-ui";
            ctx.fillText(d.text || "Note", P[0].x, P[0].y);
            break;
        }
      }
    };

    repaintRef.current = paint;
    paint();
    const ts = chart.timeScale();
    const onRange = () => paint();
    ts.subscribeVisibleLogicalRangeChange(onRange);
    const ro = new ResizeObserver(() => paint());
    ro.observe(host);
    return () => {
      ts.unsubscribeVisibleLogicalRangeChange(onRange);
      ro.disconnect();
    };
  }, [drawings, activeTool, drawColor, digits, ready, data]);

  // Pointer handling for drawing creation / erasing
  useEffect(() => {
    const canvas = canvasRef.current;
    const chart = chartRef.current;
    const s = mainRef.current;
    if (!canvas || !chart || !s) return;
    if (activeTool === "cursor") return;

    const toPoint = (e: PointerEvent): DrawPoint | null => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const logical = chart.timeScale().coordinateToLogical(px);
      const price = s.coordinateToPrice(py);
      if (logical === null || price === null) return null;
      return { logical: logical as number, price: price as number };
    };

    const single = activeTool === "hline" || activeTool === "vline" || activeTool === "text";

    const onDown = (e: PointerEvent) => {
      const p = toPoint(e);
      if (!p) return;
      if (activeTool === "erase") {
        const rect = canvas.getBoundingClientRect();
        const py = e.clientY - rect.top;
        let bestId: string | null = null;
        let best = 14;
        for (const d of drawings) {
          for (const dp of d.points) {
            const yy = s.priceToCoordinate(dp.price);
            const xx = chart.timeScale().logicalToCoordinate(dp.logical as any);
            if (yy === null) continue;
            const dist = d.tool === "hline" ? Math.abs(yy - py) : Math.hypot((xx ?? 0) - (e.clientX - rect.left), yy - py);
            if (dist < best) { best = dist; bestId = d.id; }
          }
        }
        if (bestId) props.onDrawingsChange?.(drawings.filter((d) => d.id !== bestId));
        return;
      }
      if (single) {
        const text = activeTool === "text" ? window.prompt("Note text", "") ?? "" : undefined;
        props.onDrawingsChange?.([...drawings, { id: uid(), tool: activeTool as Drawing["tool"], points: [p], color: drawColor, width: 2, text }]);
        props.onToolDone?.();
        return;
      }
      draftRef.current = [p, p];
      canvas.setPointerCapture(e.pointerId);
      repaintRef.current();
    };
    const onMove = (e: PointerEvent) => {
      if (draftRef.current.length !== 2) return;
      const p = toPoint(e);
      if (!p) return;
      draftRef.current = [draftRef.current[0], p];
      repaintRef.current();
    };
    const onUp = () => {
      if (draftRef.current.length === 2) {
        const [a, b] = draftRef.current;
        draftRef.current = [];
        if (Math.abs(a.logical - b.logical) > 0.2 || Math.abs(a.price - b.price) > 0) {
          props.onDrawingsChange?.([...drawings, { id: uid(), tool: activeTool as Drawing["tool"], points: [a, b], color: drawColor, width: 2 }]);
        }
        props.onToolDone?.();
        repaintRef.current();
      }
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };
  }, [activeTool, drawings, drawColor, props.onDrawingsChange, props.onToolDone, ready]);

  // ---------------------------------------------- draggable SL / TP handles
  useEffect(() => {
    const chart = chartRef.current;
    const s = mainRef.current;
    if (!chart || !s) return;
    const recompute = () => {
      const out: typeof handles = [];
      for (const p of positions) {
        if (p.status !== "open" && p.status !== "pending") continue;
        const rows: [LevelKey, number | null, string, string][] = [
          ["entry", p.entry, p.status === "pending" ? "ENTRY" : "E", p.status === "pending" ? "#eab308" : "#38bdf8"],
          ["sl", p.sl, "SL", "#ef4444"],
          ["tp", p.tp, "TP", "#22c55e"],
        ];
        for (const [key, price, label, color] of rows) {
          if (price == null) continue;
          const y = s.priceToCoordinate(price);
          if (y === null) continue;
          out.push({ tradeId: p.id, key, y, price, label, color });
        }
      }
      setHandles(out);
    };
    recompute();
    const onRange = () => recompute();
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);
    const id = window.setInterval(recompute, 400);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
      window.clearInterval(id);
    };
  }, [positions, data, ready]);

  function startHandleDrag(e: React.PointerEvent, h: { tradeId: string; key: LevelKey }) {
    e.preventDefault();
    e.stopPropagation();
    const s = mainRef.current;
    const host = hostRef.current;
    if (!s || !host) return;
    const rect = host.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const price = s.coordinateToPrice(ev.clientY - rect.top);
      if (price !== null) props.onLevelDrag?.(h.tradeId, h.key, price as number);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const visibleCandles = data.slice(-180);
  const visibleMin = visibleCandles.length ? Math.min(...visibleCandles.map((c) => c.low)) : 0;
  const visibleMax = visibleCandles.length ? Math.max(...visibleCandles.map((c) => c.high)) : 1;
  const visibleSpan = Math.max(Number.EPSILON, visibleMax - visibleMin);

  return (
    <div className={cn("relative h-full w-full", props.className)}>
      <div ref={hostRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-y-0 left-0 right-[66px] bottom-7 overflow-hidden" aria-hidden="true">
        {visibleCandles.map((c, index) => {
          const left = ((index + 0.5) / visibleCandles.length) * 100;
          const high = ((visibleMax - c.high) / visibleSpan) * 94 + 3;
          const low = ((visibleMax - c.low) / visibleSpan) * 94 + 3;
          const open = ((visibleMax - c.open) / visibleSpan) * 94 + 3;
          const close = ((visibleMax - c.close) / visibleSpan) * 94 + 3;
          const color = c.close >= c.open ? settings.upColor : settings.downColor;
          const width = Math.max(1, 72 / visibleCandles.length);
          return (
            <div key={c.time} className="absolute inset-y-0" style={{ left: `${left}%`, width: `${width}%` }}>
              <span className="absolute left-1/2 w-px -translate-x-1/2" style={{ top: `${high}%`, height: `${Math.max(0.08, low - high)}%`, backgroundColor: color }} />
              <span className="absolute left-0.5 right-0.5" style={{ top: `${Math.min(open, close)}%`, height: `${Math.max(0.12, Math.abs(close - open))}%`, backgroundColor: color }} />
            </div>
          );
        })}
      </div>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ pointerEvents: activeTool === "cursor" ? "none" : "auto", cursor: activeTool === "erase" ? "not-allowed" : "crosshair" }}
      />
      {settings.showWatermark && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-5xl font-bold tracking-tight text-foreground/5">
          {props.symbol} · {props.timeframe}
        </div>
      )}
      {handles.map((h) => (
        <button
          key={`${h.tradeId}-${h.key}`}
          onPointerDown={(e) => startHandleDrag(e, h)}
          className="absolute z-20 -translate-y-1/2 rounded px-1.5 py-0.5 text-[10px] font-bold text-background shadow"
          style={{ top: h.y, right: 76, background: h.color, cursor: "ns-resize", touchAction: "none" }}
          title={`Drag to move ${h.label}`}
        >
          {h.label} {h.price.toFixed(digits)}
        </button>
      ))}
    </div>
  );
}