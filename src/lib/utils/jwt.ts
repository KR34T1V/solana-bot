import { SignJWT, jwtVerify } from "jose";
import { JWT_SECRET } from "$env/static/private";
import type { TokenPayload } from "$lib/types/auth";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in environment variables");
}

const secret = new TextEncoder().encode(JWT_SECRET);

export async function generateToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as TokenPayload;
  } catch (error) {
    throw new Error("Invalid token");
  }
}
