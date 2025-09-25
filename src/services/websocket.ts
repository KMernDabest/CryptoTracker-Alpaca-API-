import { io, Socket } from 'socket.io-client';
import { MarketData, SearchResult, TimeFrame } from '../types';

export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private subscriptions: Set<string> = new Set();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    console.log('🔌 WebSocketService constructor called');
    console.log('🌍 Environment variables:');
    console.log('  - REACT_APP_WEBSOCKET_URL:', process.env.REACT_APP_WEBSOCKET_URL);
    console.log('  - Default URL: http://localhost:5001');
    this.connect();
  }

  private connect(): void {
    try {
      const websocketUrl = process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:5001';
      console.log('🔌 Attempting WebSocket connection to:', websocketUrl);
      
      this.socket = io(websocketUrl, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
        forceNew: true,
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server at:', process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:5001');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Authenticate if token is available
      const token = localStorage.getItem('token');
      if (token) {
        console.log('🔐 Authenticating with token...');
        this.authenticate(token);
      }

      // Resubscribe to previous subscriptions
      if (this.subscriptions.size > 0) {
        console.log(`🔄 Resubscribing to ${this.subscriptions.size} symbols...`);
        this.socket?.emit('subscribe', { symbols: Array.from(this.subscriptions) });
      }

      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from WebSocket server. Reason:', reason);
      this.isConnected = false;
      this.emit('disconnected', reason);

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.isConnected = false;
      this.scheduleReconnect();
    });

    this.socket.on('authenticated', (data) => {
      this.emit('authenticated', data);
    });

    this.socket.on('priceUpdate', (data: MarketData) => {
      console.log(`💹 Frontend received price update for ${data.symbol}: $${data.price}`);
      this.emit('priceUpdate', data);
    });

    this.socket.on('candlestickData', (data) => {
      this.emit('candlestickData', data);
    });

    this.socket.on('searchResults', (data: { query: string; results: SearchResult[] }) => {
      this.emit('searchResults', data);
    });

    this.socket.on('portfolioUpdate', (data) => {
      this.emit('portfolioUpdate', data);
    });

    this.socket.on('priceAlert', (data) => {
      this.emit('priceAlert', data);
      
      // Show browser notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Price Alert: ${data.symbol}`, {
          body: `${data.symbol} has ${data.alertType} your target of $${data.targetPrice}`,
          icon: '/logo192.png',
          tag: `alert-${data._id}`,
        });
      }
    });

    this.socket.on('technicalIndicators', (data) => {
      this.emit('technicalIndicators', data);
    });

    this.socket.on('systemMessage', (data) => {
      this.emit('systemMessage', data);
    });

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.emit('error', error);
    });

    this.socket.on('pong', (data) => {
      this.emit('pong', data);
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Maximum reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.connect();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts)); // Exponential backoff
  }

  authenticate(token: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('authenticate', { token });
    }
  }

  subscribe(symbols: string[]): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe', { symbols });
      symbols.forEach(symbol => this.subscriptions.add(symbol));
    } else {
      // Queue subscriptions for when connected
      symbols.forEach(symbol => this.subscriptions.add(symbol));
    }
  }

  unsubscribe(symbols: string[]): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe', { symbols });
      symbols.forEach(symbol => this.subscriptions.delete(symbol));
    } else {
      symbols.forEach(symbol => this.subscriptions.delete(symbol));
    }
  }

  joinPortfolio(portfolioId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('joinPortfolio', { portfolioId });
    }
  }

  leavePortfolio(portfolioId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('leavePortfolio', { portfolioId });
    }
  }

  getCandlestickData(symbol: string, timeframe: TimeFrame, limit?: number): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('getCandlestickData', { symbol, timeframe, limit });
    }
  }

  searchSymbols(query: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('searchSymbols', { query });
    }
  }

  ping(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('ping');
    }
  }

  // Event listener management
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!callback) {
      this.eventListeners.delete(event);
      return;
    }

    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Connection utilities
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.subscriptions.clear();
    this.eventListeners.clear();
  }

  // Health check
  startHealthCheck(): void {
    setInterval(() => {
      if (this.isConnected) {
        this.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  getConnectionStatus(): {
    connected: boolean;
    subscriptions: string[];
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      subscriptions: Array.from(this.subscriptions),
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Singleton instance
export const websocketService = new WebSocketService();