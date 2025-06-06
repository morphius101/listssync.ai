import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/AdminDashboard";
import ChecklistView from "@/pages/ChecklistView";
import SharedChecklist from "@/pages/SharedChecklist";
import Pricing from "@/pages/Pricing";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
      
      {/* Pricing page */}
      <Route path="/pricing">
        {() => <Pricing />}
      </Route>
      
      {/* Subscription success/cancel pages */}
      <Route path="/subscription/success">
        {() => (
          <div className="min-h-screen flex items-center justify-center bg-green-50">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-green-800 mb-4">Subscription Successful!</h1>
              <p className="text-green-600 mb-4">Welcome to listssync.ai Pro. Your subscription is now active.</p>
              <a href="/dashboard" className="text-blue-600 hover:underline">Go to Dashboard</a>
            </div>
          </div>
        )}
      </Route>
      
      <Route path="/subscription/cancel">
        {() => (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Subscription Cancelled</h1>
              <p className="text-gray-600 mb-4">Your subscription was not processed.</p>
              <a href="/pricing" className="text-blue-600 hover:underline">View Pricing Plans</a>
            </div>
          </div>
        )}
      </Route>
      
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
        <div className="min-h-screen flex flex-col bg-[#F1F5F9]">
          {showHeader && <Header />}
          <Toaster />
          <div className="flex-grow">
            <Router />
          </div>
          <Footer />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
