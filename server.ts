import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import {
  attachUser,
  clearSessionCookie,
  createSession,
  generateRawToken,
  hashPassword,
  hashToken,
  mapSettingsRow,
  mapUserRow,
  requireAuth,
  setSessionCookie,
  verifyPassword,
  type AuthenticatedRequest,
} from './server/auth.ts';
import { db, runInTransaction } from './server/db.ts';
import {
  DEMO_CRYPTO,
  DEMO_FUNDS,
  DEMO_NEWS,
  DEMO_STOCKS,
  MARKET_SNAPSHOT,
  findAssetPriceTry,
} from './server/marketData.ts';
import type {
  AssetType,
  PortfolioHolding,
  PortfolioSummary,
  PortfolioTransaction,
} from './src/types/finance.ts';

dotenv.config();

const PORT = 3000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

function getAppBaseUrl(req: express.Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function queueVerificationOrResetEmail(
  recipientEmail: string,
  actionType: 'verify_email' | 'reset_password',
  rawToken: string,
  baseUrl: string
) {
  const subject =
    actionType === 'verify_email'
      ? 'ANDAÇ FİNANS — E-posta Adresinizi Doğrulayın'
      : 'ANDAÇ FİNANS — Şifre Yenileme Talebi';
  const paramName = actionType === 'verify_email' ? 'verifyToken' : 'resetToken';
  const actionUrl = `${baseUrl}/?${paramName}=${encodeURIComponent(rawToken)}`;

  db.prepare(
    `INSERT INTO outbox_emails (id, recipient_email, subject, action_type, token, action_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), recipientEmail, subject, actionType, rawToken, actionUrl, new Date().toISOString());

  return { actionUrl, subject };
}

function buildPortfolioResponse(userId: string): {
  holdings: PortfolioHolding[];
  transactions: PortfolioTransaction[];
  summary: PortfolioSummary;
} {
  const holdingRows = db
    .prepare('SELECT * FROM portfolio_holdings WHERE user_id = ? ORDER BY updated_at DESC')
    .all(userId);

  const txRows = db
    .prepare('SELECT * FROM portfolio_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 30')
    .all(userId);

  const holdings: PortfolioHolding[] = holdingRows.map((row) => {
    const assetType = String(row.asset_type) as AssetType;
    const assetId = String(row.asset_id);
    const quantity = Number(row.quantity);
    const avgCostTry = Number(row.avg_cost);
    const live = findAssetPriceTry(assetType, assetId);
    const currentPriceTry = live ? live.priceTry : avgCostTry;
    const dailyChangePct = live ? live.dailyChangePct : 0;
    const marketValueTry = Number((quantity * currentPriceTry).toFixed(2));
    const costBasisTry = Number((quantity * avgCostTry).toFixed(2));
    const unrealizedPnlTry = Number((marketValueTry - costBasisTry).toFixed(2));
    const unrealizedPnlPct = costBasisTry > 0 ? Number(((unrealizedPnlTry / costBasisTry) * 100).toFixed(2)) : 0;

    return {
      id: String(row.id),
      assetType,
      assetId,
      symbol: String(row.symbol),
      name: String(row.name),
      quantity,
      avgCostTry,
      currentPriceTry,
      marketValueTry,
      costBasisTry,
      unrealizedPnlTry,
      unrealizedPnlPct,
      dailyChangePct,
      notes: String(row.notes || ''),
      updatedAt: String(row.updated_at),
    };
  });

  const transactions: PortfolioTransaction[] = txRows.map((row) => ({
    id: String(row.id),
    holdingId: row.holding_id ? String(row.holding_id) : null,
    assetType: String(row.asset_type) as AssetType,
    assetId: String(row.asset_id),
    symbol: String(row.symbol),
    txType: String(row.tx_type) as 'buy' | 'sell' | 'dividend',
    quantity: Number(row.quantity),
    unitPriceTry: Number(row.unit_price),
    totalAmountTry: Number(row.total_amount),
    txDate: String(row.tx_date),
    createdAt: String(row.created_at),
  }));

  const totalValueTry = Number(holdings.reduce((sum, h) => sum + h.marketValueTry, 0).toFixed(2));
  const totalCostTry = Number(holdings.reduce((sum, h) => sum + h.costBasisTry, 0).toFixed(2));
  const totalPnlTry = Number((totalValueTry - totalCostTry).toFixed(2));
  const totalPnlPct = totalCostTry > 0 ? Number(((totalPnlTry / totalCostTry) * 100).toFixed(2)) : 0;

  const dailyChangeTry = Number(
    holdings.reduce((sum, h) => sum + (h.marketValueTry * h.dailyChangePct) / 100, 0).toFixed(2)
  );
  const dailyChangePct = totalValueTry > 0 ? Number(((dailyChangeTry / totalValueTry) * 100).toFixed(2)) : 0;

  const typeGroups: { assetType: AssetType; label: string }[] = [
    { assetType: 'fund', label: 'Yatırım Fonları' },
    { assetType: 'stock', label: 'BIST Hisse & Temettü' },
    { assetType: 'crypto', label: 'Kripto Varlıklar' },
  ];

  const allocation = typeGroups.map((group) => {
    const val = Number(
      holdings
        .filter((h) => h.assetType === group.assetType)
        .reduce((acc, h) => acc + h.marketValueTry, 0)
        .toFixed(2)
    );
    const pct = totalValueTry > 0 ? Number(((val / totalValueTry) * 100).toFixed(1)) : 0;
    return {
      assetType: group.assetType,
      label: group.label,
      valueTry: val,
      percentage: pct,
    };
  });

  // Build 14-point performance curve scaled to current portfolio value
  const baseValue = totalValueTry > 0 ? totalValueTry : 0;
  const performanceSeries = Array.from({ length: 14 }, (_, idx) => {
    const daysAgo = 13 - idx;
    const d = new Date('2026-11-15T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - daysAgo);
    if (baseValue === 0) {
      return { date: d.toISOString().slice(0, 10), value: 0 };
    }
    const progress = idx / 13;
    const interpolated = totalCostTry + (baseValue - totalCostTry) * progress;
    const ripple = idx === 13 ? 1 : 1 + Math.sin(idx * 0.85) * 0.012;
    return {
      date: d.toISOString().slice(0, 10),
      value: Number((interpolated * ripple).toFixed(2)),
    };
  });

  return {
    holdings,
    transactions,
    summary: {
      totalValueTry,
      totalCostTry,
      totalPnlTry,
      totalPnlPct,
      dailyChangeTry,
      dailyChangePct,
      monthlyChangePct: totalPnlPct !== 0 ? Number((totalPnlPct * 0.65).toFixed(2)) : 0,
      allocation,
      performanceSeries,
    },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(attachUser);

  // --- Health ---
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'andac-finans-api', timestamp: new Date().toISOString() });
  });

  // --- Auth Endpoints ---
  app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.json({ authenticated: false, user: null, settings: null });
      return;
    }
    const settingsRow = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id);
    const settings = settingsRow
      ? mapSettingsRow(settingsRow)
      : {
          notifyPriceAlerts: true,
          notifyDividendCalendar: true,
          notifyMarketBrief: true,
          notifySecurityEvents: true,
          profileVisibility: 'private' as const,
          analyticsConsent: false,
        };
    res.json({ authenticated: true, user: req.user, settings });
  });

  app.post('/api/auth/register', (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';
    const acceptTerms = Boolean(req.body?.acceptTerms);
    const acceptPrivacy = Boolean(req.body?.acceptPrivacy);

    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ error: 'Lütfen geçerli bir e-posta adresi girin.' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Şifreniz en az 8 karakter uzunluğunda olmalıdır.' });
      return;
    }
    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Girdiğiniz şifreler birbiriyle eşleşmiyor.' });
      return;
    }
    if (!acceptTerms || !acceptPrivacy) {
      res.status(400).json({
        error: 'Hesap oluşturmak için Kullanım Koşulları ve Gizlilik Politikasını onaylamanız gerekir.',
      });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({ error: 'Bu e-posta adresi ile kayıtlı bir hesap zaten bulunuyor.' });
      return;
    }

    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { hash, salt } = hashPassword(password);
    const displayName = fullName || email.split('@')[0];
    const verifyRawToken = generateRawToken(24);
    const verifyTokenHash = hashToken(verifyRawToken);
    const verifyExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

    runInTransaction(() => {
      db.prepare(
        `INSERT INTO users (id, email, full_name, password_hash, password_salt, role, email_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'user', 0, ?, ?)`
      ).run(userId, email, displayName, hash, salt, now, now);

      db.prepare(
        `INSERT INTO user_settings (user_id, notify_price_alerts, notify_dividend_calendar, notify_market_brief, notify_security_events, profile_visibility, analytics_consent, updated_at)
         VALUES (?, 1, 1, 1, 1, 'private', 0, ?)`
      ).run(userId, now);

      db.prepare(
        `INSERT INTO verification_tokens (id, user_id, token_hash, type, expires_at, used_at, created_at)
         VALUES (?, ?, ?, 'verify_email', ?, NULL, ?)`
      ).run(crypto.randomUUID(), userId, verifyTokenHash, verifyExpiresAt, now);
    });

    const baseUrl = getAppBaseUrl(req);
    queueVerificationOrResetEmail(email, 'verify_email', verifyRawToken, baseUrl);

    const { rawToken: sessionToken, expiresAt } = createSession(userId, req.headers['user-agent']);
    setSessionCookie(res, sessionToken, expiresAt);

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)!;
    const settingsRow = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId)!;

    res.status(201).json({
      authenticated: true,
      sessionToken,
      user: mapUserRow(userRow),
      settings: mapSettingsRow(settingsRow),
      message: 'Hesabınız oluşturuldu. E-posta doğrulama bağlantısı gönderildi.',
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!EMAIL_REGEX.test(email) || !password) {
      res.status(400).json({ error: 'E-posta adresinizi ve şifrenizi eksiksiz girin.' });
      return;
    }

    const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!userRow) {
      res.status(401).json({ error: 'E-posta adresi veya şifre hatalı.' });
      return;
    }

    const valid = verifyPassword(password, String(userRow.password_hash), String(userRow.password_salt));
    if (!valid) {
      res.status(401).json({ error: 'E-posta adresi veya şifre hatalı.' });
      return;
    }

    const userId = String(userRow.id);
    const { rawToken: sessionToken, expiresAt } = createSession(userId, req.headers['user-agent']);
    setSessionCookie(res, sessionToken, expiresAt);

    const settingsRow = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);

    res.json({
      authenticated: true,
      sessionToken,
      user: mapUserRow(userRow),
      settings: settingsRow ? mapSettingsRow(settingsRow) : null,
    });
  });

  app.post('/api/auth/logout', (req: AuthenticatedRequest, res) => {
    if (req.sessionTokenHash) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.sessionTokenHash);
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.post('/api/auth/verify-email', (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      res.status(400).json({ error: 'Doğrulama anahtarı eksik.' });
      return;
    }

    const tokenHash = hashToken(token);
    const tokenRow = db
      .prepare(
        `SELECT * FROM verification_tokens
         WHERE token_hash = ? AND type = 'verify_email' AND used_at IS NULL`
      )
      .get(tokenHash);

    if (!tokenRow) {
      res.status(400).json({ error: 'Doğrulama bağlantısı geçersiz veya daha önce kullanılmış.' });
      return;
    }

    if (new Date(String(tokenRow.expires_at)).getTime() < Date.now()) {
      res.status(400).json({ error: 'Doğrulama bağlantısının süresi dolmuş. Yeni bağlantı talep edin.' });
      return;
    }

    const now = new Date().toISOString();
    const userId = String(tokenRow.user_id);

    runInTransaction(() => {
      db.prepare('UPDATE verification_tokens SET used_at = ? WHERE id = ?').run(now, tokenRow.id);
      db.prepare('UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?').run(now, userId);
    });

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    res.json({
      ok: true,
      message: 'E-posta adresiniz başarıyla doğrulandı. Hesabınız aktif durumda.',
      user: userRow ? mapUserRow(userRow) : null,
    });
  });

  app.post('/api/auth/resend-verification', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (user.emailVerified) {
      res.json({ ok: true, message: 'E-posta adresiniz zaten doğrulanmış.' });
      return;
    }

    const rawToken = generateRawToken(24);
    const tokenHash = hashToken(rawToken);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

    runInTransaction(() => {
      db.prepare(
        `UPDATE verification_tokens SET used_at = ? WHERE user_id = ? AND type = 'verify_email' AND used_at IS NULL`
      ).run(now, user.id);

      db.prepare(
        `INSERT INTO verification_tokens (id, user_id, token_hash, type, expires_at, used_at, created_at)
         VALUES (?, ?, ?, 'verify_email', ?, NULL, ?)`
      ).run(crypto.randomUUID(), user.id, tokenHash, expiresAt, now);
    });

    queueVerificationOrResetEmail(user.email, 'verify_email', rawToken, getAppBaseUrl(req));
    res.json({
      ok: true,
      message: 'Yeni doğrulama e-postası gönderildi.',
    });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ error: 'Lütfen geçerli bir e-posta adresi girin.' });
      return;
    }

    const userRow = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);
    if (userRow) {
      const rawToken = generateRawToken(24);
      const tokenHash = hashToken(rawToken);
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour

      runInTransaction(() => {
        db.prepare(
          `UPDATE verification_tokens SET used_at = ? WHERE user_id = ? AND type = 'reset_password' AND used_at IS NULL`
        ).run(now, userRow.id);

        db.prepare(
          `INSERT INTO verification_tokens (id, user_id, token_hash, type, expires_at, used_at, created_at)
           VALUES (?, ?, ?, 'reset_password', ?, NULL, ?)`
        ).run(crypto.randomUUID(), userRow.id, tokenHash, expiresAt, now);
      });

      queueVerificationOrResetEmail(email, 'reset_password', rawToken, getAppBaseUrl(req));
    }

    res.json({
      ok: true,
      message:
        'Eğer bu e-posta adresi sistemimizde kayıtlıysa, güvenli şifre yenileme bağlantısı gönderildi.',
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';

    if (!token) {
      res.status(400).json({ error: 'Şifre yenileme anahtarı geçersiz.' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Yeni şifreniz en az 8 karakter olmalıdır.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'Yeni şifreler birbiriyle eşleşmiyor.' });
      return;
    }

    const tokenHash = hashToken(token);
    const tokenRow = db
      .prepare(
        `SELECT * FROM verification_tokens
         WHERE token_hash = ? AND type = 'reset_password' AND used_at IS NULL`
      )
      .get(tokenHash);

    if (!tokenRow) {
      res.status(400).json({ error: 'Şifre yenileme bağlantısı geçersiz veya kullanılmış.' });
      return;
    }

    if (new Date(String(tokenRow.expires_at)).getTime() < Date.now()) {
      res.status(400).json({ error: 'Şifre yenileme bağlantısının süresi dolmuş.' });
      return;
    }

    const now = new Date().toISOString();
    const userId = String(tokenRow.user_id);
    const { hash, salt } = hashPassword(newPassword);

    runInTransaction(() => {
      db.prepare('UPDATE verification_tokens SET used_at = ? WHERE id = ?').run(now, tokenRow.id);
      db.prepare('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?').run(
        hash,
        salt,
        now,
        userId
      );
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    });

    res.json({
      ok: true,
      message: 'Şifreniz güvenli biçimde güncellendi. Yeni şifrenizle giriş yapabilirsiniz.',
    });
  });

  // Preview mailbox endpoint when SMTP is not configured
  app.get('/api/auth/dev-inbox', (req: AuthenticatedRequest, res) => {
    if (process.env.SMTP_HOST) {
      res.json({ smtpConfigured: true, emails: [] });
      return;
    }
    const requestedEmail = normalizeEmail(req.query.email);
    const targetEmail = req.user?.email || requestedEmail;
    if (!targetEmail) {
      res.json({ smtpConfigured: false, emails: [] });
      return;
    }
    const rows = db
      .prepare(
        `SELECT id, recipient_email, subject, action_type, token, action_url, created_at
         FROM outbox_emails
         WHERE recipient_email = ?
         ORDER BY created_at DESC
         LIMIT 5`
      )
      .all(targetEmail);

    res.json({
      smtpConfigured: false,
      emails: rows.map((r) => ({
        id: String(r.id),
        recipientEmail: String(r.recipient_email),
        subject: String(r.subject),
        actionType: String(r.action_type) as 'verify_email' | 'reset_password',
        token: String(r.token),
        actionUrl: String(r.action_url),
        createdAt: String(r.created_at),
      })),
    });
  });

  // --- Account & Settings Endpoints ---
  app.put('/api/account/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    if (fullName.length < 2 || fullName.length > 80) {
      res.status(400).json({ error: 'Ad Soyad alanı 2 ile 80 karakter arasında olmalıdır.' });
      return;
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET full_name = ?, updated_at = ? WHERE id = ?').run(fullName, now, req.user!.id);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id)!;
    res.json({ user: mapUserRow(updated), message: 'Profil bilgileriniz güncellendi.' });
  });

  app.put('/api/account/password', requireAuth, (req: AuthenticatedRequest, res) => {
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Mevcut şifrenizi ve yeni şifrenizi girin.' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Yeni şifreniz en az 8 karakter uzunluğunda olmalıdır.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'Yeni şifreler birbiriyle eşleşmiyor.' });
      return;
    }

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id);
    if (!userRow || !verifyPassword(currentPassword, String(userRow.password_hash), String(userRow.password_salt))) {
      res.status(401).json({ error: 'Mevcut şifreniz hatalı.' });
      return;
    }

    const { hash, salt } = hashPassword(newPassword);
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?').run(
      hash,
      salt,
      now,
      req.user!.id
    );

    res.json({ ok: true, message: 'Şifreniz başarıyla değiştirildi.' });
  });

  app.put('/api/account/settings', requireAuth, (req: AuthenticatedRequest, res) => {
    const s = req.body || {};
    const now = new Date().toISOString();
    const profileVisibility = s.profileVisibility === 'masked' ? 'masked' : 'private';

    db.prepare(
      `INSERT INTO user_settings (
         user_id, notify_price_alerts, notify_dividend_calendar, notify_market_brief,
         notify_security_events, profile_visibility, analytics_consent, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         notify_price_alerts = excluded.notify_price_alerts,
         notify_dividend_calendar = excluded.notify_dividend_calendar,
         notify_market_brief = excluded.notify_market_brief,
         notify_security_events = excluded.notify_security_events,
         profile_visibility = excluded.profile_visibility,
         analytics_consent = excluded.analytics_consent,
         updated_at = excluded.updated_at`
    ).run(
      req.user!.id,
      s.notifyPriceAlerts ? 1 : 0,
      s.notifyDividendCalendar ? 1 : 0,
      s.notifyMarketBrief ? 1 : 0,
      s.notifySecurityEvents ? 1 : 0,
      profileVisibility,
      s.analyticsConsent ? 1 : 0,
      now
    );

    const row = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user!.id)!;
    res.json({ settings: mapSettingsRow(row), message: 'Tercihleriniz kaydedildi.' });
  });

  app.delete('/api/account', requireAuth, (req: AuthenticatedRequest, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const confirmationText = typeof req.body?.confirmationText === 'string' ? req.body.confirmationText.trim() : '';
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 200) : 'Kullanıcı talebi';

    if (confirmationText !== 'HESABIMI SİL') {
      res.status(400).json({ error: 'Onay kutusuna tam olarak "HESABIMI SİL" yazmanız gerekir.' });
      return;
    }

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id);
    if (!userRow) {
      res.status(404).json({ error: 'Kullanıcı hesabı bulunamadı.' });
      return;
    }

    if (!verifyPassword(password, String(userRow.password_hash), String(userRow.password_salt))) {
      res.status(401).json({ error: 'Güvenlik doğrulaması başarısız: Mevcut şifreniz hatalı.' });
      return;
    }

    const userId = String(userRow.id);
    const userEmail = String(userRow.email);
    const anonymizedRef = crypto.createHash('sha256').update(userId).digest('hex').slice(0, 16);
    const now = new Date().toISOString();

    runInTransaction(() => {
      db.prepare('INSERT INTO account_deletion_logs (id, anonymized_ref, reason, deleted_at) VALUES (?, ?, ?, ?)').run(
        crypto.randomUUID(),
        anonymizedRef,
        reason || 'Kullanıcı talebi',
        now
      );
      db.prepare('DELETE FROM outbox_emails WHERE recipient_email = ?').run(userEmail);
      db.prepare('DELETE FROM favorites WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM portfolio_transactions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM portfolio_holdings WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM verification_tokens WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    });

    clearSessionCookie(res);
    res.json({
      ok: true,
      message: 'Hesabınız ve ilişkili kişisel verileriniz güvenli biçimde silindi.',
    });
  });

  // --- Market Data Endpoints ---
  app.get('/api/markets/overview', (_req, res) => {
    res.json({
      snapshot: MARKET_SNAPSHOT,
      funds: DEMO_FUNDS,
      crypto: DEMO_CRYPTO,
      stocks: DEMO_STOCKS,
      news: DEMO_NEWS,
    });
  });

  app.get('/api/markets/funds', (_req, res) => {
    res.json({ isDemo: true, items: DEMO_FUNDS });
  });

  app.get('/api/markets/crypto', (_req, res) => {
    res.json({ isDemo: true, items: DEMO_CRYPTO });
  });

  app.get('/api/markets/stocks', (_req, res) => {
    res.json({ isDemo: true, items: DEMO_STOCKS });
  });

  app.get('/api/markets/news', (_req, res) => {
    res.json({ isDemo: true, items: DEMO_NEWS });
  });

  // --- Favorites Endpoints (Auth Required) ---
  app.get('/api/favorites', requireAuth, (req: AuthenticatedRequest, res) => {
    const rows = db
      .prepare('SELECT asset_type, asset_id, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.user!.id);

    res.json({
      favorites: rows.map((r) => ({
        assetType: String(r.asset_type) as AssetType,
        assetId: String(r.asset_id),
        createdAt: String(r.created_at),
      })),
    });
  });

  app.post('/api/favorites/toggle', requireAuth, (req: AuthenticatedRequest, res) => {
    const assetType = req.body?.assetType;
    const assetId = typeof req.body?.assetId === 'string' ? req.body.assetId.trim() : '';

    if (!['fund', 'crypto', 'stock'].includes(assetType) || !assetId) {
      res.status(400).json({ error: 'Geçersiz varlık seçimi.' });
      return;
    }

    const existing = db
      .prepare('SELECT 1 FROM favorites WHERE user_id = ? AND asset_type = ? AND asset_id = ?')
      .get(req.user!.id, assetType, assetId);

    let isFavorite = false;
    if (existing) {
      db.prepare('DELETE FROM favorites WHERE user_id = ? AND asset_type = ? AND asset_id = ?').run(
        req.user!.id,
        assetType,
        assetId
      );
      isFavorite = false;
    } else {
      db.prepare('INSERT INTO favorites (user_id, asset_type, asset_id, created_at) VALUES (?, ?, ?, ?)').run(
        req.user!.id,
        assetType,
        assetId,
        new Date().toISOString()
      );
      isFavorite = true;
    }

    res.json({ ok: true, isFavorite });
  });

  // --- Portfolio Endpoints (Auth Required) ---
  app.get('/api/portfolio', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json(buildPortfolioResponse(req.user!.id));
  });

  app.post('/api/portfolio/holdings', requireAuth, (req: AuthenticatedRequest, res) => {
    const assetType = req.body?.assetType as AssetType;
    const assetId = typeof req.body?.assetId === 'string' ? req.body.assetId.trim() : '';
    const quantity = Number(req.body?.quantity);
    const avgCostTry = Number(req.body?.avgCostTry);
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 160) : '';

    if (!['fund', 'crypto', 'stock'].includes(assetType) || !assetId) {
      res.status(400).json({ error: 'Lütfen geçerli bir yatırım varlığı seçin.' });
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      res.status(400).json({ error: 'Miktar sıfırdan büyük geçerli bir sayı olmalıdır.' });
      return;
    }
    if (!Number.isFinite(avgCostTry) || avgCostTry <= 0) {
      res.status(400).json({ error: 'Birim maliyet sıfırdan büyük olmalıdır.' });
      return;
    }

    const assetMeta = findAssetPriceTry(assetType, assetId);
    if (!assetMeta) {
      res.status(404).json({ error: 'Seçilen varlık piyasa listesinde bulunamadı.' });
      return;
    }

    const now = new Date().toISOString();
    const userId = req.user!.id;

    runInTransaction(() => {
      const existing = db
        .prepare('SELECT * FROM portfolio_holdings WHERE user_id = ? AND asset_type = ? AND asset_id = ?')
        .get(userId, assetType, assetId);

      let holdingId: string;
      if (existing) {
        holdingId = String(existing.id);
        const prevQty = Number(existing.quantity);
        const prevCost = Number(existing.avg_cost);
        const newQty = prevQty + quantity;
        const weightedAvg = (prevQty * prevCost + quantity * avgCostTry) / newQty;

        db.prepare(
          `UPDATE portfolio_holdings
           SET quantity = ?, avg_cost = ?, notes = ?, updated_at = ?
           WHERE id = ? AND user_id = ?`
        ).run(newQty, Number(weightedAvg.toFixed(4)), notes || String(existing.notes || ''), now, holdingId, userId);
      } else {
        holdingId = crypto.randomUUID();
        db.prepare(
          `INSERT INTO portfolio_holdings (id, user_id, asset_type, asset_id, symbol, name, quantity, avg_cost, currency, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'TRY', ?, ?, ?)`
        ).run(holdingId, userId, assetType, assetId, assetMeta.symbol, assetMeta.name, quantity, avgCostTry, notes, now, now);
      }

      db.prepare(
        `INSERT INTO portfolio_transactions (id, user_id, holding_id, asset_type, asset_id, symbol, tx_type, quantity, unit_price, total_amount, tx_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'buy', ?, ?, ?, ?, ?)`
      ).run(
        crypto.randomUUID(),
        userId,
        holdingId,
        assetType,
        assetId,
        assetMeta.symbol,
        quantity,
        avgCostTry,
        Number((quantity * avgCostTry).toFixed(2)),
        now.slice(0, 10),
        now
      );
    });

    res.status(201).json(buildPortfolioResponse(userId));
  });

  app.delete('/api/portfolio/holdings/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const holdingId = String(req.params.id || '');
    const userId = req.user!.id;

    const existing = db
      .prepare('SELECT * FROM portfolio_holdings WHERE id = ? AND user_id = ?')
      .get(holdingId, userId);

    if (!existing) {
      res.status(404).json({ error: 'Portföy kalemi bulunamadı.' });
      return;
    }

    const live = findAssetPriceTry(String(existing.asset_type) as AssetType, String(existing.asset_id));
    const unitPrice = live ? live.priceTry : Number(existing.avg_cost);
    const qty = Number(existing.quantity);
    const now = new Date().toISOString();

    runInTransaction(() => {
      db.prepare(
        `INSERT INTO portfolio_transactions (id, user_id, holding_id, asset_type, asset_id, symbol, tx_type, quantity, unit_price, total_amount, tx_date, created_at)
         VALUES (?, ?, NULL, ?, ?, ?, 'sell', ?, ?, ?, ?, ?)`
      ).run(
        crypto.randomUUID(),
        userId,
        existing.asset_type,
        existing.asset_id,
        existing.symbol,
        qty,
        unitPrice,
        Number((qty * unitPrice).toFixed(2)),
        now.slice(0, 10),
        now
      );

      db.prepare('DELETE FROM portfolio_holdings WHERE id = ? AND user_id = ?').run(holdingId, userId);
    });

    res.json(buildPortfolioResponse(userId));
  });

  // --- Vite Dev / Production Static Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ANDAÇ FİNANS server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
