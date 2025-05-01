import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/AdminDashboard";
import ChecklistView from "@/pages/ChecklistView";
import Header from "@/components/Header";
import LandingPage from "@/components/LandingPage";
import { useEffect } from "react";
import { initializeFirebase } from "./lib/firebase";

// Initialize Firebase
initializeFirebase();

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard" component={AdminDashboard} />
      <Route path="/checklist/:id" component={ChecklistView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Set primary color in the meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', '#4f46e5');
    }
    
    // Set page title
    document.title = 'ListsSync.ai - Real-time Checklists with Photo Proof';
  }, []);

  // Don't show header on landing page
  const showHeader = location !== '/';

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-[#F1F5F9]">
          {showHeader && <Header />}
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
