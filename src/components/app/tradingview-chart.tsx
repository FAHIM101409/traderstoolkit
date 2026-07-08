import { useEffect, useRef } from "react";

type Props = {
  symbol?: string;
  interval?: string;
  height?: number | string;
  className?: string;
};

// Loads TradingView's Advanced Chart widget. The tv.js loader script is
// idempotent — TradingView guards against duplicate registrations.
export function TradingViewChart({
  symbol = "FX:EURUSD",
  interval = "60",
  height = 560,
  className,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const containerId = useRef(`tv_${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;

    const mount = () => {
      if (cancelled) return;
      const TV = (window as any).TradingView;
      if (!TV || !TV.widget) return;
      host.innerHTML = `<div id="${containerId.current}" style="height:100%;width:100%"></div>`;
      // eslint-disable-next-line no-new
      new TV.widget({
        autosize: true,
        symbol,
        interval,
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#0b0b12",
        enable_publishing: false,
        withdateranges: true,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        details: true,
        hotlist: true,
        calendar: true,
        watchlist: [
          "FX:EURUSD","FX:GBPUSD","FX:USDJPY","OANDA:XAUUSD",
          "BINANCE:BTCUSDT","BINANCE:ETHUSDT","OANDA:NAS100USD","OANDA:SPX500USD",
        ],
        studies: [],
        show_popup_button: true,
        popup_width: "1000",
        popup_height: "650",
        save_image: true,
        enabled_features: ["header_saveload", "use_localstorage_for_settings", "study_templates"],
        container_id: containerId.current,
        backgroundColor: "rgba(11,11,18,1)",
        gridColor: "rgba(255,255,255,0.06)",
      });
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://s3.tradingview.com/tv.js"]',
    );
    if ((window as any).TradingView?.widget) {
      mount();
    } else if (existing) {
      existing.addEventListener("load", mount, { once: true });
    } else {
      const s = document.createElement("script");
      s.src = "https://s3.tradingview.com/tv.js";
      s.async = true;
      s.onload = mount;
      document.head.appendChild(s);
    }

    return () => {
      cancelled = true;
      if (host) host.innerHTML = "";
    };
  }, [symbol, interval]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ height, width: "100%" }}
    />
  );
}

// Common trading symbols mapped to TradingView exchange-qualified symbols.
export const TV_SYMBOLS: { label: string; value: string; group: string }[] = [
  { group: "Forex", label: "EUR / USD", value: "FX:EURUSD" },
  { group: "Forex", label: "GBP / USD", value: "FX:GBPUSD" },
  { group: "Forex", label: "USD / JPY", value: "FX:USDJPY" },
  { group: "Forex", label: "AUD / USD", value: "FX:AUDUSD" },
  { group: "Forex", label: "USD / CAD", value: "FX:USDCAD" },
  { group: "Forex", label: "USD / CHF", value: "FX:USDCHF" },
  { group: "Forex", label: "NZD / USD", value: "FX:NZDUSD" },
  { group: "Metals", label: "Gold (XAU/USD)", value: "OANDA:XAUUSD" },
  { group: "Metals", label: "Silver (XAG/USD)", value: "OANDA:XAGUSD" },
  { group: "Crypto", label: "BTC / USD", value: "BINANCE:BTCUSDT" },
  { group: "Crypto", label: "ETH / USD", value: "BINANCE:ETHUSDT" },
  { group: "Crypto", label: "SOL / USD", value: "BINANCE:SOLUSDT" },
  { group: "Indices", label: "NAS 100", value: "OANDA:NAS100USD" },
  { group: "Indices", label: "S&P 500", value: "OANDA:SPX500USD" },
  { group: "Indices", label: "US 30", value: "OANDA:US30USD" },
  { group: "Indices", label: "GER 40 (DAX)", value: "OANDA:DE30EUR" },
  { group: "Stocks", label: "Apple", value: "NASDAQ:AAPL" },
  { group: "Stocks", label: "Tesla", value: "NASDAQ:TSLA" },
  { group: "Stocks", label: "Nvidia", value: "NASDAQ:NVDA" },
];

export const TV_INTERVALS: { label: string; value: string }[] = [
  { label: "1m", value: "1" },
  { label: "3m", value: "3" },
  { label: "5m", value: "5" },
  { label: "15m", value: "15" },
  { label: "30m", value: "30" },
  { label: "1H", value: "60" },
  { label: "2H", value: "120" },
  { label: "4H", value: "240" },
  { label: "1D", value: "D" },
  { label: "1W", value: "W" },
  { label: "1M", value: "M" },
];