import { Server as SocketServer } from 'socket.io';
import { MarketDataService, MarketData } from './MarketDataService';
import { CacheService } from './CacheService';

export interface SocketClient {
  id: string;
  userId?: string;
  subscribedSymbols: Set<string>;
  rooms: Set<string>;
}

export class WebSocketService {
  private io: SocketServer;
  private marketDataService: MarketDataService;
  private cacheService: CacheService;
  private clients: Map<string, SocketClient> = new Map();
  private symbolSubscriptions: Map<string, Set<string>> = new Map(); // symbol -> set of client IDs

  constructor(
    io: SocketServer, 
    marketDataService: MarketDataService, 
    cacheService: CacheService
  ) {
    console.log('🚀 WebSocketService constructor started');
    this.io = io;
    this.marketDataService = marketDataService;
    this.cacheService = cacheService;
    
    console.log('📡 Setting up socket handlers...');
    this.setupSocketHandlers();
    console.log('📈 Setting up market data handlers...');
    this.setupMarketDataHandlers();
    console.log('✅ WebSocketService initialization complete');
  }

  private setupSocketHandlers(): void {
    console.log('🎯 Setting up socket handlers...');
    console.log('🌐 Server is ready to accept WebSocket connections on port:', process.env.PORT || 5001);
    
    this.io.on('connection', (socket) => {
      console.log(`🔗 NEW CLIENT CONNECTED: ${socket.id} from ${socket.handshake.address}`);
      console.log(`📊 Total connected clients: ${this.clients.size + 1}`);
      
      // Initialize client
      const client: SocketClient = {
        id: socket.id,
        subscribedSymbols: new Set(),
        rooms: new Set()
      };
      this.clients.set(socket.id, client);

      // Handle authentication
      socket.on('authenticate', async (data: { token: string }) => {
        try {
          // TODO: Verify JWT token and get user ID
          // For now, we'll use a mock user ID
          client.userId = 'mock-user-id';
          socket.emit('authenticated', { success: true });
        } catch (error) {
          socket.emit('authenticated', { success: false, error: 'Invalid token' });
        }
      });

      // Handle symbol subscription
      socket.on('subscribe', (data: { symbols: string[] }) => {
        const { symbols } = data;
        
        symbols.forEach(symbol => {
          this.subscribeClientToSymbol(socket.id, symbol);
        });
        
        socket.emit('subscribed', { symbols });
      });

      // Handle symbol unsubscription
      socket.on('unsubscribe', (data: { symbols: string[] }) => {
        const { symbols } = data;
        
        symbols.forEach(symbol => {
          this.unsubscribeClientFromSymbol(socket.id, symbol);
        });
        
        socket.emit('unsubscribed', { symbols });
      });

      // Handle portfolio room joining
      socket.on('joinPortfolio', (data: { portfolioId: string }) => {
        const room = `portfolio:${data.portfolioId}`;
        socket.join(room);
        client.rooms.add(room);
        socket.emit('joinedPortfolio', { portfolioId: data.portfolioId });
      });

      // Handle portfolio room leaving
      socket.on('leavePortfolio', (data: { portfolioId: string }) => {
        const room = `portfolio:${data.portfolioId}`;
        socket.leave(room);
        client.rooms.delete(room);
        socket.emit('leftPortfolio', { portfolioId: data.portfolioId });
      });

      // Handle candlestick data request
      socket.on('getCandlestickData', async (data: {
        symbol: string;
        timeframe: '1min' | '5min' | '15min' | '1hour' | '1day';
        limit?: number;
      }) => {
        try {
          const candlestickData = await this.marketDataService.getCandlestickData(
            data.symbol,
            data.timeframe,
            data.limit
          );
          
          socket.emit('candlestickData', {
            symbol: data.symbol,
            timeframe: data.timeframe,
            data: candlestickData
          });
        } catch (error) {
          socket.emit('error', {
            type: 'candlestick_error',
            message: `Failed to fetch candlestick data for ${data.symbol}`,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Handle search requests
      socket.on('searchSymbols', async (data: { query: string }) => {
        try {
          const results = await this.marketDataService.searchSymbols(data.query);
          socket.emit('searchResults', { query: data.query, results });
        } catch (error) {
          socket.emit('error', {
            type: 'search_error',
            message: 'Failed to search symbols',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Handle ping for connection health check
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`🔥 CLIENT DISCONNECTED: ${socket.id} - Reason: ${reason}`);
        console.log(`📊 Client had ${client.subscribedSymbols.size} subscriptions:`, Array.from(client.subscribedSymbols));
        console.log(`📈 Remaining clients after disconnect: ${this.clients.size - 1}`);
        this.handleClientDisconnection(socket.id);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });

      // Send initial connection success
      socket.emit('connected', { 
        clientId: socket.id, 
        serverTime: new Date().toISOString() 
      });
      
      console.log(`✓ Client ${socket.id} connection setup complete`);
      
      // Auto-subscribe to popular symbols for demo
      const popularSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'BTC/USD', 'ETH/USD'];
      popularSymbols.forEach(symbol => {
        this.subscribeClientToSymbol(socket.id, symbol);
      });
      
      socket.emit('subscribed', { symbols: popularSymbols });
      console.log(`🎆 Auto-subscribed client ${socket.id} to popular symbols`);
    });
  }

  private setupMarketDataHandlers(): void {
    // Listen for price updates from MarketDataService
    console.log('🔌 Setting up market data handlers...');
    this.marketDataService.onPriceUpdate((data: MarketData) => {
      console.log(`💰 Received price update for ${data.symbol}: $${data.price}`);
      this.broadcastPriceUpdate(data);
    });
  }

  private subscribeClientToSymbol(clientId: string, symbol: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Add to client's subscriptions
    client.subscribedSymbols.add(symbol);

    // Add to symbol's subscriber list
    if (!this.symbolSubscriptions.has(symbol)) {
      this.symbolSubscriptions.set(symbol, new Set());
      // Subscribe to market data for this symbol
      this.marketDataService.subscribeToSymbol(symbol);
    }
    this.symbolSubscriptions.get(symbol)!.add(clientId);

    console.log(`Client ${clientId} subscribed to ${symbol}`);
  }

  private unsubscribeClientFromSymbol(clientId: string, symbol: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from client's subscriptions
    client.subscribedSymbols.delete(symbol);

    // Remove from symbol's subscriber list
    const subscribers = this.symbolSubscriptions.get(symbol);
    if (subscribers) {
      subscribers.delete(clientId);
      
      // If no more subscribers for this symbol, unsubscribe from market data
      if (subscribers.size === 0) {
        this.symbolSubscriptions.delete(symbol);
        this.marketDataService.unsubscribeFromSymbol(symbol);
      }
    }

    console.log(`Client ${clientId} unsubscribed from ${symbol}`);
  }

  private handleClientDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Unsubscribe from all symbols
    client.subscribedSymbols.forEach(symbol => {
      this.unsubscribeClientFromSymbol(clientId, symbol);
    });

    // Remove client
    this.clients.delete(clientId);
  }

  private broadcastPriceUpdate(data: MarketData): void {
    const subscribers = this.symbolSubscriptions.get(data.symbol);
    console.log(`📶 Broadcasting ${data.symbol} price update: $${data.price} to ${subscribers?.size || 0} clients`);
    
    if (!subscribers || subscribers.size === 0) {
      console.log(`⚠️ No subscribers for ${data.symbol}`);
      return;
    }

    // Send to all subscribers of this symbol
    subscribers.forEach(clientId => {
      const socket = this.io.sockets.sockets.get(clientId);
      if (socket) {
        socket.emit('priceUpdate', data);
        console.log(`✓ Sent ${data.symbol} update to client ${clientId}`);
      }
    });
  }

  // Public methods for other services to use

  broadcastPortfolioUpdate(portfolioId: string, portfolioData: any): void {
    this.io.to(`portfolio:${portfolioId}`).emit('portfolioUpdate', portfolioData);
  }

  sendPriceAlert(userId: string, alert: any): void {
    // Find all sockets for this user and send alert
    this.clients.forEach((client, clientId) => {
      if (client.userId === userId) {
        const socket = this.io.sockets.sockets.get(clientId);
        if (socket) {
          socket.emit('priceAlert', alert);
        }
      }
    });
  }

  broadcastSystemMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.io.emit('systemMessage', { message, type, timestamp: new Date().toISOString() });
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  getSubscriptionStats(): { [symbol: string]: number } {
    const stats: { [symbol: string]: number } = {};
    this.symbolSubscriptions.forEach((subscribers, symbol) => {
      stats[symbol] = subscribers.size;
    });
    return stats;
  }

  // Send market data to specific client
  async sendMarketDataToClient(clientId: string, symbol: string): Promise<void> {
    const socket = this.io.sockets.sockets.get(clientId);
    if (!socket) return;

    try {
      const marketData = await this.marketDataService.getMarketData(symbol);
      if (marketData) {
        socket.emit('marketData', marketData);
      }
    } catch (error) {
      socket.emit('error', {
        type: 'market_data_error',
        message: `Failed to fetch market data for ${symbol}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Broadcast technical indicators
  broadcastTechnicalIndicators(symbol: string, indicators: any): void {
    const subscribers = this.symbolSubscriptions.get(symbol);
    if (!subscribers || subscribers.size === 0) return;

    subscribers.forEach(clientId => {
      const socket = this.io.sockets.sockets.get(clientId);
      if (socket) {
        socket.emit('technicalIndicators', { symbol, indicators });
      }
    });
  }
}