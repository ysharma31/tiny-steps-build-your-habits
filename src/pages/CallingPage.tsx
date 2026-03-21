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

      <div className="flex gap-4 w-full max-w-sm mb-8">
        <a
          href="tel:+15096925293"
          className="flex-1 flex flex-col items-center gap-2 p-5 rounded-lg border-2 border-border bg-card hover:border-primary/40 transition-colors"
        >
          <Phone className="h-6 w-6 text-primary" />
          <span className="text-sm font-body font-medium">I'll call Nova</span>
        </a>
        <button
          onClick={() => {/* TODO: trigger ClawdTalk outbound */}}
          className="flex-1 flex flex-col items-center gap-2 p-5 rounded-lg border-2 border-border bg-card hover:border-primary/40 transition-colors"
        >
          <PhoneIncoming className="h-6 w-6 text-primary" />
          <span className="text-sm font-body font-medium">Nova, call me</span>
        </button>
      </div>

      <p className="text-xs text-muted-foreground font-body mb-8">
        After your call, come back here to log your habits.
      </p>

      <Button
        variant="outline"
        className="w-full max-w-sm h-12 font-body"
        onClick={() => navigate("/post-call")}
      >
        Back from my call
      </Button>
    </div>
  );
};

export default CallingPage;
