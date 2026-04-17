import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';

export default function NotFound() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center space-x-2 mb-8">
          <Logo size="sm" />
          <span className="font-bold text-lg text-blue-700">ListsSync.ai</span>
        </div>

        <p className="text-6xl font-bold text-gray-200 mb-2">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Page not found</h1>
        <p className="text-gray-500 mb-8">
          The link you followed may be broken, or the page may have been removed.
        </p>

        <Button
          onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}
        </Button>
      </div>
    </div>
  );
}
