import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db';
import type { SupportedLanguage, User, UserRole } from '../src/types';

const COOKIE_NAME = 'zyratech_session';
const SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(process.cwd() + ':zyratech-secret-v2').digest('hex');

export interface AuthedRequest extends Request {
  user?: User;
}

export function createSessionToken(userId: string): string {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 7;
  const payload = Buffer.from(JSON.stringify({ userId, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed.userId || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) {
      return null;
    }
    return parsed.userId;
  } catch {
    return null;
  }
}

export function setSessionCookie(req: Request, res: Response, userId: string): string {
  const token = createSessionToken(userId);
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: '/',
  });
  return token;
}

export function clearSessionCookie(req: Request, res: Response): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie(COOKIE_NAME, {
    path: '/',
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
  });
}

export function extractTokenFromRequest(req: Request): string | undefined {
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (cookieToken) return cookieToken;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return undefined;
}

export function getUserById(userId: string): User | null {
  const row = db
    .prepare(
      'SELECT id, email, roll_number, role, full_name, preferred_language, is_demo, avatar_url, created_at FROM users WHERE id = ?'
    )
    .get(userId) as
    | {
        id: string;
        email: string;
        roll_number: string;
        role: UserRole;
        full_name: string;
        preferred_language: SupportedLanguage;
        is_demo: number;
        avatar_url: string | null;
        created_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    rollNumber: row.roll_number,
    role: row.role,
    fullName: row.full_name,
    preferredLanguage: row.preferred_language || 'en',
    isDemo: row.is_demo === 1,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = extractTokenFromRequest(req);
  const userId = verifySessionToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Authentication required. Please log in to continue.' });
    return;
  }
  const user = getUserById(userId);
  if (!user) {
    clearSessionCookie(req, res);
    res.status(401).json({ error: 'Session expired or user not found.' });
    return;
  }
  req.user = user;
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Administrator portal access required.' });
      return;
    }
    next();
  });
}

export function requireStudent(req: AuthedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'student') {
      res.status(403).json({ error: 'Student portal access required.' });
      return;
    }
    next();
  });
}

export function normalizeStudentLoginEmail(input: string): string {
  const clean = input.trim().toLowerCase();
  if (/^[a-z0-9_-]+$/.test(clean) && !clean.includes('@')) {
    return `${clean}@zyra.in`;
  }
  return clean;
}

export function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
