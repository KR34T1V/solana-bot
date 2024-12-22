import { createHash } from 'crypto';

/**
 * Hash a password using SHA-256
 * Note: In a production environment, you should use a proper password hashing
 * algorithm like bcrypt, but for this demo we'll use a simple SHA-256 hash
 */
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * Compare a password with its hash
 */
export function comparePasswords(password: string, hash: string): boolean {
  const hashedPassword = hashPassword(password);
  return hashedPassword === hash;
} 