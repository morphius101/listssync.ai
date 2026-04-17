import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { signInWithGoogle, signOutUser } from "@/lib/firebase";
import { Logo } from "./Logo";
import { User, Clipboard, LogOut } from "lucide-react";

const BETA_MODE = import.meta.env.VITE_BETA_MODE === 'true';
const BETA_ALLOWLIST: string[] = (import.meta.env.VITE_BETA_ALLOWLIST_EMAILS || '')
  .split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);

const Header = () => {
  const { user, isAuthenticated } = useAuth();

  const handleLogin = () => {
    signInWithGoogle();
  };

  const handleLogout = () => {
    signOutUser();
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Logo size="sm" />
          <span className="font-bold text-lg text-primary hidden sm:inline">ListsSync.ai</span>
        </Link>

        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                  <Clipboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Button>
              </Link>
              
              <Link href="/pricing">
                <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                  <span>Pricing</span>
                </Button>
              </Link>
              
              <div className="flex items-center space-x-2">
                {BETA_MODE && user?.email && BETA_ALLOWLIST.includes(user.email.toLowerCase()) && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                    Beta Tester
                  </span>
                )}
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-900">
                    {user?.displayName || user?.email?.split('@')[0]}
                  </span>
                  <span className="text-xs text-gray-500">
                    {user?.email}
                  </span>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">Sign out</span>
                </Button>
              </div>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogin}
              className="flex items-center space-x-1"
            >
              <User className="h-4 w-4" />
              <span>Sign In</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;