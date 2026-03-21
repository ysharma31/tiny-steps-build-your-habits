import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
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
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-body font-medium text-base hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Connecting…" : "Sign in with Google"}
          </button>

          {error && (
            <p className="font-body text-sm text-destructive text-center mt-4">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
