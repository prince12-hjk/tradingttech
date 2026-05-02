// Asset registry. Crypto uses Binance for live data + AI analysis.
// Stocks/Forex render in TradingView widget (chart works) but AI analysis
// is currently crypto-only (Binance public API). We surface this clearly in UI.

export type AssetClass = "crypto" | "stock" | "forex";

export interface SymbolEntry {
  symbol: string;          // canonical key, e.g. BTCUSDT, AAPL, EURUSD
  display: string;         // friendly label
  tvSymbol: string;        // TradingView symbol, e.g. BINANCE:BTCUSDT, NASDAQ:AAPL, FX:EURUSD
  asset: AssetClass;
}

export const POPULAR_SYMBOLS: SymbolEntry[] = [
  // Crypto
  { symbol: "BTCUSDT",  display: "Bitcoin",   tvSymbol: "BINANCE:BTCUSDT",  asset: "crypto" },
  { symbol: "ETHUSDT",  display: "Ethereum",  tvSymbol: "BINANCE:ETHUSDT",  asset: "crypto" },
  { symbol: "SOLUSDT",  display: "Solana",    tvSymbol: "BINANCE:SOLUSDT",  asset: "crypto" },
  { symbol: "BNBUSDT",  display: "BNB",       tvSymbol: "BINANCE:BNBUSDT",  asset: "crypto" },
  { symbol: "XRPUSDT",  display: "XRP",       tvSymbol: "BINANCE:XRPUSDT",  asset: "crypto" },
  { symbol: "ADAUSDT",  display: "Cardano",   tvSymbol: "BINANCE:ADAUSDT",  asset: "crypto" },
  { symbol: "DOGEUSDT", display: "Dogecoin",  tvSymbol: "BINANCE:DOGEUSDT", asset: "crypto" },
  { symbol: "AVAXUSDT", display: "Avalanche", tvSymbol: "BINANCE:AVAXUSDT", asset: "crypto" },
  // Stocks
  { symbol: "AAPL",  display: "Apple",     tvSymbol: "NASDAQ:AAPL",  asset: "stock" },
  { symbol: "TSLA",  display: "Tesla",     tvSymbol: "NASDAQ:TSLA",  asset: "stock" },
  { symbol: "NVDA",  display: "NVIDIA",    tvSymbol: "NASDAQ:NVDA",  asset: "stock" },
  { symbol: "MSFT",  display: "Microsoft", tvSymbol: "NASDAQ:MSFT",  asset: "stock" },
  { symbol: "GOOGL", display: "Alphabet",  tvSymbol: "NASDAQ:GOOGL", asset: "stock" },
  { symbol: "AMZN",  display: "Amazon",    tvSymbol: "NASDAQ:AMZN",  asset: "stock" },
  // Forex
  { symbol: "EURUSD", display: "Euro / USD",     tvSymbol: "FX:EURUSD", asset: "forex" },
  { symbol: "GBPUSD", display: "Pound / USD",    tvSymbol: "FX:GBPUSD", asset: "forex" },
  { symbol: "USDJPY", display: "USD / Yen",      tvSymbol: "FX:USDJPY", asset: "forex" },
  { symbol: "AUDUSD", display: "AUD / USD",      tvSymbol: "FX:AUDUSD", asset: "forex" },
  { symbol: "XAUUSD", display: "Gold / USD",     tvSymbol: "OANDA:XAUUSD", asset: "forex" },
];

export function findSymbol(symbol: string): SymbolEntry {
  const up = symbol.toUpperCase();
  const found = POPULAR_SYMBOLS.find(s => s.symbol === up);
  if (found) return found;
  // Heuristic: USDT suffix => crypto; 6-letter pair => forex; else stock
  if (up.endsWith("USDT") || up.endsWith("BUSD")) {
    return { symbol: up, display: up, tvSymbol: `BINANCE:${up}`, asset: "crypto" };
  }
  if (/^[A-Z]{6}$/.test(up)) {
    return { symbol: up, display: up, tvSymbol: `FX:${up}`, asset: "forex" };
  }
  return { symbol: up, display: up, tvSymbol: `NASDAQ:${up}`, asset: "stock" };
}
