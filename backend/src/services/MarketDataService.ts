import axios from 'axios';
import WebSocket from 'ws';
import { CacheService } from './CacheService';

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

export class MarketDataService {
  private alpacaApiKey: string;
  private alpacaSecret: string;
  private alpacaBaseUrl: string;
  private alpacaDataBaseUrl: string;
  private cryptoWs?: WebSocket;
  private stockWs?: WebSocket;
  private cacheService: CacheService;
  private subscribedSymbols: Set<string> = new Set();
  private priceUpdateCallbacks: ((data: MarketData) => void)[] = [];

  constructor(cacheService: CacheService) {
    this.alpacaApiKey = process.env.ALPACA_API_KEY || '';
    this.alpacaSecret = process.env.ALPACA_SECRET_KEY || '';
  this.alpacaBaseUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';
  this.alpacaDataBaseUrl = process.env.ALPACA_DATA_URL || 'https://data.alpaca.markets';
    this.cacheService = cacheService;

    if (!this.alpacaApiKey || !this.alpacaSecret) {
      throw new Error('Alpaca API credentials are required. Mock data has been removed.');
    }
    console.log('✅ Alpaca API credentials loaded successfully. Using real-time data only.');
  }

  async startStreaming(): Promise<void> {
    try {
      await this.initializeAlpacaStreaming();
      console.log('✅ Real-time Alpaca market data streaming started');
      
      // Also start periodic REST API polling as backup for real-time data
      this.startPeriodicDataFetch();
    } catch (error) {
      console.error('❌ Failed to start Alpaca market data streaming:', error);
      throw error;
    }
  }

  async stopStreaming(): Promise<void> {
    if (this.stockWs) {
      this.stockWs.close();
    }
    if (this.cryptoWs) {
      this.cryptoWs.close();
    }
    console.log('Market data streaming stopped');
  }

  private startPeriodicDataFetch(): void {
    console.log('🔄 Starting periodic data fetch for real-time updates...');
    
    const symbols = [
      'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'AMD', 'SPY',
      'BTC/USD', 'ETH/USD'
    ];
    
    // Fetch data every 30 seconds
    setInterval(async () => {
      for (const symbol of symbols) {
        try {
          const data = await this.fetchAlpacaData(symbol);
          if (data) {
            await this.processMarketData(data);
          }
        } catch (error) {
          console.error(`❌ Failed to fetch data for ${symbol}:`, error);
        }
      }
    }, 30000); // 30 seconds
    
    // Initial fetch
    symbols.forEach(async (symbol) => {
      try {
        const data = await this.fetchAlpacaData(symbol);
        if (data) {
          await this.processMarketData(data);
        }
      } catch (error) {
        console.error(`❌ Failed to fetch initial data for ${symbol}:`, error);
      }
    });
  }

  private async initializeAlpacaStreaming(): Promise<void> {
    // Initialize stock data WebSocket
    const stockWsUrl = 'wss://stream.data.alpaca.markets/v2/iex';
    this.stockWs = new WebSocket(stockWsUrl);

    this.stockWs.on('open', () => {
      console.log('Connected to Alpaca stock data stream');
      // Authenticate
      this.stockWs?.send(JSON.stringify({
        action: 'auth',
        key: this.alpacaApiKey,
        secret: this.alpacaSecret
      }));
    });

    this.stockWs.on('message', (data: Buffer) => {
      try {
        const messages = JSON.parse(data.toString());
        console.log('📈 Stock WebSocket message received:', JSON.stringify(messages));
        this.handleAlpacaStockMessage(messages);
      } catch (error) {
        console.error('❌ Error parsing stock WebSocket message:', error);
      }
    });

    this.stockWs.on('error', (error) => {
      console.error('Stock WebSocket error:', error);
    });

    // Initialize crypto data WebSocket
    const cryptoWsUrl = 'wss://stream.data.alpaca.markets/v1beta3/crypto/us';
    this.cryptoWs = new WebSocket(cryptoWsUrl);

    this.cryptoWs.on('open', () => {
      console.log('Connected to Alpaca crypto data stream');
      // Authenticate
      this.cryptoWs?.send(JSON.stringify({
        action: 'auth',
        key: this.alpacaApiKey,
        secret: this.alpacaSecret
      }));
    });

    this.cryptoWs.on('message', (data: Buffer) => {
      try {
        const messages = JSON.parse(data.toString());
        console.log('🪙 Crypto WebSocket message received:', JSON.stringify(messages));
        this.handleAlpacaCryptoMessage(messages);
      } catch (error) {
        console.error('❌ Error parsing crypto WebSocket message:', error);
      }
    });

    this.cryptoWs.on('error', (error) => {
      console.error('Crypto WebSocket error:', error);
    });
  }

  private handleAlpacaStockMessage(messages: any[]): void {
    messages.forEach((message) => {
      if (message.T === 'success' && message.msg === 'authenticated') {
        console.log('✅ Stock stream authenticated, subscribing to symbols...');
        // Subscribe to stock symbols
        this.stockWs?.send(JSON.stringify({
          action: 'subscribe',
          trades: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'AMD', 'SPY']
        }));
      } else if (message.T === 't') { // Trade message
        const marketData: MarketData = {
          symbol: message.S,
          price: message.p,
          change: 0, // Will be calculated
          changePercent: 0, // Will be calculated
          volume: message.s,
          high: 0, // Will be fetched separately
          low: 0, // Will be fetched separately
          open: 0, // Will be fetched separately
          previousClose: 0, // Will be fetched separately
          timestamp: new Date(message.t)
        };

        this.processMarketData(marketData);
      }
    });
  }

  private handleAlpacaCryptoMessage(messages: any[]): void {
    messages.forEach((message) => {
      if (message.T === 'success' && message.msg === 'authenticated') {
        console.log('✅ Crypto stream authenticated, subscribing to symbols...');
        // Subscribe to crypto symbols
        this.cryptoWs?.send(JSON.stringify({
          action: 'subscribe',
          trades: ['BTC/USD', 'ETH/USD']
        }));
      } else if (message.T === 't') { // Trade message
        const marketData: MarketData = {
          symbol: message.S,
          price: message.p,
          change: 0, // Will be calculated
          changePercent: 0, // Will be calculated
          volume: message.s,
          high: 0, // Will be fetched separately
          low: 0, // Will be fetched separately
          open: 0, // Will be fetched separately
          previousClose: 0, // Will be fetched separately
          timestamp: new Date(message.t)
        };

        this.processMarketData(marketData);
      }
    });
  }

  private async processMarketData(data: MarketData): Promise<void> {
    console.log(`💹 Processing market data for ${data.symbol}: $${data.price}`);
    
    // Cache the data
    await this.cacheService.setMarketData(data.symbol, data);

    // Notify all subscribers
    this.priceUpdateCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('❌ Error in price update callback:', error);
      }
    });
  }

  async getMarketData(symbol: string): Promise<MarketData | null> {
    // Try cache first
    const cachedData = await this.cacheService.getMarketData(symbol);
    if (cachedData) {
      return cachedData;
    }

    // Fetch from Alpaca API
    try {
      return await this.fetchAlpacaData(symbol);
    } catch (error) {
      console.error(`❌ Error fetching Alpaca data for ${symbol}:`, error);
      return null;
    }
  }

  private async fetchAlpacaData(symbol: string): Promise<MarketData | null> {
    try {
      let response;
      const isCrypto = symbol.includes('/');
      
      if (isCrypto) {
        // Use crypto endpoint for crypto symbols
        response = await axios.get(
          `${this.alpacaDataBaseUrl}/v1beta3/crypto/us/latest/trades`,
          {
            params: { symbols: symbol },
            headers: {
              'APCA-API-KEY-ID': this.alpacaApiKey,
              'APCA-API-SECRET-KEY': this.alpacaSecret
            }
          }
        );
        
        const tradeData = response.data.trades[symbol];
        if (!tradeData) return null;
        
        return {
          symbol,
          price: tradeData.p || 0,
          change: 0, // Would need historical data to calculate
          changePercent: 0, // Would need historical data to calculate
          volume: tradeData.s || 0,
          high: 0, // Would need daily bar data
          low: 0, // Would need daily bar data
          open: 0, // Would need daily bar data
          previousClose: 0, // Would need daily bar data
          timestamp: new Date(tradeData.t || Date.now())
        };
      } else {
        // Use stock endpoint for regular stocks
        response = await axios.get(
          `${this.alpacaDataBaseUrl}/v2/stocks/${symbol}/snapshot`,
          {
            headers: {
              'APCA-API-KEY-ID': this.alpacaApiKey,
              'APCA-API-SECRET-KEY': this.alpacaSecret
            }
          }
        );

        const data = response.data;
        const quote = data.latestQuote;
        const trade = data.latestTrade;
        const dailyBar = data.dailyBar;

        return {
          symbol,
          price: trade?.p || quote?.ap || 0,
          change: dailyBar ? (trade?.p || quote?.ap || 0) - dailyBar.c : 0,
          changePercent: dailyBar ? (((trade?.p || quote?.ap || 0) - dailyBar.c) / dailyBar.c) * 100 : 0,
          volume: dailyBar?.v || 0,
          high: dailyBar?.h || 0,
          low: dailyBar?.l || 0,
          open: dailyBar?.o || 0,
          previousClose: dailyBar?.c || 0,
          timestamp: new Date()
        };
      }
    } catch (error) {
      console.error(`❌ Error fetching Alpaca data for ${symbol}:`, error);
      return null;
    }
  }

  async getCandlestickData(
    symbol: string,
    timeframe: '1min' | '5min' | '15min' | '1hour' | '1day',
    limit: number = 100
  ): Promise<CandlestickData | null> {
    try {
      return await this.fetchAlpacaCandlestickData(symbol, timeframe, limit);
    } catch (error) {
      console.error(`❌ Error fetching candlestick data for ${symbol}:`, error);
      return null;
    }
  }

  private async fetchAlpacaCandlestickData(
    symbol: string,
    timeframe: string,
    limit: number
  ): Promise<CandlestickData | null> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (limit * this.getTimeframeMs(timeframe)));

      const response = await axios.get(
        `${this.alpacaDataBaseUrl}/v2/stocks/${symbol}/bars`,
        {
          params: {
            timeframe,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            limit
          },
          headers: {
            'APCA-API-KEY-ID': this.alpacaApiKey,
            'APCA-API-SECRET-KEY': this.alpacaSecret
          }
        }
      );

      const bars = response.data.bars || [];
      const data = bars.map((bar: any) => ({
        time: new Date(bar.t).getTime(),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v
      }));

      return { symbol, timeframe, data };
    } catch (error) {
      console.error(`Error fetching Alpaca candlestick data for ${symbol}:`, error);
      return null;
    }
  }

  private getTimeframeMs(timeframe: string): number {
    switch (timeframe) {
      case '1min': return 60 * 1000;
      case '5min': return 5 * 60 * 1000;
      case '15min': return 15 * 60 * 1000;
      case '1hour': return 60 * 60 * 1000;
      case '1day': return 24 * 60 * 60 * 1000;
      default: return 60 * 1000;
    }
  }

  subscribeToSymbol(symbol: string): void {
    if (!this.subscribedSymbols.has(symbol)) {
      this.subscribedSymbols.add(symbol);
      
      if (this.stockWs && this.stockWs.readyState === WebSocket.OPEN) {
        this.stockWs.send(JSON.stringify({
          action: 'subscribe',
          trades: [symbol]
        }));
      }

      if (this.cryptoWs && this.cryptoWs.readyState === WebSocket.OPEN) {
        this.cryptoWs.send(JSON.stringify({
          action: 'subscribe',
          trades: [symbol]
        }));
      }
    }
  }

  unsubscribeFromSymbol(symbol: string): void {
    if (this.subscribedSymbols.has(symbol)) {
      this.subscribedSymbols.delete(symbol);
      
      if (this.stockWs && this.stockWs.readyState === WebSocket.OPEN) {
        this.stockWs.send(JSON.stringify({
          action: 'unsubscribe',
          trades: [symbol]
        }));
      }

      if (this.cryptoWs && this.cryptoWs.readyState === WebSocket.OPEN) {
        this.cryptoWs.send(JSON.stringify({
          action: 'unsubscribe',
          trades: [symbol]
        }));
      }
    }
  }

  onPriceUpdate(callback: (data: MarketData) => void): void {
    this.priceUpdateCallbacks.push(callback);
  }

  async searchSymbols(query: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.alpacaBaseUrl}/v2/assets`,
        {
          params: {
            search: query,
            status: 'active',
            asset_class: 'us_equity'
          },
          headers: {
            'APCA-API-KEY-ID': this.alpacaApiKey,
            'APCA-API-SECRET-KEY': this.alpacaSecret
          }
        }
      );

      return response.data.map((asset: any) => ({
        symbol: asset.symbol,
        name: asset.name,
        type: 'stock',
        exchange: asset.exchange
      }));
    } catch (error) {
      console.error('Error searching symbols:', error);
      return [];
    }
  }
}