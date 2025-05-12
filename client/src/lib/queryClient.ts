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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
