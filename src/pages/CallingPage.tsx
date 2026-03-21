import { Button } from "@/components/ui/button";
import { Phone, PhoneIncoming } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CallingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      {/* Pulsing background circle */}
      <div className="relative mb-10">
        <div className="h-32 w-32 rounded-full bg-primary/10 animate-pulse-soft absolute inset-0" />
        <div className="h-32 w-32 rounded-full bg-primary/5 flex items-center justify-center relative">
          <span className="text-5xl">📞</span>
        </div>
      </div>

      <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
        Talk to Nova
      </h1>
      <p className="text-muted-foreground font-body mb-8 max-w-xs">
        Check in with your AI habit coach
      </p>

      <div className="flex flex-col gap-4 w-full max-w-sm mb-8">
        {/* Option 1 — outlined */}
        <a
          href="tel:+15096925293"
          className="flex flex-col items-center gap-1 p-6 rounded-2xl border-2 border-border bg-card hover:border-primary/40 transition-colors"
        >
          <Phone className="h-7 w-7 text-primary mb-1" />
          <span className="text-base font-body font-semibold text-foreground">📞 I'll call Nova</span>
          <span className="text-xs text-muted-foreground font-body">Tap to open your dialer</span>
        </a>

        {/* Option 2 — filled sage green */}
        <button
          onClick={() => {/* TODO: trigger ClawdTalk outbound */}}
          className="flex flex-col items-center gap-1 p-6 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <PhoneIncoming className="h-7 w-7 mb-1" />
          <span className="text-base font-body font-semibold">Nova, call me</span>
          <span className="text-xs opacity-80 font-body">Nova will call your number</span>
        </button>
      </div>

      <p className="text-sm text-muted-foreground font-body mb-10">
        After your call, come back here to log your habits.
      </p>

      <button
        className="text-sm text-muted-foreground font-body hover:text-foreground transition-colors"
        onClick={() => navigate("/post-call")}
      >
        Back from my call
      </button>
    </div>
  );
};

export default CallingPage;
