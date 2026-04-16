import { useState, useEffect } from 'react';
import { getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

const APP_ORIGIN = import.meta.env.PROD ? 'https://www.listssync.ai' : window.location.origin;
const DASHBOARD_URL = `${APP_ORIGIN}/dashboard`;

// Module-level guard: track which UIDs have been registered this session.
// useAuth() is instantiated in multiple components simultaneously; without this
// each instance fires its own onAuthStateChanged → registerUserInDatabase called N times.
const registeredUids = new Set<string>();

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

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Register exactly once per UID per session, regardless of how many
        // useAuth() instances are mounted simultaneously.
        if (!registeredUids.has(currentUser.uid)) {
          registeredUids.add(currentUser.uid);
          await registerUserInDatabase(currentUser);
        }

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