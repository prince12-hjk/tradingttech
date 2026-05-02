import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tick = { symbol: string; price: number; change: number };

interface Props {
  active: string;
  onSelect: (symbol: string) => void;
}

export function Watchlist({ active, onSelect }: Props) {
  const { user } = useAuth();
  const [symbols, setSymbols] = useState<string[]>([]);
  const [ticks, setTicks] = useState<Record<string, Tick>>({});
  const [adding, setAdding] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("watchlist").select("symbol").eq("user_id", user.id).order("created_at");
    setSymbols(data?.map(r => r.symbol) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  // Fetch live tickers from Binance every 5s
  useEffect(() => {
    if (symbols.length === 0) return;
    let cancelled = false;
    const fetchTicks = async () => {
      try {
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const map: Record<string, Tick> = {};
        for (const r of data) {
          map[r.symbol] = { symbol: r.symbol, price: parseFloat(r.lastPrice), change: parseFloat(r.priceChangePercent) };
        }
        setTicks(map);
      } catch {}
    };
    fetchTicks();
    const id = setInterval(fetchTicks, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [symbols]);

  const add = async () => {
    if (!user || !adding.trim()) return;
    const sym = adding.trim().toUpperCase();
    const { error } = await supabase.from("watchlist").insert({ user_id: user.id, symbol: sym });
    if (error) { toast.error(error.message); return; }
    setAdding("");
    load();
  };

  const remove = async (sym: string) => {
    if (!user) return;
    await supabase.from("watchlist").delete().eq("user_id", user.id).eq("symbol", sym);
    load();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-display text-sm font-semibold uppercase text-muted-foreground tracking-wider mb-3">Watchlist</h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="BTCUSDT"
              className="h-9 pl-8 text-xs font-mono uppercase"
              maxLength={20}
            />
          </div>
          <Button size="sm" onClick={add} className="h-9 px-2.5"><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {symbols.length === 0 && (
          <p className="p-4 text-xs text-muted-foreground text-center">Add a symbol to begin.</p>
        )}
        {symbols.map((sym) => {
          const t = ticks[sym];
          const isActive = active === sym;
          const up = (t?.change ?? 0) >= 0;
          return (
            <button
              key={sym}
              onClick={() => onSelect(sym)}
              className={cn(
                "w-full px-4 py-3 flex items-center justify-between border-l-2 transition-all group hover:bg-secondary/50",
                isActive ? "border-l-primary bg-secondary/40" : "border-l-transparent"
              )}
            >
              <div className="text-left">
                <div className="font-mono text-sm font-semibold">{sym}</div>
                <div className={cn("font-mono text-xs", up ? "text-bull" : "text-bear")}>
                  {t ? `${up ? "+" : ""}${t.change.toFixed(2)}%` : "—"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right font-mono text-sm">
                  {t ? t.price.toLocaleString(undefined, { maximumFractionDigits: t.price < 1 ? 6 : 2 }) : "—"}
                </div>
                <X
                  className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  onClick={(e) => { e.stopPropagation(); remove(sym); }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
