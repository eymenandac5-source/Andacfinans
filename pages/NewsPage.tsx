import { useMemo, useState } from 'react';
import { ArrowLeft, Clock, Search } from 'lucide-react';
import { NEWS_IMAGE_MAP } from '../data/media';
import type { NewsArticle, NewsCategory } from '../types/finance';
import { formatDateTr } from '../utils/format';

interface NewsPageProps {
  news: NewsArticle[];
  selectedArticle: NewsArticle | null;
  onSelectArticle: (article: NewsArticle | null) => void;
}

const CATEGORIES: ('Tümü' | NewsCategory)[] = [
  'Tümü',
  'Türkiye Ekonomisi',
  'Dünya Ekonomisi',
  'Kripto Para',
  'Borsa',
  'Yatırım Fonları',
  'Şirket Haberleri',
  'Merkez Bankaları',
];

export function NewsPage({ news, selectedArticle, onSelectArticle }: NewsPageProps) {
  const [category, setCategory] = useState<'Tümü' | NewsCategory>('Tümü');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return news.filter((item) => {
      if (category !== 'Tümü' && item.category !== category) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q)
      );
    });
  }, [news, category, search]);

  if (selectedArticle) {
    return (
      <article className="max-w-4xl mx-auto space-y-6">
        <button
          type="button"
          onClick={() => onSelectArticle(null)}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#A5A99E] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Haberlere Geri Dön</span>
        </button>

        <div className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="aspect-[16/9] w-full bg-[#10120D]">
            <img
              src={NEWS_IMAGE_MAP[selectedArticle.imageKey]}
              alt={selectedArticle.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#A5A99E]">
              <span className="text-[#B7F000] font-semibold">{selectedArticle.category}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedArticle.source}</span>
              <span aria-hidden="true">·</span>
              <span>{formatDateTr(selectedArticle.publishedAt)}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {selectedArticle.readTimeMin} dk okuma
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white leading-tight">
              {selectedArticle.title}
            </h2>

            <p className="text-base text-white/90 font-medium leading-relaxed border-b border-white/[0.08] pb-5">
              {selectedArticle.summary}
            </p>

            <div className="space-y-4 text-base text-[#A5A99E] leading-relaxed">
              {selectedArticle.content.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            {selectedArticle.relatedTickers.length > 0 && (
              <div className="pt-5 border-t border-white/[0.08] text-xs text-[#A5A99E]">
                İlgili Varlıklar:{' '}
                <span className="text-white font-mono-num font-semibold">
                  {selectedArticle.relatedTickers.join(' · ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-display font-bold text-white">Finans ve Ekonomi Gündemi</h2>
          <p className="text-xs text-[#A5A99E] mt-1">
            Türkiye ve küresel piyasalardan derlenen editöryal analizler ve piyasa bültenleri.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-[#A5A99E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Haberlerde ara..."
            className="pl-9 pr-4 py-2 rounded-xl bg-[#10120D] border border-white/[0.1] text-sm text-white placeholder-[#A5A99E]/60 focus:outline-none focus:border-[#B7F000] w-full md:w-72"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              category === cat
                ? 'bg-[#B7F000] text-[#10120D]'
                : 'bg-[#1B1F18] text-[#A5A99E] border border-white/[0.08] hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-12 text-center text-sm text-[#A5A99E]">
          Seçilen kategori ve arama kriterine uygun haber bulunamadı.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((article) => (
            <button
              key={article.id}
              type="button"
              onClick={() => onSelectArticle(article)}
              className="group text-left bg-[#1B1F18] border border-white/[0.08] hover:border-[#B7F000]/40 rounded-2xl overflow-hidden flex flex-col transition-colors cursor-pointer"
            >
              <div className="aspect-[4/3] w-full bg-[#10120D] overflow-hidden">
                <img
                  src={NEWS_IMAGE_MAP[article.imageKey]}
                  alt={article.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-[#A5A99E]">
                    <span className="text-[#B7F000] font-medium">{article.category}</span>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span>{formatDateTr(article.publishedAt)}</span>
                  </div>
                  <h3 className="text-base font-display font-bold text-white mt-2 group-hover:text-[#B7F000] transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-[#A5A99E] mt-2 line-clamp-3 leading-relaxed">
                    {article.summary}
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#A5A99E]">
                  <span>{article.source}</span>
                  <span>{article.readTimeMin} dk okuma</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
