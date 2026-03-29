import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, getRedirectResult, User } from 'firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const registerUserInDatabase = async (firebaseUser: User) => {
    try {
      await fetch('/api/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    const auth = getAuth();

    // Handle redirect result on mobile after Google sign-in redirect
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        await registerUserInDatabase(result.user);
      }
    }).catch((error) => {
      console.error('Redirect sign-in error:', error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Automatically register new users in the free tier
      if (currentUser) {
        await registerUserInDatabase(currentUser);
      }
      
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}