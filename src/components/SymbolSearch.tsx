import { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronsUpDown } from "lucide-react";
import { POPULAR_SYMBOLS, findSymbol, AssetClass } from "@/lib/symbols";

interface Props {
  value: string;
  onChange: (symbol: string) => void;
}

const assetColor: Record<AssetClass, string> = {
  crypto: "bg-primary/15 text-primary border-primary/30",
  stock: "bg-accent/15 text-accent border-accent/30",
  forex: "bg-warning/15 text-warning border-warning/30",
};

export function SymbolSearch({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = findSymbol(value);

  const handleCustom = () => {
    if (!query.trim()) return;
    onChange(query.trim().toUpperCase());
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 font-mono">
          <Search className="h-3.5 w-3.5" />
          <span className="font-bold">{current.symbol}</span>
          <Badge variant="outline" className={`${assetColor[current.asset]} text-[10px] uppercase font-mono px-1.5 py-0`}>
            {current.asset}
          </Badge>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[340px] p-0">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder="Search BTCUSDT, AAPL, EURUSD…"
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => { if (e.key === "Enter" && query) handleCustom(); }}
          />
          <CommandList>
            <CommandEmpty>
              <div className="p-3 text-center">
                <p className="text-xs text-muted-foreground mb-2">No match. Use custom symbol:</p>
                <Button size="sm" onClick={handleCustom} disabled={!query}>
                  Use "{query.toUpperCase()}"
                </Button>
              </div>
            </CommandEmpty>
            {(["crypto","stock","forex"] as AssetClass[]).map(asset => (
              <CommandGroup key={asset} heading={asset.toUpperCase()}>
                {POPULAR_SYMBOLS.filter(s => s.asset === asset).map(s => (
                  <CommandItem
                    key={s.symbol}
                    value={`${s.symbol} ${s.display}`}
                    onSelect={() => { onChange(s.symbol); setOpen(false); setQuery(""); }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{s.symbol}</span>
                      <span className="text-xs text-muted-foreground">{s.display}</span>
                    </div>
                    <Badge variant="outline" className={`${assetColor[s.asset]} text-[9px] uppercase`}>
                      {s.asset}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
