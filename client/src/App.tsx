import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/AdminDashboard";
import ChecklistView from "@/pages/ChecklistView";
import Header from "@/components/Header";
import { useEffect } from "react";
import { initializeFirebase } from "./lib/firebase";

// Initialize Firebase
initializeFirebase();

function Router() {
  return (
    <Switch>
      <Route path="/" component={AdminDashboard} />
      <Route path="/checklist/:id" component={ChecklistView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Set primary blue color in the meta theme-color
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#4F8FF7';
    document.getElementsByTagName('head')[0].appendChild(meta);
    
    // Set page title
    document.title = 'ClearCheck';
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-[#F1F5F9]">
          <Header />
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
