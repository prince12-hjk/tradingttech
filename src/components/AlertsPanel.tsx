import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Plus, X } from "lucide-react";

interface Alert {
  id: string;
  symbol: string;
  condition: "above" | "below";
  price: number;
  triggered: boolean;
}

interface Props { symbol: string }

export function AlertsPanel({ symbol }: Props) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [price, setPrice] = useState("");
  const [cond, setCond] = useState<"above" | "below">("above");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("alerts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setAlerts((data ?? []) as Alert[]);
  };
  useEffect(() => { load(); }, [user]);

  const add = async () => {
    if (!user || !price) return;
    const p = parseFloat(price);
    if (!p) return;
    const { error } = await supabase.from("alerts").insert({ user_id: user.id, symbol, condition: cond, price: p, triggered: false });
    if (error) return toast.error(error.message);
    setPrice("");
    load();
    toast.success(`Alert set: ${symbol} ${cond} ${p}`);
  };

  const remove = async (id: string) => {
    await supabase.from("alerts").delete().eq("id", id);
    load();
  };

  // Poll active crypto alerts
  useEffect(() => {
    const active = alerts.filter(a => !a.triggered && a.symbol.endsWith("USDT"));
    if (active.length === 0) return;
    const id = setInterval(async () => {
      const symbols = Array.from(new Set(active.map(a => a.symbol)));
      try {
        const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`);
        if (!r.ok) return;
        const data: { symbol: string; price: string }[] = await r.json();
        const prices = Object.fromEntries(data.map(d => [d.symbol, parseFloat(d.price)]));
        for (const a of active) {
          const p = prices[a.symbol];
          if (!p) continue;
          const hit = a.condition === "above" ? p >= a.price : p <= a.price;
          if (hit) {
            await supabase.from("alerts").update({ triggered: true }).eq("id", a.id);
            toast(`🔔 ${a.symbol} ${a.condition} ${a.price}`, { description: `Now: ${p}` });
          }
        }
        load();
      } catch {}
    }, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts]);

  return (
    <Card className="p-4 border-border">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
        <Bell className="h-3.5 w-3.5 text-primary" /> Price Alerts
      </h3>
      <div className="flex gap-2 mb-3">
        <Select value={cond} onValueChange={(v) => setCond(v as any)}>
          <SelectTrigger className="h-9 w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="above">Above</SelectItem>
            <SelectItem value="below">Below</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number" step="any" value={price} onChange={(e) => setPrice(e.target.value)}
          placeholder="Price" className="h-9 font-mono"
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button size="sm" onClick={add} className="h-9"><Plus className="h-4 w-4" /></Button>
      </div>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {alerts.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No alerts yet.</p>}
        {alerts.map(a => (
          <div key={a.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded border border-border">
            <span className="font-mono">{a.symbol} {a.condition} {a.price}</span>
            <div className="flex items-center gap-1">
              {a.triggered && <Badge variant="outline" className="text-[9px] text-bull border-bull/30">HIT</Badge>}
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => remove(a.id)}><X className="h-3 w-3" /></Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
