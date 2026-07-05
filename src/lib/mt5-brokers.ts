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

// The list above is only for autocomplete suggestions. The connect form always
// allows free-text entry, so any MT5 broker worldwide can be entered manually.
// Below: additional brokers & prop firms commonly used by our traders. Server
// names differ per region — traders can enter the exact server from MT5.
MT5_BROKERS.push(
  { name: "The 5%ers", servers: ["The5ers-Live", "The5ers-Demo"] },
  { name: "Alpha Capital Group", servers: ["AlphaCapitalGroup-Live", "AlphaCapitalGroup-Demo"] },
  { name: "Goat Funded Trader", servers: ["GoatFundedTrader-Live", "GoatFundedTrader-Demo"] },
  { name: "AquaFunded", servers: ["AquaFunded-Live", "AquaFunded-Demo"] },
  { name: "Blueberry Funded", servers: ["BlueberryFunded-Live", "BlueberryFunded-Demo"] },
  { name: "City Traders Imperium", servers: ["CityTradersImperium-Live", "CityTradersImperium-Demo"] },
  { name: "SurgeTrader", servers: ["SurgeTrader-Live", "SurgeTrader-Demo"] },
  { name: "Lux Trading Firm", servers: ["LuxTradingFirm-Live"] },
  { name: "SmartProp Trader", servers: ["SmartPropTrader-Live", "SmartPropTrader-Demo"] },
  { name: "MyFundedFX", servers: ["MyFundedFX-Live", "MyFundedFX-Demo"] },
  { name: "PipFarm", servers: ["PipFarm-Live", "PipFarm-Demo"] },
  { name: "For Traders", servers: ["ForTraders-Live", "ForTraders-Demo"] },
  { name: "Instant Funding", servers: ["InstantFunding-Live", "InstantFunding-Demo"] },
  { name: "Fusion Markets", servers: ["FusionMarkets-Live", "FusionMarkets-Demo"] },
  { name: "Forex.com", servers: ["FOREX.com-Live 535", "FOREX.com-Demo 535"] },
  { name: "RoboForex", servers: ["RoboForex-ECN", "RoboForex-Pro", "RoboForex-Demo"] },
  { name: "AvaTrade", servers: ["AVATRADE-Real", "AVATRADE-Demo"] },
  { name: "Axi", servers: ["AxiCorp-Live", "AxiCorp-Demo"] },
  { name: "Swissquote", servers: ["Swissquote-Server", "Swissquote-Demo"] },
  { name: "Dukascopy", servers: ["Dukascopy-live-mt5", "Dukascopy-demo-mt5"] },
  { name: "GO Markets", servers: ["GOMarkets-Live", "GOMarkets-Demo"] },
  { name: "IG", servers: ["IG-Live", "IG-Demo"] },
  { name: "CMC Markets", servers: ["CMC-Live", "CMC-Demo"] },
  { name: "Global Prime", servers: ["GlobalPrime-Live", "GlobalPrime-Demo"] },
  { name: "TMGM", servers: ["TMGM-Live", "TMGM-Demo"] },
  { name: "Pip Trader", servers: ["PipTrader-Live", "PipTrader-Demo"] },
  { name: "Traders With Edge", servers: ["TradersWithEdge-Live", "TradersWithEdge-Demo"] },
  { name: "Maven Trading", servers: ["MavenTrading-Live", "MavenTrading-Demo"] },
  { name: "FundedFX", servers: ["FundedFX-Live", "FundedFX-Demo"] },
  { name: "OspreyFX", servers: ["OspreyFX-Live", "OspreyFX-Demo"] },
);