import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Wizard } from "@/components/wizard/Wizard";
import AdminPanel from "@/pages/AdminPanel";
import DoctorPanel from "@/pages/DoctorPanel";
import CourierPanel from "@/pages/CourierPanel";
import LandingPage from "@/pages/LandingPage";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/app" component={Wizard} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/doctor" component={DoctorPanel} />
      <Route path="/courier" component={CourierPanel} />
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
