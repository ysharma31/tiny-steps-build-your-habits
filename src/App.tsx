import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import HabitDetailPage from "./pages/HabitDetailPage";
import SettingsPage from "./pages/SettingsPage";
import CallingPage from "./pages/CallingPage";
import PostCallPage from "./pages/PostCallPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AuthGuard = () => {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="font-body text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <AppLayout />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<AuthGuard />}>
            <Route path="/" element={<Index />} />
            <Route path="/history" element={<HabitDetailPage />} />
            <Route path="/habit/:id" element={<HabitDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/calling" element={<CallingPage />} />
            <Route path="/post-call" element={<PostCallPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
