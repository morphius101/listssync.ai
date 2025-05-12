import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Helper function to check if the device is mobile
    const checkIfMobile = () => {
      const userAgent = 
        typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
      
      const mobileRegex = 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i;
      
      // Also check screen width for responsive layouts
      const isSmallScreen = window.innerWidth <= 768;
      
      return mobileRegex.test(userAgent) || isSmallScreen;
    };

    setIsMobile(checkIfMobile());

    // Update on resize
    const handleResize = () => {
      setIsMobile(checkIfMobile());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}