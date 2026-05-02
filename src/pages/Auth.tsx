import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

const credSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
});

export default function Auth() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav("/dashboard", { replace: true });
  }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        toast.success("Welcome back.");
        nav("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/dashboard` });
    if (r.error) {
      toast.error("Google sign-in failed");
      setBusy(false);
      return;
    }
    if (!r.redirected) nav("/dashboard");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex relative bg-gradient-surface p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-60" />
        <Logo size="lg" />
        <div className="relative z-10 space-y-6">
          <h1 className="font-display text-5xl font-bold leading-tight">
            Trade with an <span className="bg-gradient-primary bg-clip-text text-transparent">AI co-pilot</span> by your side.
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Pro charts. Multi-timeframe AI analysis. Decision support — never blind signals.
          </p>
          <div className="flex gap-2 text-xs font-mono text-muted-foreground">
            <span className="px-2 py-1 rounded bg-card border border-border">RSI</span>
            <span className="px-2 py-1 rounded bg-card border border-border">MACD</span>
            <span className="px-2 py-1 rounded bg-card border border-border">VWAP</span>
            <span className="px-2 py-1 rounded bg-card border border-border">EMA</span>
            <span className="px-2 py-1 rounded bg-bull/10 text-bull border border-bull/30">AI</span>
          </div>
        </div>
        <p className="relative z-10 text-xs text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-3 w-3" /> Trading involves risk. Decision support, not financial advice.
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 glass animate-fade-up">
          <div className="lg:hidden mb-8"><Logo /></div>
          <h2 className="font-display text-2xl font-semibold mb-1">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signin" ? "Sign in to your trading desk." : "Start with $10,000 paper balance."}
          </p>

          <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value={mode} className="mt-6">
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={72} />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-gradient-primary hover:opacity-90">
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
              </div>

              <Button type="button" variant="outline" onClick={google} disabled={busy} className="w-full">
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </Button>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            <Link to="/" className="hover:text-foreground">← Back to home</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
