import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  KeyRound,
  LogOut,
  MailCheck,
  Shield,
  Trash2,
  UserRound,
} from 'lucide-react';
import { apiRequest, ApiError } from '../lib/api';
import type { UserProfile, UserSettings } from '../types/finance';
import { formatDateTr } from '../utils/format';

interface ProfileSettingsPageProps {
  user: UserProfile | null;
  settings: UserSettings | null;
  onOpenAuth: (mode?: 'welcome' | 'login' | 'register' | 'verify') => void;
  onUserUpdated: (user: UserProfile) => void;
  onSettingsUpdated: (settings: UserSettings) => void;
  onLoggedOut: () => void;
  onAccountDeleted: () => void;
  onOpenLegal: (docType: 'terms' | 'privacy') => void;
}

export function ProfileSettingsPage({
  user,
  settings,
  onOpenAuth,
  onUserUpdated,
  onSettingsUpdated,
  onLoggedOut,
  onAccountDeleted,
  onOpenLegal,
}: ProfileSettingsPageProps) {
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);

  const [localSettings, setLocalSettings] = useState<UserSettings>(
    settings || {
      notifyPriceAlerts: true,
      notifyDividendCalendar: true,
      notifyMarketBrief: true,
      notifySecurityEvents: true,
      profileVisibility: 'private',
      analyticsConsent: false,
    }
  );
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteStepAck, setDeleteStepAck] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) setFullName(user.fullName);
    if (settings) setLocalSettings(settings);
  }, [user, settings]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.06] text-[#A5A99E] flex items-center justify-center mx-auto">
            <UserRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-display font-bold text-white">Misafir Oturumu Aktif</h2>
          <p className="text-sm text-[#A5A99E] leading-relaxed">
            Profil ayarları, bildirim tercihleri, şifre yönetimi ve kişisel portföy kaydı için ANDAÇ FİNANS
            hesabınıza giriş yapmanız gerekir.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="px-5 py-2.5 rounded-xl bg-[#B7F000] text-[#10120D] font-semibold text-sm cursor-pointer"
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="px-5 py-2.5 rounded-xl bg-[#10120D] border border-white/[0.12] text-white font-semibold text-sm cursor-pointer"
            >
              Hesap Oluştur
            </button>
          </div>
        </div>

        <div className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-[#A5A99E]">Yasal Bilgilendirme ve Sözleşmeler</div>
          <div className="flex items-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => onOpenLegal('terms')}
              className="text-white hover:text-[#B7F000] underline cursor-pointer"
            >
              Kullanım Koşulları
            </button>
            <button
              type="button"
              onClick={() => onOpenLegal('privacy')}
              className="text-white hover:text-[#B7F000] underline cursor-pointer"
            >
              Gizlilik Politikası
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileErr(null);
    setProfileMsg(null);
    try {
      const res = await apiRequest<{ user: UserProfile; message: string }>('/api/account/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName }),
      });
      onUserUpdated(res.user);
      setProfileMsg(res.message);
    } catch (err) {
      setProfileErr(err instanceof ApiError ? err.message : 'Profil güncellenemedi.');
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPassErr(null);
    setPassMsg(null);
    if (newPassword !== confirmNewPassword) {
      setPassErr('Yeni şifreler birbiriyle eşleşmiyor.');
      return;
    }
    try {
      const res = await apiRequest<{ message: string }>('/api/account/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword: confirmNewPassword,
        }),
      });
      setPassMsg(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPassErr(err instanceof ApiError ? err.message : 'Şifre değiştirilemedi.');
    }
  }

  async function handleToggleSetting(patch: Partial<UserSettings>) {
    const next = { ...localSettings, ...patch };
    setLocalSettings(next);
    setSettingsMsg(null);
    try {
      const res = await apiRequest<{ settings: UserSettings; message: string }>('/api/account/settings', {
        method: 'PUT',
        body: JSON.stringify(next),
      });
      onSettingsUpdated(res.settings);
      setSettingsMsg(res.message);
    } catch {
      // Keep UI responsive
    }
  }

  async function handleLogout() {
    await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {});
    onLoggedOut();
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteErr(null);
    if (!deleteStepAck) {
      setDeleteErr('Hesap silme sonuçlarını okuyup onay kutusunu işaretlemelisiniz.');
      return;
    }
    if (deleteConfirmText.trim() !== 'HESABIMI SİL') {
      setDeleteErr('Lütfen onay alanına tam olarak "HESABIMI SİL" yazın.');
      return;
    }
    setDeleting(true);
    try {
      await apiRequest('/api/account', {
        method: 'DELETE',
        body: JSON.stringify({
          password: deletePassword,
          confirmationText: deleteConfirmText.trim(),
          reason: deleteReason,
        }),
      });
      setDeleteModalOpen(false);
      onAccountDeleted();
    } catch (err) {
      setDeleteErr(err instanceof ApiError ? err.message : 'Hesap silme işlemi tamamlanamadı.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Account Overview */}
      <section className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-white/[0.08]">
          <div>
            <h2 className="text-lg font-display font-bold text-white">Profil ve Hesap Bilgileri</h2>
            <p className="text-xs text-[#A5A99E] mt-1">
              Kayıt tarihi: {formatDateTr(user.createdAt)} · Hesap ID: {user.id.slice(0, 8)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {user.emailVerified ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B7F000]">
                <CheckCircle2 className="w-4 h-4" />
                E-posta Doğrulandı
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('verify')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B7F000] text-[#10120D] text-xs font-semibold cursor-pointer"
              >
                <MailCheck className="w-3.5 h-3.5" />
                <span>E-postayı Doğrula</span>
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">Ad Soyad</label>
            <input
              type="text"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#B7F000]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">E-posta Adresi</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full rounded-xl bg-[#10120D]/60 border border-white/[0.06] px-4 py-2.5 text-sm text-[#A5A99E]"
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
            <div>
              {profileMsg && <span className="text-xs text-[#B7F000]">{profileMsg}</span>}
              {profileErr && <span className="text-xs text-[#FF5B5B]">{profileErr}</span>}
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#B7F000] text-[#10120D] text-sm font-semibold hover:brightness-105 cursor-pointer"
            >
              Değişiklikleri Kaydet
            </button>
          </div>
        </form>
      </section>

      {/* Password Management */}
      <section className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-[#B7F000]" />
          <h3 className="text-base font-display font-bold text-white">Şifre Değiştirme</h3>
        </div>

        <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">Mevcut Şifre</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#B7F000]"
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
              className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#B7F000]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">Yeni Şifre Tekrar</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#B7F000]"
            />
          </div>

          <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-1">
            <div>
              {passMsg && <span className="text-xs text-[#B7F000]">{passMsg}</span>}
              {passErr && <span className="text-xs text-[#FF5B5B]">{passErr}</span>}
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#10120D] border border-white/[0.14] text-white text-sm font-semibold hover:border-[#B7F000] transition-colors cursor-pointer"
            >
              Şifreyi Güncelle
            </button>
          </div>
        </form>
      </section>

      {/* Notifications & Privacy Settings */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-display font-bold text-white">Bildirim Ayarları</h3>
            {settingsMsg && <span className="text-[11px] text-[#B7F000]">{settingsMsg}</span>}
          </div>

          {(
            [
              { key: 'notifyPriceAlerts', label: 'Fiyat ve Piyasa Uyarıları' },
              { key: 'notifyDividendCalendar', label: 'Temettü Takvimi Hatırlatmaları' },
              { key: 'notifyMarketBrief', label: 'Günlük Piyasa Özeti Bülteni' },
              { key: 'notifySecurityEvents', label: 'Hesap ve Güvenlik Bildirimleri' },
            ] as const
          ).map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between gap-3 py-2 border-b border-white/[0.06] last:border-b-0 cursor-pointer"
            >
              <span className="text-sm text-[#A5A99E]">{item.label}</span>
              <input
                type="checkbox"
                checked={localSettings[item.key]}
                onChange={(e) => handleToggleSetting({ [item.key]: e.target.checked })}
                className="w-4 h-4 accent-[#B7F000] rounded cursor-pointer"
              />
            </label>
          ))}
        </div>

        <div className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#B7F000]" />
            <h3 className="text-base font-display font-bold text-white">Gizlilik ve Yasal Belgeler</h3>
          </div>

          <div className="flex items-center justify-between gap-3 py-2 border-b border-white/[0.06]">
            <span className="text-sm text-[#A5A99E]">Portföy Görünürlüğü</span>
            <select
              value={localSettings.profileVisibility}
              onChange={(e) =>
                handleToggleSetting({
                  profileVisibility: e.target.value === 'masked' ? 'masked' : 'private',
                })
              }
              className="bg-[#10120D] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white"
            >
              <option value="private">Yalnızca Bana Özel</option>
              <option value="masked">Maskelenmiş Tutarlar</option>
            </select>
          </div>

          <label className="flex items-center justify-between gap-3 py-2 border-b border-white/[0.06] cursor-pointer">
            <span className="text-sm text-[#A5A99E]">Anonim Kullanım İstatistikleri</span>
            <input
              type="checkbox"
              checked={localSettings.analyticsConsent}
              onChange={(e) => handleToggleSetting({ analyticsConsent: e.target.checked })}
              className="w-4 h-4 accent-[#B7F000] rounded cursor-pointer"
            />
          </label>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onOpenLegal('terms')}
              className="inline-flex items-center gap-1.5 text-xs text-white hover:text-[#B7F000] cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Kullanım Koşulları</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenLegal('privacy')}
              className="inline-flex items-center gap-1.5 text-xs text-white hover:text-[#B7F000] cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Gizlilik Politikası</span>
            </button>
          </div>
        </div>
      </section>

      {/* Session & Account Deletion */}
      <section className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleLogout}
          className="px-5 py-2.5 rounded-xl bg-[#10120D] border border-white/[0.12] text-white text-sm font-semibold inline-flex items-center gap-2 hover:border-white/30 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Oturumu Kapat</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setDeleteErr(null);
            setDeleteStepAck(false);
            setDeleteConfirmText('');
            setDeletePassword('');
            setDeleteModalOpen(true);
          }}
          className="px-5 py-2.5 rounded-xl bg-[#FF5B5B]/15 border border-[#FF5B5B]/40 text-[#FF5B5B] text-sm font-semibold inline-flex items-center gap-2 hover:bg-[#FF5B5B]/25 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Hesabımı Sil</span>
        </button>
      </section>

      {/* Secure Account Deletion Modal */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-[#1B1F18] border border-[#FF5B5B]/40 rounded-2xl p-6 space-y-5 shadow-2xl my-auto">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF5B5B]/15 text-[#FF5B5B] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-white">Kalıcı Hesap Silme Talebi</h3>
                <p className="text-xs text-[#A5A99E] mt-1">
                  Bu işlem geri alınamaz. Devam etmeden önce sonuçları dikkatle inceleyin.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#10120D] border border-white/[0.08] p-4 space-y-2 text-xs text-[#A5A99E] leading-relaxed">
              <p className="text-white font-semibold">Hesabınızı sildiğinizde gerçekleşecek işlemler:</p>
              <p>1. Tüm aktif oturumlarınız sonlandırılır ve kimlik bilgileriniz kalıcı olarak silinir.</p>
              <p>2. Kayıtlı portföy varlıklarınız, işlem geçmişiniz ve favori listeniz sistemden kaldırılır.</p>
              <p>
                3. Yürürlükteki mevzuat gereği saklanması zorunlu denetim kayıtları yalnızca anonimleştirilmiş
                referans kodu ile tutulur.
              </p>
            </div>

            {deleteErr && (
              <div className="rounded-xl bg-[#FF5B5B]/10 border border-[#FF5B5B]/30 px-4 py-3 text-xs text-[#FF5B5B]">
                {deleteErr}
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <label className="flex items-start gap-2.5 text-xs text-[#A5A99E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteStepAck}
                  onChange={(e) => setDeleteStepAck(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#FF5B5B]"
                />
                <span>
                  Hesabımın ve ilişkili portföy verilerimin kalıcı olarak silineceğini, bu işlemin geri
                  alınamayacağını anlıyorum ve onaylıyorum.
                </span>
              </label>

              <div>
                <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">
                  Onaylamak için <span className="text-white font-mono-num">HESABIMI SİL</span> yazın
                </label>
                <input
                  type="text"
                  required
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="HESABIMI SİL"
                  className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-2.5 text-sm font-mono-num text-white focus:outline-none focus:border-[#FF5B5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">
                  Güvenlik Doğrulaması (Mevcut Şifreniz)
                </label>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF5B5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">
                  Ayrılma Nedeni (İsteğe bağlı)
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Geri bildiriminiz..."
                  className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#10120D] border border-white/[0.1] text-sm font-medium text-[#A5A99E] hover:text-white cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-xl bg-[#FF5B5B] text-white text-sm font-semibold hover:brightness-110 disabled:opacity-60 cursor-pointer"
                >
                  {deleting ? 'Siliniyor...' : 'Hesabımı Kalıcı Olarak Sil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
