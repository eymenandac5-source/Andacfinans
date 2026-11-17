import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Mail, ShieldCheck, X } from 'lucide-react';
import { apiRequest, ApiError, setStoredSessionToken } from '../lib/api';
import type { DevInboxEmail, UserProfile, UserSettings } from '../types/finance';
import { BrandMark } from './BrandMark';

export type AuthModalMode = 'welcome' | 'login' | 'register' | 'forgot' | 'reset' | 'verify';

interface AuthGateModalProps {
  open: boolean;
  initialMode?: AuthModalMode;
  initialToken?: string;
  userEmailForVerify?: string;
  onCloseAsGuest: () => void;
  onAuthSuccess: (user: UserProfile, settings: UserSettings | null) => void;
  onOpenLegal: (docType: 'terms' | 'privacy') => void;
}

export function AuthGateModal({
  open,
  initialMode = 'welcome',
  initialToken = '',
  userEmailForVerify = '',
  onCloseAsGuest,
  onAuthSuccess,
  onOpenLegal,
}: AuthGateModalProps) {
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(userEmailForVerify);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const [tokenInput, setTokenInput] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [inboxEmails, setInboxEmails] = useState<DevInboxEmail[]>([]);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setErrorMsg(null);
      setSuccessMsg(null);
      if (initialToken) setTokenInput(initialToken);
      if (userEmailForVerify) setEmail(userEmailForVerify);
    }
  }, [open, initialMode, initialToken, userEmailForVerify]);

  async function refreshDevInbox(targetEmail: string) {
    if (!targetEmail) return;
    try {
      const res = await apiRequest<{ smtpConfigured: boolean; emails: DevInboxEmail[] }>(
        `/api/auth/dev-inbox?email=${encodeURIComponent(targetEmail)}`
      );
      setInboxEmails(res.emails || []);
    } catch {
      // Ignore dev inbox fetch errors
    }
  }

  if (!open) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest<{
        sessionToken: string;
        user: UserProfile;
        settings: UserSettings | null;
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setStoredSessionToken(res.sessionToken);
      onAuthSuccess(res.user, res.settings);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Giriş yapılamadı.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (password !== confirmPassword) {
      setErrorMsg('Girdiğiniz şifreler birbiriyle eşleşmiyor.');
      return;
    }
    if (!acceptTerms || !acceptPrivacy) {
      setErrorMsg('Kullanım Koşulları ve Gizlilik Politikasını onaylamanız gerekiyor.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest<{
        sessionToken: string;
        user: UserProfile;
        settings: UserSettings | null;
        message: string;
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          password,
          confirmPassword,
          acceptTerms,
          acceptPrivacy,
        }),
      });
      setStoredSessionToken(res.sessionToken);
      setSuccessMsg(res.message);
      await refreshDevInbox(email);
      setMode('verify');
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Hesap oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyToken(tokenToVerify: string) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest<{ ok: boolean; message: string; user: UserProfile | null }>(
        '/api/auth/verify-email',
        {
          method: 'POST',
          body: JSON.stringify({ token: tokenToVerify }),
        }
      );
      setSuccessMsg(res.message);
      if (res.user) {
        onAuthSuccess(res.user, null);
      }
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'E-posta doğrulanamadı.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest<{ ok: boolean; message: string }>('/api/auth/resend-verification', {
        method: 'POST',
      });
      setSuccessMsg(res.message);
      await refreshDevInbox(email);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Doğrulama e-postası gönderilemedi.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest<{ ok: boolean; message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSuccessMsg(res.message);
      await refreshDevInbox(email);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Talep gönderilemedi.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (newPassword !== newPasswordConfirm) {
      setErrorMsg('Yeni şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest<{ ok: boolean; message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: tokenInput,
          newPassword,
          confirmPassword: newPasswordConfirm,
        }),
      });
      setSuccessMsg(res.message);
      setMode('login');
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Şifre yenilenemedi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#10120D]/90 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl bg-[#1B1F18] border border-white/[0.1] rounded-2xl p-6 sm:p-8 shadow-2xl my-auto">
        <button
          type="button"
          onClick={onCloseAsGuest}
          className="absolute top-5 right-5 w-10 h-10 rounded-xl flex items-center justify-center text-[#A5A99E] hover:text-white hover:bg-white/[0.07] transition-colors"
          aria-label="Misafir olarak devam et ve kapat"
          title="Kapat ve misafir olarak devam et"
        >
          <X className="w-5 h-5" />
        </button>

        <BrandMark showSlogan />

        {mode === 'welcome' && (
          <div className="mt-7 space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                Finansal kararlarınızı tek merkezden yönetin.
              </h1>
              <p className="text-sm sm:text-base text-[#A5A99E] mt-3 leading-relaxed">
                Yatırım fonlarını, kripto piyasalarını, Borsa İstanbul temettü takvimini ve güncel ekonomi
                haberlerini inceleyin. Kişisel portföy takibi için ücretsiz hesap oluşturabilirsiniz.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('login');
                }}
                className="w-full py-3.5 px-5 rounded-xl bg-[#B7F000] text-[#10120D] font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-105 transition-all cursor-pointer"
              >
                <span>E-posta ile Giriş Yap</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('register');
                }}
                className="w-full py-3.5 px-5 rounded-xl bg-[#10120D] border border-white/[0.12] text-white font-semibold text-sm hover:border-[#B7F000]/60 transition-colors cursor-pointer"
              >
                Hesap Oluştur
              </button>
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-[#A5A99E]">
                Üyelik oluşturmadan piyasaları ve grafikleri inceleyebilirsiniz.
              </p>
              <button
                type="button"
                onClick={onCloseAsGuest}
                className="text-sm font-medium text-white hover:text-[#B7F000] transition-colors whitespace-nowrap text-left sm:text-right cursor-pointer"
              >
                Misafir Olarak Devam Et →
              </button>
            </div>
          </div>
        )}

        {mode !== 'welcome' && (
          <div className="mt-6">
            <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 mb-5 overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('login');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  mode === 'login' ? 'bg-[#B7F000] text-[#10120D]' : 'text-[#A5A99E] hover:text-white'
                }`}
              >
                Giriş Yap
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('register');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  mode === 'register' ? 'bg-[#B7F000] text-[#10120D]' : 'text-[#A5A99E] hover:text-white'
                }`}
              >
                Hesap Oluştur
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('forgot');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  mode === 'forgot' || mode === 'reset'
                    ? 'bg-[#B7F000] text-[#10120D]'
                    : 'text-[#A5A99E] hover:text-white'
                }`}
              >
                Şifre Yenileme
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl bg-[#FF5B5B]/10 border border-[#FF5B5B]/30 px-4 py-3 text-sm text-[#FF5B5B]">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 rounded-xl bg-[#B7F000]/10 border border-[#B7F000]/30 px-4 py-3 text-sm text-[#B7F000]">
                {successMsg}
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">E-posta Adresi</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="adiniz@ornek.com"
                    className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-3 text-sm text-white placeholder-[#A5A99E]/50 focus:outline-none focus:border-[#B7F000]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[#A5A99E]">Şifre</label>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setMode('forgot');
                      }}
                      className="text-xs text-[#B7F000] hover:underline cursor-pointer"
                    >
                      Şifremi Unuttum
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-3 pr-11 text-sm text-white placeholder-[#A5A99E]/50 focus:outline-none focus:border-[#B7F000]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A5A99E] hover:text-white"
                      aria-label="Şifreyi göster veya gizle"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-[#B7F000] text-[#10120D] font-semibold text-sm hover:brightness-105 disabled:opacity-60 transition-all cursor-pointer"
                >
                  {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                </button>

                <div className="pt-3 flex items-center justify-between text-xs text-[#A5A99E]">
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="hover:text-white cursor-pointer"
                  >
                    Hesabınız yok mu? Hesap Oluştur
                  </button>
                  <button
                    type="button"
                    onClick={onCloseAsGuest}
                    className="hover:text-[#B7F000] cursor-pointer"
                  >
                    Misafir olarak devam et
                  </button>
                </div>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">Ad Soyad</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Örn. Deniz Yılmaz"
                    className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-3 text-sm text-white placeholder-[#A5A99E]/50 focus:outline-none focus:border-[#B7F000]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">E-posta Adresi</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="adiniz@ornek.com"
                    className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-3 text-sm text-white placeholder-[#A5A99E]/50 focus:outline-none focus:border-[#B7F000]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">Şifre (En az 8 karakter)</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-3 text-sm text-white placeholder-[#A5A99E]/50 focus:outline-none focus:border-[#B7F000]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">Şifre Tekrar</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-3 text-sm text-white placeholder-[#A5A99E]/50 focus:outline-none focus:border-[#B7F000]"
                    />
                  </div>
                </div>

                <div className="space-y-2.5 pt-1 text-xs text-[#A5A99E]">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-0.5 accent-[#B7F000] w-4 h-4 rounded"
                    />
                    <span>
                      <button
                        type="button"
                        onClick={() => onOpenLegal('terms')}
                        className="text-white underline hover:text-[#B7F000]"
                      >
                        Kullanım Koşulları
                      </button>
                      ’nı okudum ve kabul ediyorum.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptPrivacy}
                      onChange={(e) => setAcceptPrivacy(e.target.checked)}
                      className="mt-0.5 accent-[#B7F000] w-4 h-4 rounded"
                    />
                    <span>
                      <button
                        type="button"
                        onClick={() => onOpenLegal('privacy')}
                        className="text-white underline hover:text-[#B7F000]"
                      >
                        Gizlilik Politikası ve KVKK Metni
                      </button>
                      ’ni okudum ve onaylıyorum.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-[#B7F000] text-[#10120D] font-semibold text-sm hover:brightness-105 disabled:opacity-60 transition-all cursor-pointer"
                >
                  {loading ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur'}
                </button>
              </form>
            )}

            {mode === 'verify' && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#10120D] border border-white/[0.08]">
                  <Mail className="w-5 h-5 text-[#B7F000] shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-semibold text-white">E-posta Doğrulama Gerekli</div>
                    <p className="text-[#A5A99E] mt-1">
                      <span className="text-white">{email}</span> adresine doğrulama bağlantısı gönderildi.
                      Bağlantıya tıklayarak veya aşağıdaki doğrulama kodunu onaylayarak hesabınızı aktifleştirin.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Doğrulama anahtarını yapıştırın"
                    className="flex-1 rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-2.5 text-sm font-mono-num text-white focus:outline-none focus:border-[#B7F000]"
                  />
                  <button
                    type="button"
                    disabled={loading || !tokenInput}
                    onClick={() => handleVerifyToken(tokenInput)}
                    className="px-4 py-2.5 rounded-xl bg-[#B7F000] text-[#10120D] font-semibold text-sm disabled:opacity-50 cursor-pointer"
                  >
                    Doğrula
                  </button>
                </div>

                {inboxEmails.length > 0 && (
                  <div className="rounded-xl bg-[#10120D] border border-[#B7F000]/25 p-4 space-y-2.5">
                    <div className="text-xs font-semibold text-[#B7F000]">
                      Geliştirici E-posta Önizleme Kutusu (SMTP yapılandırılmadı)
                    </div>
                    {inboxEmails.map((mail) => (
                      <div
                        key={mail.id}
                        className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.06] text-xs"
                      >
                        <div className="min-w-0">
                          <div className="text-white font-medium truncate">{mail.subject}</div>
                          <div className="text-[#A5A99E] truncate">{mail.recipientEmail}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleVerifyToken(mail.token)}
                          className="px-3 py-1.5 rounded-lg bg-[#B7F000] text-[#10120D] font-semibold shrink-0 cursor-pointer"
                        >
                          Bağlantıyı Onayla
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={loading}
                    className="text-xs text-[#A5A99E] hover:text-white underline cursor-pointer"
                  >
                    Doğrulama e-postasını yeniden gönder
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const me = await apiRequest<{ user: UserProfile | null; settings: UserSettings | null }>(
                        '/api/auth/me'
                      );
                      if (me.user) onAuthSuccess(me.user, me.settings);
                    }}
                    className="text-xs font-medium text-[#B7F000] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Platforma Geç</span>
                  </button>
                </div>
              </div>
            )}

            {mode === 'forgot' && (
              <div className="space-y-4">
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-sm text-[#A5A99E]">
                    Kayıtlı e-posta adresinizi girin. Şifre yenileme bağlantısını güvenli şekilde iletelim.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">E-posta Adresi</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="adiniz@ornek.com"
                      className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-3 text-sm text-white focus:outline-none focus:border-[#B7F000]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-[#B7F000] text-[#10120D] font-semibold text-sm hover:brightness-105 cursor-pointer"
                  >
                    {loading ? 'Gönderiliyor...' : 'Şifre Yenileme Bağlantısı Gönder'}
                  </button>
                </form>

                {inboxEmails.filter((m) => m.actionType === 'reset_password').length > 0 && (
                  <div className="rounded-xl bg-[#10120D] border border-[#B7F000]/25 p-4 space-y-2">
                    <div className="text-xs font-semibold text-[#B7F000]">
                      Geliştirici E-posta Önizleme Kutusu
                    </div>
                    {inboxEmails
                      .filter((m) => m.actionType === 'reset_password')
                      .map((mail) => (
                        <div key={mail.id} className="flex items-center justify-between gap-3 text-xs pt-2 border-t border-white/[0.06]">
                          <span className="text-white truncate">{mail.subject}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTokenInput(mail.token);
                              setMode('reset');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#B7F000] text-[#10120D] font-semibold shrink-0 cursor-pointer"
                          >
                            Şifreyi Yenile
                          </button>
                        </div>
                      ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-xs text-[#A5A99E] hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Zaten yenileme kodum var</span>
                </button>
              </div>
            )}

            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">Yenileme Anahtarı</label>
                  <input
                    type="text"
                    required
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="E-postadaki doğrulama anahtarı"
                    className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-3 text-sm font-mono-num text-white focus:outline-none focus:border-[#B7F000]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">Yeni Şifre</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="En az 8 karakter"
                    className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-3 text-sm text-white focus:outline-none focus:border-[#B7F000]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">Yeni Şifre Tekrar</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-3 text-sm text-white focus:outline-none focus:border-[#B7F000]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-[#B7F000] text-[#10120D] font-semibold text-sm hover:brightness-105 cursor-pointer"
                >
                  {loading ? 'Güncelleniyor...' : 'Yeni Şifreyi Kaydet'}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-[11px] text-[#A5A99E]">
          <ShieldCheck className="w-4 h-4 text-[#B7F000] shrink-0" />
          <span>256-bit oturum imzalama ve kriptografik şifre koruması aktif.</span>
        </div>
      </div>
    </div>
  );
}
