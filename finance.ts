export type AssetType = 'fund' | 'crypto' | 'stock';

export type PageId =
  | 'dashboard'
  | 'funds'
  | 'crypto'
  | 'dividends'
  | 'news'
  | 'portfolio'
  | 'profile';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  notifyPriceAlerts: boolean;
  notifyDividendCalendar: boolean;
  notifyMarketBrief: boolean;
  notifySecurityEvents: boolean;
  profileVisibility: 'private' | 'masked';
  analyticsConsent: boolean;
}

export interface AuthState {
  authenticated: boolean;
  user: UserProfile | null;
  settings: UserSettings | null;
}

export interface DevInboxEmail {
  id: string;
  recipientEmail: string;
  subject: string;
  actionType: 'verify_email' | 'reset_password';
  token: string;
  actionUrl: string;
  createdAt: string;
}

export interface PricePoint {
  date: string;
  value: number;
}

export interface FundItem {
  id: string;
  code: string;
  name: string;
  founder: string;
  category: 'Teknoloji' | 'Hisse Senedi' | 'Değişken' | 'Katılım' | 'Para Piyasası';
  price: number;
  currency: 'TRY';
  dailyChangePct: number;
  weeklyChangePct: number;
  monthlyChangePct: number;
  yearlyChangePct: number;
  riskLevel: number; // 1-7
  managementFeePct: number;
  aumMillionTry: number;
  investorCount: number;
  description: string;
  benchmark: string;
  history: PricePoint[];
}

export interface CryptoItem {
  id: string;
  symbol: string;
  name: string;
  category: 'Layer 1' | 'DeFi' | 'Altyapı' | 'Ödeme';
  priceUsd: number;
  priceTry: number;
  change24hPct: number;
  change7dPct: number;
  marketCapUsdBillion: number;
  volume24hUsdMillion: number;
  circulatingSupply: string;
  description: string;
  history: PricePoint[];
}

export interface DividendRecord {
  year: number;
  exDate: string;
  paymentDate: string;
  grossPerShareTry: number;
  netPerShareTry: number;
  yieldAtExPct: number;
  status: 'Ödendi' | 'Planlanan';
}

export interface StockItem {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  priceTry: number;
  dailyChangePct: number;
  monthlyChangePct: number;
  yearlyChangePct: number;
  dividendYieldPct: number;
  payoutRatioPct: number;
  peRatio: number;
  pbRatio: number;
  marketCapBillionTry: number;
  nextDividendDate: string;
  lastDividendPerShareTry: number;
  companySummary: string;
  revenueGrowthPct: number;
  netMarginPct: number;
  roePct: number;
  history: PricePoint[];
  dividendHistory: DividendRecord[];
}

export type NewsCategory =
  | 'Türkiye Ekonomisi'
  | 'Dünya Ekonomisi'
  | 'Kripto Para'
  | 'Borsa'
  | 'Yatırım Fonları'
  | 'Şirket Haberleri'
  | 'Merkez Bankaları';

export type NewsImageKey =
  | 'turkey_economy'
  | 'global_markets'
  | 'crypto_market'
  | 'central_banks'
  | 'energy_industry';

export interface NewsArticle {
  id: string;
  title: string;
  category: NewsCategory;
  source: string;
  publishedAt: string;
  readTimeMin: number;
  summary: string;
  content: string[];
  imageKey: NewsImageKey;
  relatedTickers: string[];
}

export interface MarketSnapshot {
  isDemo: boolean;
  dataSourceNotice: string;
  usdTryRate: number;
  eurTryRate: number;
  bist100: { value: number; changePct: number };
  gramGoldTry: { value: number; changePct: number };
  demoPortfolioSeries: PricePoint[];
  topMovers: {
    id: string;
    symbol: string;
    name: string;
    assetType: AssetType;
    priceLabel: string;
    changePct: number;
  }[];
}

export interface PortfolioHolding {
  id: string;
  assetType: AssetType;
  assetId: string;
  symbol: string;
  name: string;
  quantity: number;
  avgCostTry: number;
  currentPriceTry: number;
  marketValueTry: number;
  costBasisTry: number;
  unrealizedPnlTry: number;
  unrealizedPnlPct: number;
  dailyChangePct: number;
  notes: string;
  updatedAt: string;
}

export interface PortfolioTransaction {
  id: string;
  holdingId: string | null;
  assetType: AssetType;
  assetId: string;
  symbol: string;
  txType: 'buy' | 'sell' | 'dividend';
  quantity: number;
  unitPriceTry: number;
  totalAmountTry: number;
  txDate: string;
  createdAt: string;
}

export interface PortfolioSummary {
  totalValueTry: number;
  totalCostTry: number;
  totalPnlTry: number;
  totalPnlPct: number;
  dailyChangeTry: number;
  dailyChangePct: number;
  monthlyChangePct: number;
  allocation: {
    assetType: AssetType;
    label: string;
    valueTry: number;
    percentage: number;
  }[];
  performanceSeries: PricePoint[];
}
