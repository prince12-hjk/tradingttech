import { useEffect, useRef, memo } from "react";

declare global {
  interface Window { TradingView: any }
}

interface Props {
  symbol: string;       // e.g. BINANCE:BTCUSDT
  interval?: string;    // 1, 5, 15, 60, 240, D
}

function TradingViewWidgetInner({ symbol, interval = "60" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";

    const containerId = `tv_chart_${Math.random().toString(36).slice(2)}`;
    const inner = document.createElement("div");
    inner.id = containerId;
    inner.style.height = "100%";
    inner.style.width = "100%";
    ref.current.appendChild(inner);

    const init = () => {
      if (!window.TradingView) return;
      new window.TradingView.widget({
        container_id: containerId,
        symbol,
        interval,
        autosize: true,
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "rgba(15,18,28,1)",
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        save_image: false,
        studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies", "MAExp@tv-basicstudies"],
        backgroundColor: "rgba(15,18,28,1)",
        gridColor: "rgba(40,48,68,0.4)",
      });
    };

    if (window.TradingView) {
      init();
    } else {
      const s = document.createElement("script");
      s.src = "https://s3.tradingview.com/tv.js";
      s.async = true;
      s.onload = init;
      document.head.appendChild(s);
    }

    return () => {
      if (ref.current) ref.current.innerHTML = "";
    };
  }, [symbol, interval]);

  return <div ref={ref} className="w-full h-full" />;
}

export const TradingViewWidget = memo(TradingViewWidgetInner);
