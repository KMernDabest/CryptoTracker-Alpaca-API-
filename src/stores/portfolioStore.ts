import { create } from 'zustand';
import { Portfolio, PortfolioAsset } from '../types';

interface PortfolioState {
  portfolios: Portfolio[];
  activePortfolio: Portfolio | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setPortfolios: (portfolios: Portfolio[]) => void;
  addPortfolio: (portfolio: Portfolio) => void;
  updatePortfolio: (id: string, updates: Partial<Portfolio>) => void;
  removePortfolio: (id: string) => void;
  setActivePortfolio: (portfolio: Portfolio | null) => void;
  updatePortfolioAsset: (portfolioId: string, symbol: string, assetData: Partial<PortfolioAsset>) => void;
  addAssetToPortfolio: (portfolioId: string, asset: PortfolioAsset) => void;
  removeAssetFromPortfolio: (portfolioId: string, symbol: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Getters
  getPortfolio: (id: string) => Portfolio | null;
  getTotalPortfolioValue: () => number;
  getTotalPortfolioPnL: () => number;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  portfolios: [],
  activePortfolio: null,
  isLoading: false,
  error: null,

  setPortfolios: (portfolios: Portfolio[]) =>
    set({ portfolios, error: null }),

  addPortfolio: (portfolio: Portfolio) =>
    set((state) => ({
      portfolios: [...state.portfolios, portfolio],
      error: null
    })),

  updatePortfolio: (id: string, updates: Partial<Portfolio>) =>
    set((state) => ({
      portfolios: state.portfolios.map(p => 
        p._id === id ? { ...p, ...updates } : p
      ),
      activePortfolio: state.activePortfolio?._id === id 
        ? { ...state.activePortfolio, ...updates }
        : state.activePortfolio,
      error: null
    })),

  removePortfolio: (id: string) =>
    set((state) => ({
      portfolios: state.portfolios.filter(p => p._id !== id),
      activePortfolio: state.activePortfolio?._id === id ? null : state.activePortfolio,
      error: null
    })),

  setActivePortfolio: (portfolio: Portfolio | null) =>
    set({ activePortfolio: portfolio }),

  updatePortfolioAsset: (portfolioId: string, symbol: string, assetData: Partial<PortfolioAsset>) =>
    set((state) => ({
      portfolios: state.portfolios.map(p => 
        p._id === portfolioId 
          ? {
              ...p,
              assets: p.assets.map(a => 
                a.symbol === symbol ? { ...a, ...assetData } : a
              )
            }
          : p
      ),
      activePortfolio: state.activePortfolio?._id === portfolioId
        ? {
            ...state.activePortfolio,
            assets: state.activePortfolio.assets.map(a => 
              a.symbol === symbol ? { ...a, ...assetData } : a
            )
          }
        : state.activePortfolio,
      error: null
    })),

  addAssetToPortfolio: (portfolioId: string, asset: PortfolioAsset) =>
    set((state) => ({
      portfolios: state.portfolios.map(p => 
        p._id === portfolioId 
          ? { ...p, assets: [...p.assets, asset] }
          : p
      ),
      activePortfolio: state.activePortfolio?._id === portfolioId
        ? { ...state.activePortfolio, assets: [...state.activePortfolio.assets, asset] }
        : state.activePortfolio,
      error: null
    })),

  removeAssetFromPortfolio: (portfolioId: string, symbol: string) =>
    set((state) => ({
      portfolios: state.portfolios.map(p => 
        p._id === portfolioId 
          ? { ...p, assets: p.assets.filter(a => a.symbol !== symbol) }
          : p
      ),
      activePortfolio: state.activePortfolio?._id === portfolioId
        ? { ...state.activePortfolio, assets: state.activePortfolio.assets.filter(a => a.symbol !== symbol) }
        : state.activePortfolio,
      error: null
    })),

  setLoading: (loading: boolean) =>
    set({ isLoading: loading }),

  setError: (error: string | null) =>
    set({ error }),

  clearError: () =>
    set({ error: null }),

  // Getters
  getPortfolio: (id: string) =>
    get().portfolios.find(p => p._id === id) || null,

  getTotalPortfolioValue: () =>
    get().portfolios.reduce((total, portfolio) => total + portfolio.totalValue, 0),

  getTotalPortfolioPnL: () =>
    get().portfolios.reduce((total, portfolio) => total + portfolio.totalPnL, 0),
}));