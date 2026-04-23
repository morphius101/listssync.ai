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
import SmsConsent from "@/pages/SmsConsent";
import BetaGate from "@/pages/BetaGate";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LandingPage from "@/components/LandingPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { useEffect, useState } from "react";
import { useAuth, getAuthHeaders } from "@/hooks/useAuth";
import { initializeFirebase, signOutUser } from "./lib/firebase";
import { initGA, captureUTM, trackStripeEvent, trackUserAction } from "@/lib/analytics";
import DebugAnalytics from "@/pages/DebugAnalytics";
import { useAnalytics } from "@/hooks/use-analytics";

const BETA_MODE = import.meta.env.VITE_BETA_MODE === 'true';
const BETA_ALLOWLIST: string[] = (import.meta.env.VITE_BETA_ALLOWLIST_EMAILS || '')
  .split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);

function BetaGateWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [notOnList, setNotOnList] = useState(false);

  useEffect(() => {
    if (!BETA_MODE || isLoading || !user) return;
    const email = user.email?.toLowerCase() || '';
    if (BETA_ALLOWLIST.length > 0 && !BETA_ALLOWLIST.includes(email)) {
      setNotOnList(true);
      signOutUser();
    }
  }, [user, isLoading]);

  if (!BETA_MODE) return <>{children}</>;
  if (isLoading) return null;
  if (!user || notOnList) return <BetaGate notOnList={notOnList} />;
  return <>{children}</>;
}

// Initialize Firebase with error handling
try {
  initializeFirebase();
} catch (error) {
  console.error("Firebase initialization failed, continuing with limited functionality:", error);
}

// Component to provide authenticated user data to pricing page
function PricingWithAuth() {
  const { user } = useAuth();
  const [currentTier, setCurrentTier] = useState<string>('free');

  useEffect(() => {
    const fetchUserTier = async () => {
      if (user) {
        try {
          const response = await fetch(`/api/user/${user.uid}/subscription`, {
            headers: await getAuthHeaders(),
          });
          const subscription = await response.json();
          setCurrentTier(subscription.tier || 'free');
        } catch (error) {
          console.error('Error fetching user subscription:', error);
        }
      }
    };

    fetchUserTier();
  }, [user]);

  return (
    <Pricing 
      userId={user?.uid} 
      userEmail={user?.email || undefined}
      currentTier={currentTier}
    />
  );
}

function SubscriptionSuccess() {
  const [trialEnd, setTrialEnd] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    trackStripeEvent('subscription_success');
    trackUserAction('subscription_completed');

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) return;

    (async () => {
      try {
        const response = await fetch(`/api/subscription/session/${sessionId}`, {
          headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        });
        const data = await response.json();
        if (data.trialEnd) setTrialEnd(new Date(data.trialEnd * 1000));
      } catch {
        setLoadError(true);
      }
    })();
  }, []);

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center max-w-md px-6">
        <h1 className="text-2xl font-bold text-green-800 mb-4">Your 14-day trial has started!</h1>
        {trialEnd && !loadError ? (
          <p className="text-green-700 mb-4">
            Trial ends <strong>{fmt(trialEnd)}</strong>. You'll be charged <strong>$99</strong> on{' '}
            <strong>{fmt(trialEnd)}</strong> unless you cancel before then.
          </p>
        ) : (
          <p className="text-green-600 mb-4">
            You have 14 days free. After that you'll be charged $99/year unless you cancel.
          </p>
        )}
        <a href="/dashboard" className="text-blue-600 hover:underline">Go to Dashboard</a>
      </div>
    </div>
  );
}

function Router() {
  // Track page views when routes change
  useAnalytics();
  
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
      <Route path="/shared/checklist/:token" component={SharedChecklist} />
      
      {/* SMS Consent page - public access required for compliance */}
      <Route path="/sms-consent" component={SmsConsent} />
      
      {/* Pricing page - public so prospects can evaluate plans before signing in */}
      <Route path="/pricing">
        {() => <PricingWithAuth />}
      </Route>
      
      {/* Subscription success/cancel pages */}
      <Route path="/subscription/success">
        {() => <SubscriptionSuccess />}
      </Route>
      
      <Route path="/subscription/cancel">
        {() => {
          // Track cancelled subscription
          trackStripeEvent('subscription_cancelled');
          trackUserAction('subscription_cancelled');
          
          return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Subscription Cancelled</h1>
                <p className="text-gray-600 mb-4">Your subscription was not processed.</p>
                <a href="/pricing" className="text-blue-600 hover:underline">View Pricing Plans</a>
              </div>
            </div>
          );
        }}
      </Route>
      
      {/* 404 page */}
      {import.meta.env.DEV && <Route path="/debug/analytics" component={DebugAnalytics} />}
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
    
    // Initialize Google Analytics when app loads
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
      captureUTM();
    }
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
            <BetaGateWrapper>
              <Router />
            </BetaGateWrapper>
          </div>
          <Footer />
          <PWAInstallBanner />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
