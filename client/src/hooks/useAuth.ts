import { useState, useEffect } from 'react';
import { getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, getRedirectResult, User } from 'firebase/auth';

const APP_ORIGIN = import.meta.env.PROD ? 'https://www.listssync.ai' : window.location.origin;
const DASHBOARD_URL = `${APP_ORIGIN}/dashboard`;

function getFirebaseAuthSafe() {
  if (getApps().length === 0) {
    return null;
  }

  try {
    return getAuth();
  } catch {
    return null;
  }
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const auth = getFirebaseAuthSafe();
  const user = auth?.currentUser;

  if (!user) {
    return { 'Content-Type': 'application/json' };
  }

  try {
    const token = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const registerUserInDatabase = async (firebaseUser: User) => {
    try {
      const token = await firebaseUser.getIdToken();
      await fetch('/api/user/register', {
        method: 'POST',
        headers: {
          ...(await getAuthHeaders()),
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: firebaseUser.uid,
          email: firebaseUser.email,
          firstName: firebaseUser.displayName?.split(' ')[0] || '',
          lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
          profileImageUrl: firebaseUser.photoURL,
        }),
      });
    } catch (error) {
      console.error('Failed to register user in database:', error);
    }
  };

  useEffect(() => {
    const auth = getFirebaseAuthSafe();

    if (!auth) {
      setIsLoading(false);
      return;
    }

    // Handle redirect result on mobile after Google sign-in redirect.
    // Always bounce back to the canonical app domain after successful auth so we never
    // strand users on the Firebase-hosted auth domain.
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        await registerUserInDatabase(result.user);

        if (window.location.origin !== APP_ORIGIN || window.location.pathname === '/') {
          window.location.replace(DASHBOARD_URL);
        }
      }
    }).catch((error) => {
      console.error('Redirect sign-in error:', error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        await registerUserInDatabase(currentUser);

        if (window.location.origin !== APP_ORIGIN && window.location.pathname !== '/shared') {
          window.location.replace(DASHBOARD_URL);
          return;
        }
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}