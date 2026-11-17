import { X } from 'lucide-react';

interface LegalModalProps {
  docType: 'terms' | 'privacy' | null;
  onClose: () => void;
}

export function LegalModal({ docType, onClose }: LegalModalProps) {
  if (!docType) return null;
  const isTerms = docType === 'terms';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div className="w-full max-w-2xl bg-[#1B1F18] border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <h2 id="legal-modal-title" className="text-lg font-display font-bold text-white">
            {isTerms ? 'ANDAÇ FİNANS — Kullanım Koşulları' : 'ANDAÇ FİNANS — Gizlilik Politikası ve KVKK'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#A5A99E] hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4 text-sm text-[#A5A99E] leading-relaxed">
          {isTerms ? (
            <>
              <p className="text-white font-medium">1. Hizmet Kapsamı ve Bilgilendirme Niteliği</p>
              <p>
                ANDAÇ FİNANS platformu; yatırım fonları, kripto varlıklar, Borsa İstanbul hisse senetleri, temettü
                takvimleri ve ekonomi haberlerine ilişkin piyasa analizi ve kişisel portföy takip araçları sunar.
                Platform üzerinde yer alan veriler bilgilendirme ve demo gösterim amaçlıdır; sermaye piyasası
                mevzuatı kapsamında yatırım danışmanlığı veya alım-satım aracılığı teşkil etmez.
              </p>
              <p className="text-white font-medium">2. Kullanıcı Hesabı ve Güvenlik</p>
              <p>
                Kullanıcılar hesap oluştururken doğru e-posta bilgisi sağlamakla ve şifre güvenliğini korumakla
                yükümlüdür. Platform, şifreleri tek yönlü kriptografik özet (scrypt) ile saklar ve yetkisiz
                erişimlere karşı oturum doğrulaması uygular.
              </p>
              <p className="text-white font-medium">3. Fikri Mülkiyet ve Sorumluluk Sınırı</p>
              <p>
                Platform arayüzü, analiz grafikleri ve marka unsurları ANDAÇ FİNANS’a aittir. Kullanıcılar,
                demo olarak işaretlenmiş veriler üzerinden gerçek alım-satım emri iletilmediğini kabul eder.
              </p>
            </>
          ) : (
            <>
              <p className="text-white font-medium">1. İşlenen Kişisel Veriler</p>
              <p>
                ANDAÇ FİNANS; üyelik oluşturma, oturum güvenliği, e-posta doğrulama ve portföy takip
                tercihlerinin saklanması amacıyla yalnızca ad-soyad, e-posta adresi, şifre özet bilgisi ve
                kullanıcı tarafından eklenen takip verilerini işler.
              </p>
              <p className="text-white font-medium">2. Veri Güvenliği ve Saklama</p>
              <p>
                Şifreler hiçbir koşulda açık metin olarak saklanmaz. Oturum anahtarları sunucu tarafında özetlenerek
                korunur. Üçüncü taraf reklam ağlarıyla kişisel veri paylaşımı yapılmaz.
              </p>
              <p className="text-white font-medium">3. Hesap Silme ve Veri İmha Hakkı</p>
              <p>
                Kullanıcılar Profil ve Ayarlar sayfasından diledikleri zaman hesap silme talebi başlatabilir.
                Güvenlik doğrulaması sonrası kimlik bilgileri, favoriler, portföy kayıtları ve aktif oturumlar
                sistemden kalıcı olarak silinir; yalnızca yasal uyumluluk kayıtları anonim referansla tutulur.
              </p>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/[0.08] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#B7F000] text-[#10120D] font-semibold text-sm hover:brightness-105 transition-all"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}
