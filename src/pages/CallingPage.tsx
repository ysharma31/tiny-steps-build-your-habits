import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type PageState = "idle" | "scheduled";

const NOVA_PHONE = import.meta.env.VITE_NOVA_PHONE_NUMBER ?? "+15096925293";

const CallingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pageState, setPageState] = useState<PageState>("idle");
  const [userPhone, setUserPhone] = useState<string>("");
  const [countdown, setCountdown] = useState(120);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load user phone on mount
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_number")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (profile?.phone_number) setUserPhone(profile.phone_number);
    };
    load();
  }, []);

  // Countdown timer while scheduled
  useEffect(() => {
    if (pageState === "scheduled") {
      setCountdown(120);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [pageState]);

  const scheduleCall = async () => {
    if (!userPhone) {
      toast({
        description: "No phone number on file — add one in Settings first.",
        variant: "destructive",
      });
      return;
    }

    const scheduledAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    try {
      const { data, error } = await supabase.functions.invoke("schedule-call", {
        body: { phone_number: userPhone, scheduled_at: scheduledAt },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPageState("scheduled");
    } catch {
      toast({
        description:
          "Nova couldn't schedule the call — try the dial button instead.",
        variant: "destructive",
      });
    }
  };

  const cancelCall = () => {
    setPageState("idle");
    toast({ description: "Call cancelled." });
  };

  const handleBackFromCall = () => {
    navigate("/post-call");
  };

  const lastFour = userPhone ? userPhone.slice(-4) : "????";

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
        Talk to Nova
      </h1>
      <p className="font-body text-muted-foreground mb-10 max-w-xs">
        Check in with your AI habit coach
      </p>

      {pageState === "idle" && (
        <>
          {/* Two options side by side */}
          <div className="flex gap-4 w-full max-w-sm mb-8">
            {/* Option 1 — Call Nova */}
            <a
              href={`tel:${NOVA_PHONE}`}
              className="flex-1 flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-border bg-card hover:border-primary/40 transition-colors"
            >
              <span className="text-3xl">📞</span>
              <span className="font-body text-sm font-semibold text-foreground">
                Call Nova now
              </span>
              <span className="font-body text-xs text-muted-foreground">
                Tap to dial her directly
              </span>
            </a>

            {/* Option 2 — Nova, call me */}
            <button
              onClick={scheduleCall}
              className="flex-1 flex flex-col items-center gap-2 p-5 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <span className="text-3xl">📲</span>
              <span className="font-body text-sm font-semibold">
                Nova, call me
              </span>
              <span className="font-body text-xs opacity-80">
                She'll ring you in ~2 min
              </span>
            </button>
          </div>

          <p className="font-body text-sm text-muted-foreground mb-12 max-w-xs">
            After your call, come back here to log your habits.
          </p>
        </>
      )}

      {pageState === "scheduled" && (
        <>
          {/* Scheduled state */}
          <div className="flex flex-col items-center gap-3 mb-12 w-full max-w-sm">
            <span
              className="text-5xl"
              style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
            >
              🔔
            </span>
            <h2 className="font-heading text-xl font-bold text-foreground">
              Nova will call you in about 2 minutes
            </h2>
            <p className="font-body text-sm text-muted-foreground">
              Keep your phone nearby — she'll ring +••••{lastFour}
            </p>
            <p className="font-heading text-4xl font-bold text-primary mt-2">
              {formatCountdown(countdown)}
            </p>
            <button
              onClick={cancelCall}
              className="font-body text-sm text-muted-foreground underline hover:text-foreground transition-colors mt-2"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Back from my call — always visible */}
      <button
        className="w-full max-w-sm h-12 rounded-xl border-2 border-primary text-primary font-body font-medium text-base hover:bg-primary/5 transition-colors"
        onClick={handleBackFromCall}
      >
        Back from my call
      </button>
    </div>
  );
};

export default CallingPage;
