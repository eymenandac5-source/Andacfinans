import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';
import type { UserProfile, UserSettings } from '../src/types/finance.ts';

const SESSION_COOKIE_NAME = 'andac_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const TOKEN_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(process.cwd() + '_andac_finans_dev_secret').digest('hex');

export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash: derived, salt };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function hashToken(rawToken: string): string {
  return crypto.createHmac('sha256', TOKEN_SECRET).update(rawToken).digest('hex');
}

export function generateRawToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

export function createSession(userId: string, userAgent?: string): { rawToken: string; expiresAt: string } {
  const rawToken = generateRawToken(32);
  const tokenHash = hashToken(rawToken);
  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, userId, tokenHash, expiresAt, now.toISOString(), userAgent || 'unknown');

  return { rawToken, expiresAt };
}

export function setSessionCookie(res: Response, rawToken: string, expiresAt: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  const maxAgeSec = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
  res.cookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: Math.max(maxAgeSec, 0) * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
}

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
  sessionTokenHash?: string;
}

export function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req);
  return cookies[SESSION_COOKIE_NAME] || null;
}

export function mapUserRow(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    email: String(row.email),
    fullName: String(row.full_name),
    role: row.role === 'admin' ? 'admin' : 'user',
    emailVerified: Number(row.email_verified) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapSettingsRow(row: Record<string, unknown>): UserSettings {
  return {
    notifyPriceAlerts: Number(row.notify_price_alerts) === 1,
    notifyDividendCalendar: Number(row.notify_dividend_calendar) === 1,
    notifyMarketBrief: Number(row.notify_market_brief) === 1,
    notifySecurityEvents: Number(row.notify_security_events) === 1,
    profileVisibility: row.profile_visibility === 'masked' ? 'masked' : 'private',
    analyticsConsent: Number(row.analytics_consent) === 1,
  };
}

export function attachUser(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const rawToken = extractSessionToken(req);
  if (!rawToken) {
    next();
    return;
  }

  const tokenHash = hashToken(rawToken);
  const row = db
    .prepare(
      `SELECT u.*, s.expires_at AS session_expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash);

  if (!row) {
    next();
    return;
  }

  if (new Date(String(row.session_expires_at)).getTime() <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    next();
    return;
  }

  req.user = mapUserRow(row);
  req.sessionTokenHash = tokenHash;
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Bu işlemi gerçekleştirmek için oturum açmanız gerekiyor.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      error: 'Bu alan için yönetici yetkisi gerekiyor.',
      code: 'FORBIDDEN',
    });
    return;
  }
  next();
}
