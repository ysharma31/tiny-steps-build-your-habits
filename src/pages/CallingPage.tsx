import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type PageState = "idle" | "scheduled" | "missed" | "cancelled";

const NOVA_PHONE = import.meta.env.VITE_NOVA_PHONE_NUMBER ?? "+15096925293";

const CallingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pageState, setPageState] = useState<PageState>("idle");
  const [userPhone, setUserPhone] = useState<string>("");
  const [countdown, setCountdown] = useState(120);
  const [scheduledEventId, setScheduledEventId] = useState<string>("");
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
            setPageState("missed");
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
      toast({ description: "Add your phone number in Settings first.", variant: "destructive" });
      navigate("/settings");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("schedule-call");
      if (error) throw error;
      setScheduledEventId(data.event_id || "");
      setPageState("scheduled");
    } catch {
      toast({
        description:
          "Nova couldn't schedule the call — try the dial button instead.",
        variant: "destructive",
      });
    }
  };

  const cancelCall = async () => {
    // If we have no event ID, we can't cancel server-side — just update UI
    if (!scheduledEventId) {
      setPageState("cancelled");
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("cancel-call", {
        body: { event_id: scheduledEventId },
      });
      if (error) throw error;
      setPageState("cancelled");
    } catch (e) {
      toast({
        description: `Couldn't cancel the call: ${e instanceof Error ? e.message : "unknown error"}`,
        variant: "destructive",
      });
    }
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

      {pageState === "missed" && (
        <div className="flex flex-col items-center gap-3 mb-12 w-full max-w-sm">
          <span className="text-4xl">📵</span>
          <p className="font-heading text-xl font-bold text-foreground">
            Missed the call?
          </p>
          <p className="font-body text-sm text-muted-foreground text-center max-w-xs">
            No worries — dial Nova directly or tap "Back from my call"
            if you already spoke with her.
          </p>
          <button
            onClick={() => setPageState("idle")}
            className="font-body text-sm text-primary underline hover:text-primary/80 transition-colors mt-1"
          >
            Try again
          </button>
        </div>
      )}

      {pageState === "cancelled" && (
        <div className="w-full max-w-sm mb-6 rounded-xl bg-yellow-100 border border-yellow-400 px-4 py-3 flex flex-col items-center gap-1">
          <p className="font-body text-sm font-semibold text-yellow-800">
            Call cancelled
          </p>
          <p className="font-body text-xs text-yellow-700 text-center">
            Nova's call has been cancelled successfully.
          </p>
          <button
            onClick={() => setPageState("idle")}
            className="font-body text-xs text-yellow-800 underline hover:text-yellow-900 transition-colors mt-1"
          >
            Dismiss
          </button>
        </div>
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
