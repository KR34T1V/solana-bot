import { SignJWT, jwtVerify } from "jose";
import { JWT_SECRET } from "$env/static/private";
import type { TokenPayload } from "$lib/types/auth";

const encoder = new TextEncoder();

export async function generateToken(userId: string): Promise<string> {
  const secret = encoder.encode(JWT_SECRET);
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return token;
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const secret = encoder.encode(JWT_SECRET);
  const { payload } = await jwtVerify(token, secret);

  if (!payload.userId || typeof payload.userId !== "string") {
    throw new Error("Invalid token payload");
  }

  return { userId: payload.userId };
}
