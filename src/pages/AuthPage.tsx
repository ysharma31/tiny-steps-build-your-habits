import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AuthPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const { count } = await supabase
          .from("habits")
          .select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id);

        if ((count ?? 0) > 0) {
          navigate("/", { replace: true });
        } else {
          navigate("/onboarding", { replace: true });
        }
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { count } = await supabase
          .from("habits")
          .select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id);

        if ((count ?? 0) > 0) {
          navigate("/", { replace: true });
        } else {
          navigate("/onboarding", { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        {/* Logo + tagline */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl font-bold text-foreground mb-3">
            🌱 Tiny Steps
          </h1>
          <p className="font-body text-base text-muted-foreground">
            Your daily habit coach. One tiny step at a time.
          </p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-warm-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-body text-sm text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="font-body"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-body text-sm text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="font-body"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-body font-medium text-base"
            >
              {loading
                ? "Please wait…"
                : isSignUp
                  ? "Create account"
                  : "Sign In"}
            </Button>
          </form>

          {error && (
            <p className="font-body text-sm text-destructive text-center mt-4">{error}</p>
          )}

          <p className="font-body text-sm text-muted-foreground text-center mt-5">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
              className="text-primary font-medium hover:underline"
            >
              {isSignUp ? "Sign in" : "Create account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
