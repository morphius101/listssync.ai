import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  urlOrOptions: string | RequestInit,
  optionsOrUndefined?: RequestInit | undefined,
): Promise<any> {
  let url: string;
  let options: RequestInit;
  
  // Handle both forms of the function:
  // 1. apiRequest('/api/endpoint', { method: 'POST', body: ... })
  // 2. apiRequest({ method: 'POST', body: ... }, '/api/endpoint')
  if (typeof urlOrOptions === 'string') {
    url = urlOrOptions;
    options = optionsOrUndefined || {};
  } else {
    url = optionsOrUndefined as string;
    options = urlOrOptions;
  }
  
  // Ensure headers exist
  options.headers = options.headers || {};
  
  // Set content type for JSON requests if not already set
  if (options.method === "POST" && options.body && typeof options.body === 'string') {
    try {
      JSON.parse(options.body); // Test if it's valid JSON
      
      // Create a new headers object instead of modifying directly
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json'
      };
      
    } catch (e) {
      // Not JSON, don't set the header
    }
  }
  
  // Debug API requests with enhanced logging
  if (options.method === "POST" && options.body) {
    try {
      const bodyData = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      console.log(`API Request to ${url}:`, bodyData);
      console.log('Request options:', {
        method: options.method,
        headers: options.headers,
        credentials: options.credentials
      });
    } catch (e) {
      console.log(`API Request to ${url} (unparseable body)`, options.body);
      console.error('Parse error:', e);
    }
  }
  
  // Include credentials
  options.credentials = 'include';
  
  const res = await fetch(url, options);
  await throwIfResNotOk(res);
  
  // Parse JSON if possible
  try {
    return await res.json();
  } catch (e) {
    return res; // Return response if not JSON
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Helper to check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Create a persistent cache storage
const createPersistentCache = () => {
  const CACHE_KEY = 'LISTSYNC_QUERY_CACHE';
  
  return {
    getItem: (key: string): Promise<string | null> => {
      if (!isBrowser) return Promise.resolve(null);
      const storageData = localStorage.getItem(CACHE_KEY);
      if (!storageData) return Promise.resolve(null);
      
      try {
        const cache = JSON.parse(storageData);
        return Promise.resolve(cache[key] || null);
      } catch (e) {
        console.error('Error retrieving from cache:', e);
        return Promise.resolve(null);
      }
    },
    
    setItem: (key: string, value: string): Promise<void> => {
      if (!isBrowser) return Promise.resolve();
      try {
        const storageData = localStorage.getItem(CACHE_KEY);
        const cache = storageData ? JSON.parse(storageData) : {};
        cache[key] = value;
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        return Promise.resolve();
      } catch (e) {
        console.error('Error saving to cache:', e);
        return Promise.resolve();
      }
    },
    
    removeItem: (key: string): Promise<void> => {
      if (!isBrowser) return Promise.resolve();
      try {
        const storageData = localStorage.getItem(CACHE_KEY);
        if (!storageData) return Promise.resolve();
        
        const cache = JSON.parse(storageData);
        delete cache[key];
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        return Promise.resolve();
      } catch (e) {
        console.error('Error removing from cache:', e);
        return Promise.resolve();
      }
    }
  };
};

// Network detection for offline mode handling
const setupNetworkDetection = (client: QueryClient) => {
  if (!isBrowser) return;
  
  const updateNetworkStatus = () => {
    const isOnline = navigator.onLine;
    if (isOnline) {
      // When we come back online, refetch any stale queries
      client.resumePausedMutations();
      client.invalidateQueries();
    }
  };
  
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Enable refetch on window focus to sync data
      staleTime: 5 * 60 * 1000, // 5 minutes stale time instead of infinity
      gcTime: 30 * 60 * 1000, // 30 minutes garbage collection time
      retry: 3, // Retry failed requests 3 times
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: 2, // Retry mutations up to 2 times
    },
  },
});

// Initialize network detection after creating the client
setupNetworkDetection(queryClient);

// Initialize the cache hydration on startup
if (isBrowser) {
  const hydrateCache = async () => {
    try {
      const persistentCache = createPersistentCache();
      const storageData = localStorage.getItem('LISTSYNC_QUERY_CACHE');
      
      if (storageData) {
        const cache = JSON.parse(storageData);
        
        // Iterate through the cache and set the data in the query client
        for (const [key, value] of Object.entries(cache)) {
          const parsedData = JSON.parse(value as string);
          queryClient.setQueryData([key], parsedData);
        }
        
        console.log('Query cache hydrated successfully');
      }
    } catch (e) {
      console.error('Error hydrating cache:', e);
    }
  };
  
  hydrateCache();
}
