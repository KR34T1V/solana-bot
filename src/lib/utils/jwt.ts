/**
 * @file JWT token generation and verification utilities
 * @version 1.0.0
 * @module lib/utils/jwt
 * @author Development Team
 * @lastModified 2024-01-02
 */

import { SignJWT, jwtVerify } from "jose";
import { JWT_SECRET } from "$env/static/private";
import type { TokenPayload } from "$lib/types/auth";

const encoder = new TextEncoder();

/**
 * @function generateToken
 * @description Generates a JWT token for a given user ID
 *
 * @param {string} userId - The ID of the user to generate a token for
 * @returns {Promise<string>} A signed JWT token
 * @throws {Error} If token generation fails
 */
export async function generateToken(userId: string): Promise<string> {
  const secret = encoder.encode(JWT_SECRET);
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

/**
 * @function verifyToken
 * @description Verifies a JWT token and returns the payload
 *
 * @param {string} token - The JWT token to verify
 * @returns {Promise<TokenPayload>} The decoded token payload containing userId
 * @throws {Error} If token verification fails or payload is invalid
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  const secret = encoder.encode(JWT_SECRET);
  const { payload } = await jwtVerify(token, secret);

  if (!payload.userId || typeof payload.userId !== "string") {
    throw new Error("Invalid token payload");
  }

  return { userId: payload.userId };
}
