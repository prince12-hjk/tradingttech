import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.105.1/cors";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const BINANCE = "https://api.binance.com/api/v3/klines";

interface Body { symbol: string; interval: string }

const TF_MAP: Record<string, string> = {
  "1": "1m", "5": "5m", "15": "15m", "60": "1h", "240": "4h", "D": "1d",
};

async function fetchKlines(symbol: string, tf: string, limit = 200) {
  const url = `${BINANCE}?symbol=${symbol}&interval=${tf}&limit=${limit}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Binance ${tf} ${r.status}`);
  const raw: any[] = await r.json();
  // [openTime, open, high, low, close, volume, closeTime, ...]
  return raw.map(k => ({
    t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5],
  }));
}

function summarize(candles: { o: number; h: number; l: number; c: number; v: number }[]) {
  if (candles.length === 0) return null;
  const closes = candles.map(c => c.c);
  const last = candles[candles.length - 1];
  const first = candles[0];
  const high = Math.max(...candles.map(c => c.h));
  const low = Math.min(...candles.map(c => c.l));
  const sma = (n: number) => closes.slice(-n).reduce((a, b) => a + b, 0) / n;
  const change = ((last.c - first.c) / first.c) * 100;
  const vols = candles.map(c => c.v);
  const avgVol = vols.reduce((a, b) => a + b, 0) / vols.length;
  const recentVol = vols.slice(-5).reduce((a, b) => a + b, 0) / 5;
  // Simple RSI(14)
  let gains = 0, losses = 0;
  for (let i = closes.length - 14; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  const rs = losses === 0 ? 100 : gains / losses;
  const rsi = 100 - 100 / (1 + rs);
  return {
    last: last.c, high, low, change_pct: +change.toFixed(2),
    sma20: +sma(20).toFixed(4), sma50: +sma(Math.min(50, closes.length)).toFixed(4),
    rsi14: +rsi.toFixed(1),
    vol_ratio: +(recentVol / avgVol).toFixed(2),
  };
}

const systemPrompt = `You are a senior trading analyst. You produce probability-based trade setups for crypto markets using multi-timeframe analysis. You NEVER guarantee profits. You produce structured JSON via the suggest_setup tool.

Rules:
- Use the provided multi-timeframe summaries (5m, 1h, 4h, 1D) to confirm bias.
- Entry zone must be a realistic range near current price, not the exact price.
- Stop loss must be on the opposite side of recent structure.
- Targets must be progressively further; risk:reward must be at least 1.2:1 on T1.
- Confidence reflects multi-timeframe alignment (50 = mixed, 80+ = strong alignment).
- Grade: A = strong MTF + clear pattern + good R:R; B = decent; C = weak / counter-trend.
- If conditions are unclear, set bias = "neutral", confidence < 50, grade = "C", and explain in when_not.
- "why" and "when_not" must be in plain language tailored to the user's experience level.`;

const tool = {
  type: "function",
  function: {
    name: "suggest_setup",
    description: "Return a structured trade setup based on multi-timeframe analysis.",
    parameters: {
      type: "object",
      properties: {
        trend: { type: "string", enum: ["bullish", "bearish", "sideways"] },
        bias: { type: "string", enum: ["long", "short", "neutral"] },
        setup_type: { type: "string", enum: ["scalp", "intraday", "swing"] },
        confidence: { type: "number" },
        grade: { type: "string", enum: ["A", "B", "C"] },
        entry_low: { type: "number" },
        entry_high: { type: "number" },
        stop_loss: { type: "number" },
        targets: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
        risk_reward: { type: "number" },
        support: { type: "array", items: { type: "number" } },
        resistance: { type: "array", items: { type: "number" } },
        pattern: { type: "string" },
        mtf_confirmation: { type: "string" },
        why: { type: "string" },
        when_not: { type: "string" },
        current_price: { type: "number" },
      },
      required: [
        "trend", "bias", "setup_type", "confidence", "grade",
        "entry_low", "entry_high", "stop_loss", "targets", "risk_reward",
        "support", "resistance", "pattern", "mtf_confirmation",
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
    if (!/^[A-Z0-9]{4,20}$/.test(symbol)) {
      return new Response(JSON.stringify({ error: "Invalid symbol" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch MTF: 5m, 1h, 4h, 1D + the user's selected interval
    const tfs = ["5m", "1h", "4h", "1d"];
    const userTf = TF_MAP[interval] ?? "1h";
    if (!tfs.includes(userTf)) tfs.push(userTf);

    const klinesByTf: Record<string, any> = {};
    await Promise.all(
      tfs.map(async (tf) => {
        try {
          const k = await fetchKlines(symbol, tf, 200);
          klinesByTf[tf] = summarize(k);
        } catch { klinesByTf[tf] = null; }
      })
    );

    const current = klinesByTf[userTf]?.last ?? klinesByTf["1h"]?.last;
    if (!current) {
      return new Response(JSON.stringify({ error: "Could not fetch market data for this symbol" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Symbol: ${symbol}
Selected timeframe: ${userTf}
Current price: ${current}

Multi-timeframe summary (last 200 candles each):
${JSON.stringify(klinesByTf, null, 2)}

Produce a probability-based setup using the suggest_setup tool. current_price MUST equal ${current}.`;

    const aiRes = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
