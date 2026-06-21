// Common MT5 brokers with their typical server name patterns.
// Users can also type a custom server if their broker isn't listed.
export type BrokerInfo = { name: string; servers: string[] };

export const MT5_BROKERS: BrokerInfo[] = [
  { name: "IC Markets", servers: ["ICMarketsSC-MT5", "ICMarketsSC-Demo", "ICMarketsSC-MT5-2", "ICMarkets-Live15", "ICMarkets-Live22"] },
  { name: "Pepperstone", servers: ["Pepperstone-MT5-Live01", "Pepperstone-MT5-Live02", "Pepperstone-Demo"] },
  { name: "Exness", servers: ["Exness-MT5Real", "Exness-MT5Real2", "Exness-MT5Real6", "Exness-MT5Real8", "Exness-MT5Trial"] },
  { name: "FTMO", servers: ["FTMO-Server", "FTMO-Server2", "FTMO-Server3", "FTMO-Demo"] },
  { name: "FundedNext", servers: ["FundedNext-Server", "FundedNext-Server2", "FundedNext-Demo"] },
  { name: "The Funded Trader", servers: ["TheFundedTraderGlobal-Live", "TheFundedTraderGlobal-Demo"] },
  { name: "MyForexFunds", servers: ["MyForexFunds-Live", "MyForexFunds-Demo"] },
  { name: "Funding Pips", servers: ["FundingPips-Server", "FundingPips-Demo"] },
  { name: "E8 Funding", servers: ["E8Funding-Live", "E8Funding-Demo"] },
  { name: "Funding Traders", servers: ["FundingTraders-Live", "FundingTraders-Demo"] },
  { name: "HFM (HotForex)", servers: ["HFMarketsSV-Live", "HFMarketsSV-Demo", "HFMarketsKE-Live"] },
  { name: "XM", servers: ["XMGlobal-MT5", "XMGlobal-MT5 2", "XMGlobal-Demo"] },
  { name: "FBS", servers: ["FBS-Real", "FBS-Real-3", "FBS-Demo"] },
  { name: "OANDA", servers: ["OANDA-v20 Live", "OANDA-v20 Practice"] },
  { name: "Tickmill", servers: ["TickmillUK-Live", "Tickmill-Live", "Tickmill-Demo"] },
  { name: "Admirals", servers: ["AdmiralMarkets-Live", "AdmiralMarkets-Demo"] },
  { name: "FxPro", servers: ["FxPro-MT5", "FxPro-MT5-Demo"] },
  { name: "ThinkMarkets", servers: ["ThinkMarkets-Live", "ThinkMarkets-Demo"] },
  { name: "Vantage", servers: ["VantageInternational-Live", "VantageInternational-Demo"] },
  { name: "Eightcap", servers: ["Eightcap-Live", "Eightcap-Demo"] },
  { name: "BlackBull Markets", servers: ["BlackBull-Live", "BlackBull-Demo"] },
  { name: "Hankotrade", servers: ["Hankotrade-Live", "Hankotrade-Demo"] },
];