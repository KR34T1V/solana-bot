import { jwtVerify } from 'jose';
import type { Handle } from '@sveltejs/kit';
import { logRequest, logResponse, logError } from '$lib/server/logger';

export const handle: Handle = async ({ event, resolve }) => {
  const startTime = Date.now();
  let userId: string | null = null;

  try {
    // Skip auth for public routes and static assets
    if (
      event.url.pathname.startsWith('/api/auth') ||
      event.url.pathname === '/' ||
      event.url.pathname.startsWith('/auth/') ||
      event.url.pathname.startsWith('/_app/') ||
      event.url.pathname.startsWith('/favicon')
    ) {
      logRequest(event.request);
      const response = await resolve(event);
      logResponse(response.status, event.url.pathname, Date.now() - startTime);
      return response;
    }

    // Try to get token from Authorization header first, then from cookies
    let token = event.request.headers.get('Authorization')?.slice(7); // Remove 'Bearer '
    
    if (!token) {
      // Try to get token from cookies
      const cookies = event.request.headers.get('cookie');
      if (cookies) {
        const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('token='));
        if (tokenCookie) {
          token = tokenCookie.split('=')[1].trim();
        }
      }
    }

    if (!token) {
      // Only log API requests
      if (event.url.pathname.startsWith('/api/')) {
        logRequest(event.request);
        const response = new Response('Unauthorized', { status: 401 });
        logResponse(response.status, event.url.pathname, Date.now() - startTime);
        return response;
      }
      // For page routes, let the page handle the auth check
      event.locals.userId = null;
      return resolve(event);
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // Add user ID to event locals
    userId = payload.userId as string;
    event.locals.userId = userId;

    // Log the authenticated request
    if (event.url.pathname.startsWith('/api/')) {
      logRequest(event.request, userId);
    }

    const response = await resolve(event);
    
    if (event.url.pathname.startsWith('/api/')) {
      logResponse(response.status, event.url.pathname, Date.now() - startTime, userId);
    }
    
    return response;
  } catch (error) {
    if (event.url.pathname.startsWith('/api/')) {
      logError(error as Error, {
        path: event.url.pathname,
        userId,
        duration: Date.now() - startTime
      });
      const response = new Response('Unauthorized', { status: 401 });
      logResponse(response.status, event.url.pathname, Date.now() - startTime, userId);
      return response;
    }
    // For page routes, let the page handle the auth error
    event.locals.userId = null;
    return resolve(event);
  }
}; 