export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  marketCap?: number;
  timestamp: Date;
}

export interface CandlestickData {
  symbol: string;
  timeframe: string;
  data: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

export interface Portfolio {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  assets: PortfolioAsset[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioAsset {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  quantity: number;
  avgCostBasis: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  lastUpdated: Date;
}

export interface PriceAlert {
  _id: string;
  userId: string;
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  alertType: 'above' | 'below' | 'change_percent';
  targetPrice?: number;
  changePercent?: number;
  currentPrice: number;
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt?: Date;
  notificationMethod: 'browser' | 'email' | 'both';
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  isVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Watchlist {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  symbols: WatchlistItem[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  addedAt: Date;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  exchange?: string;
}

export interface TechnicalIndicator {
  name: string;
  value: number;
  signal: 'buy' | 'sell' | 'hold';
  period: number;
}

export interface MarketStatus {
  isOpen: boolean;
  nextOpen?: string;
  nextClose?: string;
  timezone: string;
  currentTime: string;
}

export interface NotificationSettings {
  browser: boolean;
  email: boolean;
  sound: boolean;
  priceAlerts: boolean;
  portfolioUpdates: boolean;
  marketNews: boolean;
}

export type TimeFrame = '1min' | '5min' | '15min' | '1hour' | '1day' | '1week' | '1month';

export type AssetType = 'stock' | 'crypto';

export type AlertType = 'above' | 'below' | 'change_percent';

export type NotificationMethod = 'browser' | 'email' | 'both';

export interface SocketEvents {
  // Client to Server
  subscribe: { symbols: string[] };
  unsubscribe: { symbols: string[] };
  authenticate: { token: string };
  joinPortfolio: { portfolioId: string };
  leavePortfolio: { portfolioId: string };
  getCandlestickData: {
    symbol: string;
    timeframe: TimeFrame;
    limit?: number;
  };
  searchSymbols: { query: string };
  ping: void;

  // Server to Client
  connected: { clientId: string; serverTime: string };
  authenticated: { success: boolean; error?: string };
  subscribed: { symbols: string[] };
  unsubscribed: { symbols: string[] };
  joinedPortfolio: { portfolioId: string };
  leftPortfolio: { portfolioId: string };
  priceUpdate: MarketData;
  candlestickData: {
    symbol: string;
    timeframe: string;
    data: CandlestickData | null;
  };
  searchResults: { query: string; results: SearchResult[] };
  portfolioUpdate: Portfolio;
  priceAlert: PriceAlert;
  technicalIndicators: { symbol: string; indicators: TechnicalIndicator[] };
  systemMessage: { message: string; type: 'info' | 'warning' | 'error'; timestamp: string };
  marketData: MarketData;
  pong: { timestamp: number };
  error: {
    type: string;
    message: string;
    error?: string;
  };
}