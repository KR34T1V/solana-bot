import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { verifyPassword, generateToken } from '$lib/server/auth';
import { logger, logError } from '$lib/server/logger';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      logger.warn('Login attempt with missing credentials', { metadata: { email } });
      return json(
        {
          success: false,
          message: 'Email and password are required'
        },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      logger.warn('Login attempt with non-existent email', { metadata: { email } });
      return json(
        {
          success: false,
          message: 'Invalid email or password'
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      logger.warn('Login attempt with invalid password', { metadata: { email, userId: user.id } });
      return json(
        {
          success: false,
          message: 'Invalid email or password'
        },
        { status: 401 }
      );
    }

    // Generate token
    const token = await generateToken(user.id);

    logger.info('User logged in successfully', { metadata: { email, userId: user.id } });

    // Create response with token cookie
    const response = json(
      {
        success: true,
        message: 'Login successful',
        data: { token }
      },
      { status: 200 }
    );

    response.headers.set(
      'Set-Cookie',
      `token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
    );

    return response;
  } catch (error) {
    logError(error as Error, { metadata: { path: '/api/auth/login' } });
    return json(
      {
        success: false,
        message: 'An error occurred during login'
      },
      { status: 500 }
    );
  }
}; 