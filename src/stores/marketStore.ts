import { create } from 'zustand';
import { MarketData, SearchResult, MarketStatus } from '../types';

interface MarketState {
  marketData: Map<string, MarketData>;
  searchResults: SearchResult[];
  marketStatus: MarketStatus | null;
  subscribedSymbols: Set<string>;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  setMarketData: (symbol: string, data: MarketData) => void;
  updateMultipleMarketData: (dataMap: Map<string, MarketData>) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setMarketStatus: (status: MarketStatus) => void;
  addSubscription: (symbol: string) => void;
  removeSubscription: (symbol: string) => void;
  clearSubscriptions: () => void;
  setLoading: (loading: boolean) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Getters
  getMarketData: (symbol: string) => MarketData | null;
  getAllMarketData: () => MarketData[];
  getSubscribedSymbols: () => string[];
  isSymbolSubscribed: (symbol: string) => boolean;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  marketData: new Map(),
  searchResults: [],
  marketStatus: null,
  subscribedSymbols: new Set(),
  isLoading: false,
  isConnected: false,
  error: null,
  lastUpdated: null,

  setMarketData: (symbol: string, data: MarketData) =>
    set((state) => {
      // Ultra-fast in-place update for maximum performance
      state.marketData.set(symbol, data);
      return {
        marketData: state.marketData,
        lastUpdated: new Date(),
        error: null
      };
    }),

  updateMultipleMarketData: (dataMap: Map<string, MarketData>) =>
    set((state) => {
      // Ultra-fast batch update with in-place modifications
      dataMap.forEach((data, symbol) => {
        state.marketData.set(symbol, data);
      });
      return {
        marketData: state.marketData,
        lastUpdated: new Date(),
        error: null
      };
    }),

  setSearchResults: (results: SearchResult[]) =>
    set({ searchResults: results, error: null }),

  setMarketStatus: (status: MarketStatus) =>
    set({ marketStatus: status, error: null }),

  addSubscription: (symbol: string) =>
    set((state) => {
      const newSubscriptions = new Set(state.subscribedSymbols);
      newSubscriptions.add(symbol);
      return { subscribedSymbols: newSubscriptions };
    }),

  removeSubscription: (symbol: string) =>
    set((state) => {
      const newSubscriptions = new Set(state.subscribedSymbols);
      newSubscriptions.delete(symbol);
      return { subscribedSymbols: newSubscriptions };
    }),

  clearSubscriptions: () =>
    set({ subscribedSymbols: new Set() }),

  setLoading: (loading: boolean) =>
    set({ isLoading: loading }),

  setConnected: (connected: boolean) =>
    set({ isConnected: connected }),

  setError: (error: string | null) =>
    set({ error }),

  clearError: () =>
    set({ error: null }),

  // Getters
  getMarketData: (symbol: string) =>
    get().marketData.get(symbol) || null,

  getAllMarketData: () =>
    Array.from(get().marketData.values()),

  getSubscribedSymbols: () =>
    Array.from(get().subscribedSymbols),

  isSymbolSubscribed: (symbol: string) =>
    get().subscribedSymbols.has(symbol),
}));