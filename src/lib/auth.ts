import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const DEV_FALLBACK_SECRET = 'confeitaria-cinthia-super-secret-key-2026';

function getJwtSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production.');
  }
  console.warn('JWT_SECRET is not set — using an insecure development-only fallback. Set JWT_SECRET in .env before deploying.');
  return DEV_FALLBACK_SECRET;
}

const SECRET_KEY = new TextEncoder().encode(getJwtSecret());

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

export async function createSession(session: AuthSession) {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);

  const cookieStore = await cookies();
  cookieStore.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return token;
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as AuthSession;
  } catch (error) {
    return null;
  }
}

export async function verifyTokenFromReq(req: NextRequest): Promise<AuthSession | null> {
  try {
    const token = req.cookies.get('admin_token')?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as AuthSession;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_token');
}
