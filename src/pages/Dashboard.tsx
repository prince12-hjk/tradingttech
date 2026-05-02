import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Watchlist } from "@/components/Watchlist";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { AIAnalysisPanel, type Setup } from "@/components/AIAnalysisPanel";
import { PaperTradePanel } from "@/components/PaperTradePanel";
import { AlertsPanel } from "@/components/AlertsPanel";
import { SymbolSearch } from "@/components/SymbolSearch";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { LogOut, User, AlertTriangle, Brain, Wallet, Bell } from "lucide-react";
import { findSymbol } from "@/lib/symbols";

const intervals = [
  { v: "5", l: "5m", note: "scalp" },
  { v: "15", l: "15m", note: "intraday" },
  { v: "60", l: "1h", note: "trend" },
  { v: "240", l: "4h", note: "structure" },
  { v: "D", l: "1D", note: "macro" },
];

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("60");
  const [pendingSetup, setPendingSetup] = useState<Setup | null>(null);
  const tv = findSymbol(symbol);

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-6">
          <Logo size="sm" />
          <div className="hidden md:flex items-center gap-2 text-xs font-mono">
            <span className="ticker-dot" />
            <span className="text-muted-foreground">Live · {tv.asset === "crypto" ? "Binance" : tv.asset === "stock" ? "Stocks" : "FX"}</span>
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
                <Wallet className="h-4 w-4 mr-2" /> ${profile?.paper_balance?.toFixed(2)}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[240px_1fr_400px] overflow-hidden">
        {/* Watchlist */}
        <aside className="border-r border-border bg-card/30 hidden lg:block">
          <Watchlist active={symbol} onSelect={setSymbol} />
        </aside>

        {/* Chart */}
        <section className="flex flex-col overflow-hidden">
          <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card/30 gap-3">
            <SymbolSearch value={symbol} onChange={setSymbol} />
            <Tabs value={interval} onValueChange={setInterval}>
              <TabsList className="h-9 p-0.5 bg-secondary">
                {intervals.map(i => (
                  <TabsTrigger key={i.v} value={i.v} className="h-8 px-2.5 text-xs font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex flex-col gap-0 leading-tight">
                    <span>{i.l}</span>
                    <span className="text-[8px] opacity-70 hidden sm:inline">{i.note}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="flex-1 min-h-0">
            <TradingViewWidget symbol={tv.tvSymbol} interval={interval} />
          </div>
        </section>

        {/* Right side panels */}
        <aside className="border-l border-border bg-card/30 overflow-hidden hidden lg:flex flex-col">
          <Tabs defaultValue="ai" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-3 mx-3 mt-3">
              <TabsTrigger value="ai"><Brain className="h-3.5 w-3.5 mr-1" />AI</TabsTrigger>
              <TabsTrigger value="trade"><Wallet className="h-3.5 w-3.5 mr-1" />Trade</TabsTrigger>
              <TabsTrigger value="alerts"><Bell className="h-3.5 w-3.5 mr-1" />Alerts</TabsTrigger>
            </TabsList>
            <TabsContent value="ai" className="flex-1 overflow-hidden m-0 mt-3">
              <AIAnalysisPanel symbol={symbol} interval={interval} onTradeSetup={setPendingSetup} />
            </TabsContent>
            <TabsContent value="trade" className="flex-1 overflow-hidden m-0 mt-3">
              <PaperTradePanel symbol={symbol} pendingSetup={pendingSetup} onConsumeSetup={() => setPendingSetup(null)} />
            </TabsContent>
            <TabsContent value="alerts" className="flex-1 overflow-y-auto p-3 m-0 mt-3">
              <AlertsPanel symbol={symbol} />
            </TabsContent>
          </Tabs>
        </aside>
      </main>

      {/* Mobile */}
      <div className="lg:hidden border-t border-border max-h-[55vh] overflow-y-auto bg-card/30">
        <Tabs defaultValue="ai">
          <TabsList className="grid grid-cols-3 m-3">
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="trade">Trade</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>
          <TabsContent value="ai"><AIAnalysisPanel symbol={symbol} interval={interval} onTradeSetup={setPendingSetup} /></TabsContent>
          <TabsContent value="trade"><PaperTradePanel symbol={symbol} pendingSetup={pendingSetup} onConsumeSetup={() => setPendingSetup(null)} /></TabsContent>
          <TabsContent value="alerts" className="p-3"><AlertsPanel symbol={symbol} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
