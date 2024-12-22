import { logger } from './utils/logger';
import type { Handle } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  try {
    // Log incoming requests
    logger.debug('Incoming request', {
      method: event.request.method,
      url: event.url.pathname,
      headers: Object.fromEntries(event.request.headers)
    });

    const response = await resolve(event);

    // Log response status
    logger.debug('Response sent', {
      method: event.request.method,
      url: event.url.pathname,
      status: response.status
    });

    return response;
  } catch (err) {
    // Log the full error details
    logger.error('Server error', { 
      error: err,
      url: event.url.pathname,
      method: event.request.method,
      stack: err instanceof Error ? err.stack : undefined,
      cause: err instanceof Error ? err.cause : undefined
    });

    // Create a proper error response
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorInstance = new Error('Internal server error');
    errorInstance.cause = errorMessage;

    throw error(500, errorInstance);
  }
}; 