const AuthPage = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading font-bold text-foreground mb-2">
            🌱 Tiny Steps
          </h1>
          <p className="text-muted-foreground font-body">
            Your daily habit coach. One tiny step at a time.
          </p>
        </div>
        <div className="bg-card rounded-lg shadow-warm p-6">
          <button
            className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-body font-medium text-base hover:bg-primary/90 transition-colors"
            onClick={() => {/* TODO: Google OAuth */}}
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
