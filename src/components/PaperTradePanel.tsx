import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLivePrice } from "@/lib/livePrice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Wallet, X, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Setup } from "./AIAnalysisPanel";

interface Trade {
  id: string;
  symbol: string;
  side: "long" | "short";
  entry_price: number;
  stop_loss: number;
  target_price: number;
  size: number;
  status: "open" | "closed";
  pnl: number | null;
  ai_grade: string | null;
  ai_notes: string | null;
  opened_at: string;
  closed_at: string | null;
}

interface Props {
  symbol: string;
  pendingSetup: Setup | null;
  onConsumeSetup: () => void;
}

export function PaperTradePanel({ symbol, pendingSetup, onConsumeSetup }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const { price: livePrice, asset } = useLivePrice(symbol);
  const [side, setSide] = useState<"long" | "short">("long");
  const [size, setSize] = useState("100");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from AI setup
  useEffect(() => {
    if (!pendingSetup) return;
    setSide(pendingSetup.bias === "short" ? "short" : "long");
    setEntry(((pendingSetup.entry_low + pendingSetup.entry_high) / 2).toFixed(6));
    setSl(pendingSetup.stop_loss.toFixed(6));
    setTp(pendingSetup.targets[0].toFixed(6));
    onConsumeSetup();
    toast.success("Setup loaded into trade ticket");
  }, [pendingSetup, onConsumeSetup]);

  const loadTrades = async () => {
    if (!user) return;
    const { data } = await supabase.from("paper_trades").select("*").eq("user_id", user.id).order("opened_at", { ascending: false }).limit(50);
    setTrades((data ?? []) as Trade[]);
  };

  useEffect(() => { loadTrades(); }, [user]);

  // Auto-close trades hitting SL / TP (live polling). Crypto only.
  useEffect(() => {
    if (asset !== "crypto") return;
    const id = setInterval(checkOpenTrades, 6000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades, asset]);

  const checkOpenTrades = async () => {
    if (!user) return;
    const open = trades.filter(t => t.status === "open" && t.symbol.endsWith("USDT"));
    if (open.length === 0) return;
    const symbols = Array.from(new Set(open.map(t => t.symbol)));
    try {
      const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`);
      if (!r.ok) return;
      const data: { symbol: string; price: string }[] = await r.json();
      const prices = Object.fromEntries(data.map(d => [d.symbol, parseFloat(d.price)]));
      for (const t of open) {
        const p = prices[t.symbol];
        if (!p) continue;
        const hitTp = t.side === "long" ? p >= t.target_price : p <= t.target_price;
        const hitSl = t.side === "long" ? p <= t.stop_loss : p >= t.stop_loss;
        if (hitTp || hitSl) {
          await closeTradeInternal(t, p, hitTp ? "TP" : "SL");
        }
      }
    } catch {}
  };

  const open = async () => {
    if (!user || !profile) return;
    const e = parseFloat(entry || String(livePrice ?? 0));
    const s = parseFloat(sl);
    const t = parseFloat(tp);
    const sz = parseFloat(size);
    if (!e || !s || !t || !sz) return toast.error("Fill entry, SL, TP, size");
    if (sz > profile.paper_balance) return toast.error("Size exceeds paper balance");
    if (side === "long" && (s >= e || t <= e)) return toast.error("Long: SL must be below entry, TP above");
    if (side === "short" && (s <= e || t >= e)) return toast.error("Short: SL must be above entry, TP below");

    setSubmitting(true);
    const { error } = await supabase.from("paper_trades").insert({
      user_id: user.id,
      symbol,
      side,
      entry_price: e,
      stop_loss: s,
      target_price: t,
      size: sz,
      status: "open",
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(`${side.toUpperCase()} ${symbol} opened @ ${e}`);
    setEntry(""); setSl(""); setTp("");
    loadTrades();
  };

  const closeTradeInternal = async (t: Trade, exitPrice: number, reason: "manual" | "TP" | "SL") => {
    if (!user || !profile) return;
    const direction = t.side === "long" ? 1 : -1;
    const pnlPct = ((exitPrice - t.entry_price) / t.entry_price) * direction;
    const pnl = pnlPct * t.size;
    await supabase.from("paper_trades").update({
      status: "closed",
      pnl,
      closed_at: new Date().toISOString(),
      ai_notes: `Closed via ${reason} @ ${exitPrice}`,
    }).eq("id", t.id);
    await supabase.from("profiles").update({ paper_balance: profile.paper_balance + pnl }).eq("id", user.id);
    refreshProfile();
    loadTrades();
    if (reason !== "manual") toast(`${reason} hit on ${t.symbol}`, { description: `PnL: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}` });
  };

  const closeManual = async (t: Trade) => {
    const p = livePrice ?? t.entry_price;
    await closeTradeInternal(t, p, "manual");
    toast.success(`Closed ${t.symbol} @ ${p.toFixed(2)}`);
  };

  const openTrades = trades.filter(t => t.status === "open");
  const closedTrades = trades.filter(t => t.status === "closed");
  const totalPnl = closedTrades.reduce((a, t) => a + (t.pnl ?? 0), 0);
  const wins = closedTrades.filter(t => (t.pnl ?? 0) > 0).length;
  const winRate = closedTrades.length ? Math.round((wins / closedTrades.length) * 100) : 0;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" /> Paper Desk
          </h3>
          <Badge variant="outline" className="font-mono">${profile?.paper_balance?.toFixed(2) ?? "0"}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <MiniStat label="Open" value={openTrades.length.toString()} />
          <MiniStat label="Win rate" value={`${winRate}%`} />
          <MiniStat label="Total P&L" value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`} highlight={totalPnl >= 0 ? "bull" : "bear"} />
        </div>
      </div>

      <Tabs defaultValue="ticket" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 grid grid-cols-3">
          <TabsTrigger value="ticket">Ticket</TabsTrigger>
          <TabsTrigger value="open">Open ({openTrades.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="ticket" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
          {asset !== "crypto" && (
            <Card className="p-3 border-warning/30 bg-warning/5 text-xs text-warning">
              Live PnL & auto-close work for crypto pairs only (Binance). You can still log manual trades.
            </Card>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant={side === "long" ? "default" : "outline"} onClick={() => setSide("long")}
              className={cn(side === "long" && "bg-bull hover:bg-bull/90 text-bull-foreground")}>
              <ArrowUp className="h-4 w-4 mr-1" /> Long
            </Button>
            <Button variant={side === "short" ? "default" : "outline"} onClick={() => setSide("short")}
              className={cn(side === "short" && "bg-bear hover:bg-bear/90 text-bear-foreground")}>
              <ArrowDown className="h-4 w-4 mr-1" /> Short
            </Button>
          </div>
          <Field label={`Entry ${livePrice ? `(live: ${livePrice})` : ""}`} value={entry} onChange={setEntry} placeholder={livePrice?.toString() ?? "0"} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Stop loss" value={sl} onChange={setSl} className="text-bear" />
            <Field label="Take profit" value={tp} onChange={setTp} className="text-bull" />
          </div>
          <Field label="Position size ($)" value={size} onChange={setSize} />
          <Button onClick={open} disabled={submitting} className="w-full bg-gradient-primary">
            Open {side === "long" ? "Long" : "Short"} {symbol}
          </Button>
        </TabsContent>

        <TabsContent value="open" className="flex-1 overflow-y-auto p-4 space-y-2 m-0">
          {openTrades.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No open positions.</p>}
          {openTrades.map(t => {
            const live = t.symbol === symbol ? livePrice : null;
            const dir = t.side === "long" ? 1 : -1;
            const livePnl = live ? ((live - t.entry_price) / t.entry_price) * dir * t.size : null;
            return (
              <Card key={t.id} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {t.side === "long" ? <TrendingUp className="h-4 w-4 text-bull" /> : <TrendingDown className="h-4 w-4 text-bear" />}
                    <span className="font-mono font-bold">{t.symbol}</span>
                    <Badge variant="outline" className={cn("text-[10px]", t.side === "long" ? "text-bull border-bull/30" : "text-bear border-bear/30")}>
                      {t.side.toUpperCase()}
                    </Badge>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => closeManual(t)}><X className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <div><div className="text-muted-foreground text-[10px]">Entry</div>{t.entry_price}</div>
                  <div><div className="text-muted-foreground text-[10px]">SL</div><span className="text-bear">{t.stop_loss}</span></div>
                  <div><div className="text-muted-foreground text-[10px]">TP</div><span className="text-bull">{t.target_price}</span></div>
                </div>
                {livePnl !== null && (
                  <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Live PnL</span>
                    <span className={cn("font-mono font-bold", livePnl >= 0 ? "text-bull" : "text-bear")}>
                      {livePnl >= 0 ? "+" : ""}${livePnl.toFixed(2)}
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-y-auto p-4 space-y-2 m-0">
          {closedTrades.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No closed trades yet.</p>}
          {closedTrades.map(t => (
            <Card key={t.id} className="p-3 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold">{t.symbol} <span className={cn("text-[10px]", t.side === "long" ? "text-bull" : "text-bear")}>{t.side}</span></span>
                <span className={cn("font-mono font-bold", (t.pnl ?? 0) >= 0 ? "text-bull" : "text-bear")}>
                  {(t.pnl ?? 0) >= 0 ? "+" : ""}${(t.pnl ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">{t.ai_notes}</div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: "bull" | "bear" }) {
  return (
    <div className="rounded-md border border-border p-1.5">
      <div className="text-[9px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className={cn("font-mono text-xs font-bold", highlight === "bull" && "text-bull", highlight === "bear" && "text-bear")}>{value}</div>
    </div>
  );
}
function Field({ label, value, onChange, placeholder, className }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div>
      <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</Label>
      <Input
        type="number" step="any" value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn("h-9 font-mono", className)}
      />
    </div>
  );
}
