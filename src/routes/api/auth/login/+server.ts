import { json } from '@sveltejs/kit';
import { SignJWT } from 'jose';
import { prisma } from '$lib/server/prisma';
import { comparePasswords } from '$lib/server/auth';
import { logger, logError } from '$lib/server/logger';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      logger.warn('Login attempt with missing credentials', { email });
      return json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      logger.warn('Login attempt with non-existent email', { email });
      return json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await comparePasswords(password, user.password);
    if (!isValid) {
      logger.warn('Login attempt with invalid password', { email, userId: user.id });
      return json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ userId: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    logger.info('User logged in successfully', { email, userId: user.id });

    // Set the token cookie
    cookies.set('token', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      secure: process.env.NODE_ENV === 'production'
    });

    return json({ 
      success: true,
      userId: user.id
    });
  } catch (error) {
    logError(error as Error, { path: '/api/auth/login' });
    return json(
      { message: 'An error occurred during login' },
      { status: 500 }
    );
  }
}; 