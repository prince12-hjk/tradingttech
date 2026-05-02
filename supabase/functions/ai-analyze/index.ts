import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.105.1/cors";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const BINANCE = "https://api.binance.com/api/v3/klines";

interface Body { symbol: string; interval: string }

const TF_MAP: Record<string, string> = {
  "1": "1m", "5": "5m", "15": "15m", "60": "1h", "240": "4h", "D": "1d",
};

type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

async function fetchKlines(symbol: string, tf: string, limit = 300): Promise<Candle[] | null> {
  try {
    const r = await fetch(`${BINANCE}?symbol=${symbol}&interval=${tf}&limit=${limit}`);
    if (!r.ok) return null;
    const raw: any[] = await r.json();
    return raw.map(k => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] }));
  } catch { return null; }
}

// ---- Indicators ----
function sma(arr: number[], n: number) {
  if (arr.length < n) return arr[arr.length - 1];
  return arr.slice(-n).reduce((a, b) => a + b, 0) / n;
}
function ema(arr: number[], n: number): number[] {
  const k = 2 / (n + 1);
  const out: number[] = [];
  let prev = arr[0];
  for (let i = 0; i < arr.length; i++) {
    prev = i === 0 ? arr[0] : arr[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}
function rsi(closes: number[], period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  const rs = losses === 0 ? 100 : gains / losses;
  return 100 - 100 / (1 + rs);
}
function macd(closes: number[]) {
  const e12 = ema(closes, 12);
  const e26 = ema(closes, 26);
  const macdLine = e12.map((v, i) => v - e26[i]);
  const signal = ema(macdLine, 9);
  const hist = macdLine.map((v, i) => v - signal[i]);
  return { macd: macdLine.at(-1)!, signal: signal.at(-1)!, hist: hist.at(-1)!, hist_prev: hist.at(-2) ?? 0 };
}

// ---- Candle patterns (last 3 candles) ----
function detectPattern(c: Candle[]): { name: string; bias: "bullish" | "bearish" | "neutral" } {
  if (c.length < 3) return { name: "—", bias: "neutral" };
  const a = c.at(-2)!, b = c.at(-1)!;
  const body = (k: Candle) => Math.abs(k.c - k.o);
  const range = (k: Candle) => k.h - k.l || 1e-9;
  const upperWick = (k: Candle) => k.h - Math.max(k.o, k.c);
  const lowerWick = (k: Candle) => Math.min(k.o, k.c) - k.l;

  // Bullish engulfing
  if (a.c < a.o && b.c > b.o && b.c >= a.o && b.o <= a.c) return { name: "Bullish Engulfing", bias: "bullish" };
  // Bearish engulfing
  if (a.c > a.o && b.c < b.o && b.o >= a.c && b.c <= a.o) return { name: "Bearish Engulfing", bias: "bearish" };
  // Hammer
  if (lowerWick(b) > body(b) * 2 && upperWick(b) < body(b) * 0.5 && body(b) / range(b) < 0.4) return { name: "Hammer", bias: "bullish" };
  // Inverted hammer
  if (upperWick(b) > body(b) * 2 && lowerWick(b) < body(b) * 0.5 && body(b) / range(b) < 0.4 && b.c > b.o) return { name: "Inverted Hammer", bias: "bullish" };
  // Shooting star
  if (upperWick(b) > body(b) * 2 && lowerWick(b) < body(b) * 0.5 && b.c < b.o) return { name: "Shooting Star", bias: "bearish" };
  // Doji
  if (body(b) / range(b) < 0.1) return { name: "Doji", bias: "neutral" };
  return { name: "No clear pattern", bias: "neutral" };
}

// ---- Structure (HH/HL vs LH/LL on swing pivots) ----
function structure(c: Candle[]): string {
  const slice = c.slice(-50);
  if (slice.length < 10) return "insufficient";
  const highs: number[] = [], lows: number[] = [];
  for (let i = 2; i < slice.length - 2; i++) {
    if (slice[i].h > slice[i-1].h && slice[i].h > slice[i+1].h && slice[i].h > slice[i-2].h && slice[i].h > slice[i+2].h) highs.push(slice[i].h);
    if (slice[i].l < slice[i-1].l && slice[i].l < slice[i+1].l && slice[i].l < slice[i-2].l && slice[i].l < slice[i+2].l) lows.push(slice[i].l);
  }
  if (highs.length < 2 || lows.length < 2) return "ranging";
  const hh = highs.at(-1)! > highs.at(-2)!;
  const hl = lows.at(-1)! > lows.at(-2)!;
  if (hh && hl) return "uptrend (HH/HL)";
  if (!hh && !hl) return "downtrend (LH/LL)";
  return "ranging / unclear";
}

function summarize(c: Candle[]) {
  if (!c || c.length === 0) return null;
  const closes = c.map(x => x.c);
  const last = c.at(-1)!;
  const high = Math.max(...c.map(x => x.h));
  const low = Math.min(...c.map(x => x.l));
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, Math.min(50, closes.length));
  const sma200 = sma(closes, Math.min(200, closes.length));
  const r = rsi(closes, 14);
  const m = macd(closes);
  const vols = c.map(x => x.v);
  const avgVol = vols.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const recentVol = vols.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const change_pct = ((last.c - c[0].c) / c[0].c) * 100;
  const pattern = detectPattern(c);
  const struct = structure(c);

  // Per-TF bias derived from indicators
  let bullScore = 0, bearScore = 0;
  if (last.c > sma20) bullScore++; else bearScore++;
  if (sma20 > sma50) bullScore++; else bearScore++;
  if (last.c > sma200) bullScore++; else bearScore++;
  if (r > 55) bullScore++; if (r < 45) bearScore++;
  if (m.hist > 0 && m.hist > m.hist_prev) bullScore++;
  if (m.hist < 0 && m.hist < m.hist_prev) bearScore++;
  if (pattern.bias === "bullish") bullScore++;
  if (pattern.bias === "bearish") bearScore++;
  const bias = bullScore > bearScore + 1 ? "bullish" : bearScore > bullScore + 1 ? "bearish" : "neutral";

  return {
    last: last.c,
    range: { high, low },
    sma20: +sma20.toFixed(6), sma50: +sma50.toFixed(6), sma200: +sma200.toFixed(6),
    rsi14: +r.toFixed(1),
    macd_hist: +m.hist.toFixed(6), macd_rising: m.hist > m.hist_prev,
    vol_ratio: +(recentVol / (avgVol || 1)).toFixed(2),
    change_pct: +change_pct.toFixed(2),
    pattern: pattern.name,
    pattern_bias: pattern.bias,
    structure: struct,
    bias,
  };
}

// ---- Tiny backtest: scan past for similar (RSI bucket + bias) and check 10-bar forward outcome ----
function backtest(c: Candle[], targetRsi: number, targetBias: "bullish" | "bearish" | "neutral") {
  if (targetBias === "neutral" || c.length < 60) return null;
  const closes = c.map(x => x.c);
  let wins = 0, total = 0, avgMove = 0;
  for (let i = 30; i < c.length - 12; i++) {
    const slice = closes.slice(0, i + 1);
    const r = rsi(slice, 14);
    if (Math.abs(r - targetRsi) > 8) continue;
    const entry = closes[i];
    const future = closes.slice(i + 1, i + 11);
    const maxUp = (Math.max(...future) - entry) / entry * 100;
    const maxDown = (Math.min(...future) - entry) / entry * 100;
    total++;
    if (targetBias === "bullish" && maxUp > 1.5 && maxUp > -maxDown) { wins++; avgMove += maxUp; }
    else if (targetBias === "bearish" && -maxDown > 1.5 && -maxDown > maxUp) { wins++; avgMove += -maxDown; }
  }
  if (total < 5) return null;
  return { samples: total, win_rate: +(wins / total * 100).toFixed(0), avg_move_pct: +(avgMove / Math.max(wins, 1)).toFixed(2) };
}

const systemPrompt = `You are a senior multi-asset trading analyst. You produce probability-based trade setups using multi-timeframe technical analysis. You NEVER guarantee profits and you actively flag low-probability setups.

Rules:
- Use the provided per-timeframe summaries (5m, 15m, 1h, 4h, 1d) to determine confluence.
- If timeframes conflict strongly OR structure is "ranging" with low volume — set bias = "neutral" and grade = "C". Be honest about choppy markets.
- Entry zone must be a realistic range near current price (not a single point).
- Stop loss must respect recent structure (below last swing low for longs, above last swing high for shorts).
- Targets must be progressively further; T1 risk:reward >= 1.2:1.
- Confidence: 50 = mixed, 65-75 = decent, 80+ = strong MTF alignment + clear pattern.
- Grade A: strong MTF + clean pattern + good R:R + structure agreement. B: decent. C: weak / counter-trend / avoid.
- Tailor "why" / "when_not" to the user_experience level (beginner = plain English, advanced = use proper TA terms).
- Each timeframe's per_tf entry MUST include bias + a one-line reason citing the indicator data given.`;

const tool = {
  type: "function",
  function: {
    name: "suggest_setup",
    description: "Return a structured multi-timeframe trade setup.",
    parameters: {
      type: "object",
      properties: {
        trend: { type: "string", enum: ["bullish", "bearish", "sideways"] },
        bias: { type: "string", enum: ["long", "short", "neutral"] },
        setup_type: { type: "string", enum: ["scalp", "intraday", "swing"] },
        confidence: { type: "number" },
        grade: { type: "string", enum: ["A", "B", "C"] },
        avoid_trade: { type: "boolean", description: "True when conditions are unclear / choppy / low probability." },
        entry_low: { type: "number" },
        entry_high: { type: "number" },
        stop_loss: { type: "number" },
        targets: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
        risk_reward: { type: "number" },
        support: { type: "array", items: { type: "number" } },
        resistance: { type: "array", items: { type: "number" } },
        pattern: { type: "string", description: "Detected candle pattern + context, e.g. 'Bullish Engulfing at support'." },
        structure: { type: "string", description: "HH/HL or LH/LL or ranging." },
        liquidity: { type: "string", description: "Where stops / liquidity likely sit." },
        volume_note: { type: "string" },
        rsi_macd: { type: "string" },
        mtf_confirmation: { type: "string", description: "Plain-English summary of confluence across timeframes." },
        per_tf: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tf: { type: "string" },
              bias: { type: "string", enum: ["bullish", "bearish", "neutral"] },
              note: { type: "string" },
            },
            required: ["tf", "bias", "note"],
            additionalProperties: false,
          },
        },
        why: { type: "string" },
        when_not: { type: "string" },
        current_price: { type: "number" },
      },
      required: [
        "trend", "bias", "setup_type", "confidence", "grade", "avoid_trade",
        "entry_low", "entry_high", "stop_loss", "targets", "risk_reward",
        "support", "resistance", "pattern", "structure", "liquidity",
        "volume_note", "rsi_macd", "mtf_confirmation", "per_tf",
        "why", "when_not", "current_price",
      ],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const auth = req.headers.get("authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Body = await req.json();
    const symbol = String(body.symbol ?? "").trim().toUpperCase();
    const interval = String(body.interval ?? "60");
    if (!/^[A-Z0-9]{3,20}$/.test(symbol)) {
      return new Response(JSON.stringify({ error: "Invalid symbol" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For now AI engine uses Binance (crypto). Non-crypto returns a clear message.
    if (!symbol.endsWith("USDT") && !symbol.endsWith("BUSD")) {
      return new Response(JSON.stringify({
        error: "AI analysis currently supports crypto pairs (e.g. BTCUSDT). Stocks/Forex charts work but live AI analysis is coming soon.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tfs = ["5m", "15m", "1h", "4h", "1d"];
    const userTf = TF_MAP[interval] ?? "1h";
    if (!tfs.includes(userTf)) tfs.push(userTf);

    const klinesByTf: Record<string, Candle[] | null> = {};
    await Promise.all(tfs.map(async tf => {
      klinesByTf[tf] = await fetchKlines(symbol, tf, 300);
    }));

    const summaryByTf: Record<string, any> = {};
    for (const tf of tfs) summaryByTf[tf] = klinesByTf[tf] ? summarize(klinesByTf[tf]!) : null;

    const userCandles = klinesByTf[userTf];
    const current = summaryByTf[userTf]?.last ?? summaryByTf["1h"]?.last;
    if (!current || !userCandles) {
      return new Response(JSON.stringify({ error: "Could not fetch market data for this symbol" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userSum = summaryByTf[userTf];
    const bt = backtest(userCandles, userSum.rsi14, userSum.bias);

    const userPrompt = `Symbol: ${symbol}
Selected timeframe: ${userTf}
Current price: ${current}

Per-timeframe analysis (each based on last 300 candles):
${JSON.stringify(summaryByTf, null, 2)}

Backtest (similar setups in recent history on ${userTf}, n=${bt?.samples ?? 0}):
${bt ? JSON.stringify(bt) : "insufficient samples"}

Build a probability-based setup using suggest_setup. current_price MUST equal ${current}.
Your per_tf array MUST include all of: ${tfs.join(", ")}.`;

    const aiRes = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "suggest_setup" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "AI rate limit (429). Try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted (402). Add credits in Workspace settings." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return new Response(JSON.stringify({ error: `AI gateway error ${aiRes.status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return new Response(JSON.stringify({ error: "AI did not return a setup" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const setup = JSON.parse(call.function.arguments);
    setup.backtest = bt;

    return new Response(JSON.stringify(setup), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("ai-analyze error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
