import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Wizard } from "@/components/wizard/Wizard";
import AdminPanel from "@/pages/AdminPanel";
import DoctorPanel from "@/pages/DoctorPanel";
import CourierPanel from "@/pages/CourierPanel";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import { TelegramGuard } from "@/components/TelegramGuard";
import { getStoredAuth } from "@/lib/auth";
import { useEffect } from "react";

const queryClient = new QueryClient();

function RequireAuth({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const [, navigate] = useLocation();
  const stored = getStoredAuth();

  // Also accept tg_id from URL (Telegram WebApp button)
  const params = new URLSearchParams(window.location.search);
  const urlTgId = params.get('tg_id');

  useEffect(() => {
    if (!stored && !urlTgId) {
      navigate('/login');
    }
  }, [stored, urlTgId, navigate]);

  if (!stored && !urlTgId) return null;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/app">
        <TelegramGuard>
          <Wizard />
        </TelegramGuard>
      </Route>
      <Route path="/admin">
        <RequireAuth>
          <AdminPanel />
        </RequireAuth>
      </Route>
      <Route path="/doctor">
        <RequireAuth>
          <DoctorPanel />
        </RequireAuth>
      </Route>
      <Route path="/courier">
        <RequireAuth>
          <CourierPanel />
        </RequireAuth>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
