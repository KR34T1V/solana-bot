import { json } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, locals }) => {
  try {
    // Log the logout event
    if (locals.userId) {
      logger.info('User logged out', { userId: locals.userId });
    }

    // Clear the token cookie
    cookies.delete('token', { path: '/' });

    return json({ success: true });
  } catch (error) {
    logger.error('Error during logout', { error });
    return json(
      { message: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}; 