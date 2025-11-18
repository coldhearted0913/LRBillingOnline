import { useEffect, useState } from 'react';

let csrfTokenCache: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

export function useCSRF() {
  const [token, setToken] = useState<string | null>(csrfTokenCache);

  useEffect(() => {
    // Fetch CSRF token if not cached
    if (!csrfTokenCache && !csrfTokenPromise) {
      csrfTokenPromise = fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          csrfTokenCache = data.token;
          setToken(data.token);
          csrfTokenPromise = null;
          return data.token;
        })
        .catch((error) => {
          console.error('Failed to fetch CSRF token:', error);
          csrfTokenPromise = null;
          return null;
        });
    } else if (csrfTokenCache) {
      setToken(csrfTokenCache);
    }

    // Refresh token every 12 hours
    const refreshInterval = setInterval(() => {
      csrfTokenCache = null;
      csrfTokenPromise = null;
      fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          csrfTokenCache = data.token;
          setToken(data.token);
        })
        .catch((error) => {
          console.error('Failed to refresh CSRF token:', error);
        });
    }, 12 * 60 * 60 * 1000); // 12 hours

    return () => clearInterval(refreshInterval);
  }, []);

  // Function to get CSRF token for API calls
  const getCSRFToken = async (): Promise<string | null> => {
    if (csrfTokenCache) {
      return csrfTokenCache;
    }

    if (csrfTokenPromise) {
      return await csrfTokenPromise;
    }

    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      csrfTokenCache = data.token;
      setToken(data.token);
      return data.token;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      return null;
    }
  };

  // Function to get headers with CSRF token
  const getHeaders = async (): Promise<HeadersInit> => {
    const token = await getCSRFToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['X-CSRF-Token'] = token;
    }

    return headers;
  };

  return {
    token,
    getCSRFToken,
    getHeaders,
  };
}

