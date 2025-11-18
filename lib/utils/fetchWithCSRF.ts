'use client';

// Wrapper for fetch that automatically includes CSRF token
export async function fetchWithCSRF(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get CSRF token from cookie (client-side)
  let csrfToken: string | null = null;
  try {
    // Read CSRF token from cookie
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find((cookie) => cookie.trim().startsWith('csrf-token='));
    if (csrfCookie) {
      csrfToken = csrfCookie.split('=')[1];
    }
    
    // If no token in cookie, fetch it
    if (!csrfToken) {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      csrfToken = data.token;
    }
  } catch (error) {
    console.warn('Failed to get CSRF token:', error);
  }

  // Merge headers
  const headers = new Headers(options.headers);
  
  // Don't set Content-Type for FormData - browser will set it with boundary
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (csrfToken) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  // Make request with CSRF token
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Include cookies
  });
}

