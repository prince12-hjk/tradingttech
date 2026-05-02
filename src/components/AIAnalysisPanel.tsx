import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Brain, Sparkles, TrendingUp, TrendingDown, Minus, Loader2, AlertTriangle, Target, Shield, Zap, History, Ban, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Setup {
  trend: "bullish" | "bearish" | "sideways";
  bias: "long" | "short" | "neutral";
  setup_type: "scalp" | "intraday" | "swing";
  confidence: number;
  grade: "A" | "B" | "C";
  avoid_trade: boolean;
  entry_low: number;
  entry_high: number;
  stop_loss: number;
  targets: [number, number, number];
  risk_reward: number;
  support: number[];
  resistance: number[];
  pattern: string;
  structure: string;
  liquidity: string;
  volume_note: string;
  rsi_macd: string;
  mtf_confirmation: string;
  per_tf: { tf: string; bias: "bullish" | "bearish" | "neutral"; note: string }[];
  why: string;
  when_not: string;
  current_price: number;
  backtest?: { samples: number; win_rate: number; avg_move_pct: number } | null;
}

interface Props {
  symbol: string;
  interval: string;
  onTradeSetup?: (s: Setup) => void;
}

export function AIAnalysisPanel({ symbol, interval, onTradeSetup }: Props) {
  const [loading, setLoading] = useState(false);
  const [setup, setSetup] = useState<Setup | null>(null);

  const analyze = async () => {
    setLoading(true);
    setSetup(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-analyze", { body: { symbol, interval } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSetup(data as Setup);
    } catch (e: any) {
      const msg = e.message ?? "Analysis failed";
      if (msg.includes("429")) toast.error("Rate limit hit. Wait a moment.");
      else if (msg.includes("402")) toast.error("AI credits exhausted. Add credits in workspace settings.");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-primary grid place-items-center shadow-glow">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider">AI Analysis</h3>
        </div>
        <Badge variant="outline" className="font-mono text-xs">{symbol} · {labelInterval(interval)}</Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!setup && !loading && (
          <div className="text-center py-12 space-y-4 animate-fade-up">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-primary/10 grid place-items-center border border-primary/20">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h4 className="font-display font-semibold text-lg">Ready to analyze</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                Run multi-timeframe AI analysis on <span className="font-mono text-foreground">{symbol}</span>.
              </p>
            </div>
            <Button onClick={analyze} className="bg-gradient-primary hover:opacity-90 shadow-glow">
              <Zap className="h-4 w-4 mr-2" /> Analyze now
            </Button>
          </div>
        )}

        {loading && (
          <div className="text-center py-16 space-y-4">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Reading the tape across 5m, 15m, 1h, 4h, 1D…</p>
          </div>
        )}

        {setup && (
          <div className="space-y-4 animate-fade-up">
            {/* Avoid trade banner */}
            {setup.avoid_trade && (
              <Card className="p-4 border-warning/40 bg-warning/10">
                <div className="flex items-start gap-2">
                  <Ban className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-warning">No trade — low probability</h4>
                    <p className="text-xs text-muted-foreground mt-1">{setup.when_not}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Header */}
            <Card className="p-4 bg-gradient-surface border-border">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendIcon trend={setup.trend} />
                    <span className="font-display text-lg font-bold capitalize">{setup.trend}</span>
                    <Badge className={cn("font-mono", biasClass(setup.bias))}>{setup.bias.toUpperCase()}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{setup.setup_type} setup · {setup.pattern}</p>
                </div>
                <div className="text-right">
                  <div className={cn("font-display text-3xl font-bold leading-none", gradeClass(setup.grade))}>{setup.grade}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">grade</div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">AI Confidence</span>
                  <span className="font-mono font-semibold">{setup.confidence}%</span>
                </div>
                <Progress value={setup.confidence} className="h-2" />
              </div>
            </Card>

            {/* Per-timeframe MTF */}
            <Card className="p-4 border-border">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3">Multi-timeframe bias</h4>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {setup.per_tf.map(t => (
                  <div key={t.tf} className={cn("rounded-md border p-2 text-center", tfBiasClass(t.bias))}>
                    <div className="text-[10px] font-mono uppercase opacity-80">{t.tf}</div>
                    <div className="text-sm font-bold capitalize">{biasIcon(t.bias)}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{setup.mtf_confirmation}</p>
            </Card>

            {/* Trade setup */}
            {setup.bias !== "neutral" && !setup.avoid_trade && (
              <Card className="p-4 border-border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                    <Target className="h-3.5 w-3.5" /> Trade Setup
                  </h4>
                  {onTradeSetup && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onTradeSetup(setup)}>
                      Trade this
                    </Button>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <Row label="Entry zone" value={`${fmt(setup.entry_low)} – ${fmt(setup.entry_high)}`} accent />
                  <Row label="Stop loss" value={fmt(setup.stop_loss)} className="text-bear" />
                  <Row label="Target 1" value={fmt(setup.targets[0])} className="text-bull" />
                  <Row label="Target 2" value={fmt(setup.targets[1])} className="text-bull" />
                  <Row label="Target 3" value={fmt(setup.targets[2])} className="text-bull" />
                  <Row label="Risk : Reward" value={`1 : ${setup.risk_reward.toFixed(2)}`} />
                </div>
              </Card>
            )}

            {/* Market context */}
            <Card className="p-4 border-border space-y-2.5 text-sm">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1">Market context</h4>
              <ContextRow label="Structure" icon={<Activity className="h-3 w-3" />}>{setup.structure}</ContextRow>
              <ContextRow label="Liquidity">{setup.liquidity}</ContextRow>
              <ContextRow label="Volume">{setup.volume_note}</ContextRow>
              <ContextRow label="RSI / MACD">{setup.rsi_macd}</ContextRow>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Support</div>
                  {setup.support.map((s, i) => (<div key={i} className="font-mono text-xs text-bull">{fmt(s)}</div>))}
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Resistance</div>
                  {setup.resistance.map((s, i) => (<div key={i} className="font-mono text-xs text-bear">{fmt(s)}</div>))}
                </div>
              </div>
            </Card>

            {/* Backtest */}
            {setup.backtest && (
              <Card className="p-4 border-border">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2 flex items-center gap-2">
                  <History className="h-3.5 w-3.5" /> Backtest of similar setups
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="Samples" value={setup.backtest.samples.toString()} />
                  <Stat label="Win rate" value={`${setup.backtest.win_rate}%`} highlight={setup.backtest.win_rate >= 55 ? "bull" : setup.backtest.win_rate <= 40 ? "bear" : undefined} />
                  <Stat label="Avg move" value={`${setup.backtest.avg_move_pct}%`} />
                </div>
              </Card>
            )}

            {/* Why */}
            <Card className="p-4 border-border">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Why this trade
              </h4>
              <p className="text-sm leading-relaxed">{setup.why}</p>
            </Card>

            <Card className="p-4 border-warning/30 bg-warning/5">
              <h4 className="text-xs font-semibold uppercase text-warning tracking-wider mb-2 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" /> When NOT to take it
              </h4>
              <p className="text-sm leading-relaxed">{setup.when_not}</p>
            </Card>

            <p className="text-[10px] text-muted-foreground flex items-start gap-1.5 pt-2">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              Probability-based decision support. Not financial advice. Markets carry risk of loss.
            </p>

            <Button onClick={analyze} variant="outline" className="w-full">
              <Zap className="h-4 w-4 mr-2" /> Re-analyze
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, accent, className }: { label: string; value: string; accent?: boolean; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={cn("font-mono", accent && "text-primary font-semibold", className)}>{value}</span>
    </div>
  );
}
function ContextRow({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground tracking-wider mb-0.5">{icon}{label}</div>
      <p className="text-xs leading-relaxed">{children}</p>
    </div>
  );
}
function Stat({ label, value, highlight }: { label: string; value: string; highlight?: "bull" | "bear" }) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className={cn("font-mono font-bold", highlight === "bull" && "text-bull", highlight === "bear" && "text-bear")}>{value}</div>
    </div>
  );
}
function TrendIcon({ trend }: { trend: string }) {
  if (trend === "bullish") return <TrendingUp className="h-5 w-5 text-bull" />;
  if (trend === "bearish") return <TrendingDown className="h-5 w-5 text-bear" />;
  return <Minus className="h-5 w-5 text-muted-foreground" />;
}
function biasClass(b: string) {
  if (b === "long") return "bg-bull/15 text-bull border-bull/40 hover:bg-bull/20";
  if (b === "short") return "bg-bear/15 text-bear border-bear/40 hover:bg-bear/20";
  return "bg-muted text-muted-foreground border-border";
}
function tfBiasClass(b: string) {
  if (b === "bullish") return "bg-bull/10 text-bull border-bull/30";
  if (b === "bearish") return "bg-bear/10 text-bear border-bear/30";
  return "bg-muted/40 text-muted-foreground border-border";
}
function biasIcon(b: string) {
  if (b === "bullish") return "▲";
  if (b === "bearish") return "▼";
  return "—";
}
function gradeClass(g: string) {
  if (g === "A") return "text-bull";
  if (g === "B") return "text-primary";
  return "text-warning";
}
function fmt(n: number) {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: n < 1 ? 6 : 2 });
}
function labelInterval(i: string) {
  const m: Record<string, string> = { "1": "1m", "5": "5m", "15": "15m", "60": "1h", "240": "4h", "D": "1D" };
  return m[i] ?? i;
}
