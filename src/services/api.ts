import axios, { AxiosInstance } from 'axios';
import { 
  MarketData, 
  CandlestickData, 
  Portfolio, 
  PriceAlert, 
  User, 
  Watchlist,
  SearchResult,
  TimeFrame 
} from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication endpoints
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<{ token: string; user: User }> {
    const response = await this.api.post('/auth/register', userData);
    return response.data;
  }

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<{ token: string; user: User }> {
    const response = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async getCurrentUser(): Promise<{ user: User }> {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  async updateProfile(profileData: {
    firstName: string;
    lastName: string;
  }): Promise<{ user: User }> {
    const response = await this.api.put('/auth/profile', profileData);
    return response.data;
  }

  async changePassword(passwordData: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    await this.api.put('/auth/change-password', passwordData);
  }

  // Market data endpoints
  async getQuote(symbol: string): Promise<{ data: MarketData }> {
    const response = await this.api.get(`/market/quote/${symbol}`);
    return response.data;
  }

  async getMultipleQuotes(symbols: string[]): Promise<{ quotes: Array<{ symbol: string; data: MarketData }> }> {
    const response = await this.api.post('/market/quotes', { symbols });
    return response.data;
  }

  async getCandlestickData(
    symbol: string,
    timeframe: TimeFrame,
    limit?: number
  ): Promise<{ data: CandlestickData }> {
    const response = await this.api.get(`/market/chart/${symbol}`, {
      params: { timeframe, limit }
    });
    return response.data;
  }

  async searchSymbols(query: string): Promise<{ results: SearchResult[] }> {
    const response = await this.api.get('/market/search', {
      params: { q: query }
    });
    return response.data;
  }

  async getMarketSummary(): Promise<{
    marketSummary: Array<{ symbol: string; data: MarketData }>;
    indices: Array<{ symbol: string; name: string; price: number; change: number; changePercent: number }>;
    lastUpdated: string;
  }> {
    const response = await this.api.get('/market/summary');
    return response.data;
  }

  async getMarketStatus(): Promise<{
    isOpen: boolean;
    nextOpen?: string;
    nextClose?: string;
    timezone: string;
    currentTime: string;
  }> {
    const response = await this.api.get('/market/status');
    return response.data;
  }

  // Portfolio endpoints
  async getPortfolios(): Promise<{ portfolios: Portfolio[] }> {
    const response = await this.api.get('/portfolio');
    return response.data;
  }

  async getPortfolio(id: string): Promise<{ portfolio: Portfolio }> {
    const response = await this.api.get(`/portfolio/${id}`);
    return response.data;
  }

  async createPortfolio(portfolioData: {
    name: string;
    description?: string;
  }): Promise<{ portfolio: Portfolio }> {
    const response = await this.api.post('/portfolio', portfolioData);
    return response.data;
  }

  async updatePortfolio(
    id: string,
    portfolioData: { name: string; description?: string }
  ): Promise<{ portfolio: Portfolio }> {
    const response = await this.api.put(`/portfolio/${id}`, portfolioData);
    return response.data;
  }

  async deletePortfolio(id: string): Promise<void> {
    await this.api.delete(`/portfolio/${id}`);
  }

  async addAssetToPortfolio(
    portfolioId: string,
    assetData: {
      symbol: string;
      name: string;
      type: 'stock' | 'crypto';
      quantity: number;
      avgCostBasis: number;
    }
  ): Promise<{ portfolio: Portfolio }> {
    const response = await this.api.post(`/portfolio/${portfolioId}/assets`, assetData);
    return response.data;
  }

  async updatePortfolioAsset(
    portfolioId: string,
    symbol: string,
    assetData: {
      quantity?: number;
      avgCostBasis?: number;
    }
  ): Promise<{ portfolio: Portfolio }> {
    const response = await this.api.put(`/portfolio/${portfolioId}/assets/${symbol}`, assetData);
    return response.data;
  }

  async removeAssetFromPortfolio(portfolioId: string, symbol: string): Promise<void> {
    await this.api.delete(`/portfolio/${portfolioId}/assets/${symbol}`);
  }

  async getPortfolioPerformance(portfolioId: string): Promise<{
    performance: {
      totalValue: number;
      totalCost: number;
      totalPnL: number;
      totalPnLPercent: number;
      assetCount: number;
      assetAllocation: Array<{
        symbol: string;
        name: string;
        value: number;
        percentage: number;
      }>;
      topPerformers: Array<{
        symbol: string;
        unrealizedPnLPercent: number;
      }>;
      lastUpdated: string;
    };
  }> {
    const response = await this.api.get(`/portfolio/${portfolioId}/performance`);
    return response.data;
  }

  // Price alerts endpoints (placeholder - would need to create these routes)
  async getPriceAlerts(): Promise<{ alerts: PriceAlert[] }> {
    const response = await this.api.get('/alerts');
    return response.data;
  }

  async createPriceAlert(alertData: {
    symbol: string;
    name: string;
    type: 'stock' | 'crypto';
    alertType: 'above' | 'below' | 'change_percent';
    targetPrice?: number;
    changePercent?: number;
    notificationMethod?: 'browser' | 'email' | 'both';
    message?: string;
  }): Promise<{ alert: PriceAlert }> {
    const response = await this.api.post('/alerts', alertData);
    return response.data;
  }

  async updatePriceAlert(
    id: string,
    alertData: Partial<PriceAlert>
  ): Promise<{ alert: PriceAlert }> {
    const response = await this.api.put(`/alerts/${id}`, alertData);
    return response.data;
  }

  async deletePriceAlert(id: string): Promise<void> {
    await this.api.delete(`/alerts/${id}`);
  }

  // Watchlist endpoints (placeholder)
  async getWatchlists(): Promise<{ watchlists: Watchlist[] }> {
    const response = await this.api.get('/watchlists');
    return response.data;
  }

  async createWatchlist(watchlistData: {
    name: string;
    description?: string;
  }): Promise<{ watchlist: Watchlist }> {
    const response = await this.api.post('/watchlists', watchlistData);
    return response.data;
  }

  async addToWatchlist(
    watchlistId: string,
    symbolData: {
      symbol: string;
      name: string;
      type: 'stock' | 'crypto';
    }
  ): Promise<{ watchlist: Watchlist }> {
    const response = await this.api.post(`/watchlists/${watchlistId}/symbols`, symbolData);
    return response.data;
  }

  async removeFromWatchlist(watchlistId: string, symbol: string): Promise<void> {
    await this.api.delete(`/watchlists/${watchlistId}/symbols/${symbol}`);
  }

  // Utility methods
  setAuthToken(token: string): void {
    localStorage.setItem('token', token);
    this.api.defaults.headers.Authorization = `Bearer ${token}`;
  }

  clearAuthToken(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete this.api.defaults.headers.Authorization;
  }

  // Error handling helper
  private handleApiError(error: any): never {
    const message = error.response?.data?.message || error.message || 'An unknown error occurred';
    const status = error.response?.status;
    
    throw new Error(`API Error (${status}): ${message}`);
  }
}

export const apiService = new ApiService();