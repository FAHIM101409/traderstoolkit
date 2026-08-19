import { createServerFn } from "@tanstack/react-start";
import { fetchTwelveDataSeries } from "./marketdata.server";
import type { CandleResponse } from "./marketdata";

export type CandleRequest = {
  symbol: string;
  interval: string;
  outputsize?: number;
  end?: string | null;
};

export const fetchCandles = createServerFn({ method: "GET" })
  .inputValidator((data: CandleRequest) => ({
    symbol: String(data.symbol || "EURUSD"),
    interval: String(data.interval || "1H"),
    outputsize: Math.min(Math.max(Number(data.outputsize) || 5000, 50), 5000),
    end: data.end ? String(data.end) : null,
  }))
  .handler(async ({ data }): Promise<CandleResponse> => {
    return fetchTwelveDataSeries(data);
  });