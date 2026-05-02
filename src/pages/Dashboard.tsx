import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Watchlist } from "@/components/Watchlist";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { AIAnalysisPanel } from "@/components/AIAnalysisPanel";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { LogOut, User, AlertTriangle } from "lucide-react";

const intervals = [
  { v: "1", l: "1m" }, { v: "5", l: "5m" }, { v: "15", l: "15m" },
  { v: "60", l: "1h" }, { v: "240", l: "4h" }, { v: "D", l: "1D" },
];

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("60");

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-6">
          <Logo size="sm" />
          <div className="hidden md:flex items-center gap-2 text-xs font-mono">
            <span className="ticker-dot" />
            <span className="text-muted-foreground">Live · Binance</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-warning/30 bg-warning/5 text-[10px] text-warning">
            <AlertTriangle className="h-3 w-3" /> Decision support — not advice
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-primary grid place-items-center text-xs font-semibold text-primary-foreground">
                  {profile?.display_name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <span className="hidden md:inline text-sm">{profile?.display_name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="text-sm">{profile?.display_name}</div>
                <div className="text-[10px] text-muted-foreground capitalize">
                  {profile?.experience} · {profile?.style}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <User className="h-4 w-4 mr-2" /> Paper balance: ${profile?.paper_balance?.toLocaleString()}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr_380px] overflow-hidden">
        {/* Watchlist */}
        <aside className="border-r border-border bg-card/30 hidden lg:block">
          <Watchlist active={symbol} onSelect={setSymbol} />
        </aside>

        {/* Chart */}
        <section className="flex flex-col overflow-hidden">
          <div className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card/30">
            <div className="flex items-center gap-3">
              <h2 className="font-display font-bold text-lg">{symbol}</h2>
            </div>
            <Tabs value={interval} onValueChange={setInterval}>
              <TabsList className="h-8 p-0.5 bg-secondary">
                {intervals.map(i => (
                  <TabsTrigger key={i.v} value={i.v} className="h-7 px-3 text-xs font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    {i.l}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="flex-1 min-h-0">
            <TradingViewWidget symbol={`BINANCE:${symbol}`} interval={interval} />
          </div>
        </section>

        {/* AI Panel */}
        <aside className="border-l border-border bg-card/30 overflow-hidden hidden lg:block">
          <AIAnalysisPanel symbol={symbol} interval={interval} />
        </aside>
      </main>

      {/* Mobile: stacked panels */}
      <div className="lg:hidden border-t border-border max-h-[50vh] overflow-y-auto bg-card/30">
        <AIAnalysisPanel symbol={symbol} interval={interval} />
      </div>
    </div>
  );
}
