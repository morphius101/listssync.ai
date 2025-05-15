import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/AdminDashboard";
import ChecklistView from "@/pages/ChecklistView";
import SharedChecklist from "@/pages/SharedChecklist";
import EmailDebug from "@/pages/EmailDebug"; // Import email debug page
import Header from "@/components/Header";
import LandingPage from "@/components/LandingPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect } from "react";
import { initializeFirebase } from "./lib/firebase";

// Initialize Firebase
initializeFirebase();

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      
      {/* Protected admin dashboard */}
      <Route path="/dashboard">
        {() => (
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        )}
      </Route>
      
      {/* Protected checklist view */}
      <Route path="/checklist/:id">
        {(params) => (
          <ProtectedRoute>
            <ChecklistView id={params.id} />
          </ProtectedRoute>
        )}
      </Route>
      
      {/* Publicly shared checklist with verification */}
      <Route path="/shared/:token" component={SharedChecklist} />
      
      {/* Email debugging page */}
      <Route path="/debug/email" component={EmailDebug} />
      
      {/* 404 page */}
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
