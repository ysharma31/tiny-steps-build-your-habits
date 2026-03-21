import { useNavigate } from "react-router-dom";

const CallingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
        Talk to Nova
      </h1>
      <p className="font-body text-muted-foreground mb-10 max-w-xs">
        Check in with your AI habit coach
      </p>

      {/* Two options side by side */}
      <div className="flex gap-4 w-full max-w-sm mb-8">
        {/* Option 1 — I'll call Nova */}
        <a
          href="tel:+15096925293"
          className="flex-1 flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-border bg-card hover:border-primary/40 transition-colors"
        >
          <span className="text-3xl">📞</span>
          <span className="font-body text-sm font-semibold text-foreground">I'll call Nova</span>
          <span className="font-body text-xs text-muted-foreground">Tap to dial</span>
        </a>

        {/* Option 2 — Nova, call me */}
        <button
          onClick={() => {/* TODO: trigger outbound call */}}
          className="flex-1 flex flex-col items-center gap-2 p-5 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <span className="text-3xl">📲</span>
          <span className="font-body text-sm font-semibold">Nova, call me</span>
          <span className="font-body text-xs opacity-80">Nova calls you</span>
        </button>
      </div>

      {/* Message */}
      <p className="font-body text-sm text-muted-foreground mb-12 max-w-xs">
        After your call, come back here to log your habits.
      </p>

      {/* Back from my call button */}
      <button
        className="w-full max-w-sm h-12 rounded-xl border-2 border-primary text-primary font-body font-medium text-base hover:bg-primary/5 transition-colors"
        onClick={() => navigate("/post-call")}
      >
        Back from my call
      </button>
    </div>
  );
};

export default CallingPage;
