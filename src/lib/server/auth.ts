import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { JWT_SECRET } from '$env/static/private';

export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export async function generateToken(userId: string): Promise<string> {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not set in environment variables');
    }
    const secret = new TextEncoder().encode(JWT_SECRET);
    return new SignJWT({ userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret);
}

export async function verifyToken(token: string): Promise<{ userId: string }> {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not set in environment variables');
    }
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string };
} 