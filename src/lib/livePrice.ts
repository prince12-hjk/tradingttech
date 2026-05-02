// Tiny shared live-price hook. Currently crypto-only via Binance.
// Returns null for non-crypto symbols (caller should handle).

import { useEffect, useState } from "react";
import { findSymbol } from "./symbols";

export function useLivePrice(symbol: string, intervalMs = 4000) {
  const [price, setPrice] = useState<number | null>(null);
  const entry = findSymbol(symbol);

  useEffect(() => {
    if (entry.asset !== "crypto") { setPrice(null); return; }
    let cancelled = false;
    const fetchPrice = async () => {
      try {
        const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${entry.symbol}`);
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) setPrice(parseFloat(j.price));
      } catch {}
    };
    fetchPrice();
    const id = setInterval(fetchPrice, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [entry.symbol, entry.asset, intervalMs]);

  return { price, asset: entry.asset };
}
