import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Activity, Brain, Layers, Shield, Sparkles, TrendingUp, Zap, AlertTriangle } from "lucide-react";

const features = [
  { Icon: Brain, title: "AI Trade Setups", desc: "Entry zones, stops, and 3 targets — with a confidence score and explanation in plain English." },
  { Icon: Layers, title: "Multi-Timeframe", desc: "AI confirms signals across 5m, 1h, 4h and 1D before suggesting a trade." },
  { Icon: Sparkles, title: "Why This Trade?", desc: "Every setup comes with the reasoning so you learn while you trade." },
  { Icon: TrendingUp, title: "Pro Charting", desc: "Full TradingView charts, indicators, and drawing tools." },
  { Icon: Activity, title: "Paper Trading", desc: "Practice with $10,000 virtual balance. AI grades each trade A/B/C." },
  { Icon: Shield, title: "No Fake Promises", desc: "Probability-based suggestions only. Risk warnings on every signal." },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
          <Button asChild className="bg-gradient-primary hover:opacity-90"><Link to="/auth">Get started</Link></Button>
        </nav>
      </header>

      <section className="relative px-6 pt-16 pb-24 max-w-7xl mx-auto text-center overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs font-mono mb-6 animate-fade-up">
          <span className="ticker-dot" /> AI-powered crypto desk · live on Binance data
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-tight max-w-4xl mx-auto animate-fade-up">
          A professional trader,<br />
          <span className="bg-gradient-primary bg-clip-text text-transparent">analyst, and mentor</span><br />
          in one interface.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-up">
          Nexus Trade combines TradingView-grade charts with multi-timeframe AI analysis,
          decision support, and trade explanations — built for every level.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3 animate-fade-up">
          <Button asChild size="lg" className="bg-gradient-primary hover:opacity-90 shadow-glow">
            <Link to="/auth"><Zap className="h-5 w-5 mr-2" />Start free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">See the dashboard</Link>
          </Button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground flex items-center justify-center gap-2">
          <AlertTriangle className="h-3 w-3" /> Trading is risky. We provide decision support, not financial advice.
        </p>
      </section>

      <section className="px-6 py-20 max-w-7xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-3">Everything you need on one screen</h2>
        <p className="text-center text-muted-foreground mb-14">Watchlist · Pro Charts · AI Analysis Panel · Paper Trading · Journal</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-xl glass hover:border-primary/40 transition-all hover:shadow-glow group">
              <div className="h-11 w-11 rounded-lg bg-gradient-primary grid place-items-center mb-4 group-hover:scale-110 transition-transform">
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 max-w-4xl mx-auto text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Ready when you are.</h2>
        <p className="text-muted-foreground mb-8">Free to start. $10,000 paper balance to practice.</p>
        <Button asChild size="lg" className="bg-gradient-primary hover:opacity-90 shadow-glow">
          <Link to="/auth">Open your desk</Link>
        </Button>
      </section>

      <footer className="px-6 py-8 border-t border-border text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Nexus Trade. Decision support tools. Not financial advice.
      </footer>
    </div>
  );
}
