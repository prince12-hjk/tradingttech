import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2, GraduationCap, BookOpen, TrendingUp, Zap, Clock, Calendar } from "lucide-react";

const exps = [
  { v: "beginner", label: "Beginner", desc: "New to trading. Show me simple, plain-language explanations.", Icon: GraduationCap },
  { v: "intermediate", label: "Intermediate", desc: "I know the basics. Show setups + the logic behind them.", Icon: BookOpen },
  { v: "advanced", label: "Advanced", desc: "Give me multi-timeframe data and detailed technicals.", Icon: TrendingUp },
] as const;

const styles = [
  { v: "scalp", label: "Scalp", desc: "Minutes to an hour", Icon: Zap },
  { v: "intraday", label: "Intraday", desc: "Hours, closed by EOD", Icon: Clock },
  { v: "swing", label: "Swing", desc: "Days to weeks", Icon: Calendar },
] as const;

export default function Onboarding() {
  const nav = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [exp, setExp] = useState<typeof exps[number]["v"]>("beginner");
  const [style, setStyle] = useState<typeof styles[number]["v"]>("intraday");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ experience: exp, style, onboarded: true })
      .eq("id", user.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    await refreshProfile();
    toast.success("All set. Let's trade.");
    nav("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-surface">
      <Card className="w-full max-w-3xl p-8 md:p-12 glass animate-fade-up">
        <div className="flex justify-center mb-8"><Logo size="lg" /></div>
        <h1 className="font-display text-3xl font-bold text-center mb-2">Personalize your AI</h1>
        <p className="text-center text-muted-foreground mb-10">Two quick questions so the analysis fits your level.</p>

        <section className="mb-10">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-4">Your experience</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {exps.map(({ v, label, desc, Icon }) => (
              <button key={v} onClick={() => setExp(v)} type="button"
                className={`text-left p-5 rounded-lg border-2 transition-all ${exp === v ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/40"}`}>
                <Icon className={`h-6 w-6 mb-3 ${exp === v ? "text-primary" : "text-muted-foreground"}`} />
                <div className="font-semibold mb-1">{label}</div>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-4">Trading style</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {styles.map(({ v, label, desc, Icon }) => (
              <button key={v} onClick={() => setStyle(v)} type="button"
                className={`text-left p-5 rounded-lg border-2 transition-all ${style === v ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/40"}`}>
                <Icon className={`h-6 w-6 mb-3 ${style === v ? "text-primary" : "text-muted-foreground"}`} />
                <div className="font-semibold mb-1">{label}</div>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </button>
            ))}
          </div>
        </section>

        <Button onClick={submit} disabled={busy} className="w-full bg-gradient-primary hover:opacity-90" size="lg">
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Enter the desk
        </Button>
      </Card>
    </div>
  );
}
