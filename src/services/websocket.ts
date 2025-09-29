import { io, Socket } from 'socket.io-client';
import { MarketData, SearchResult, TimeFrame } from '../types';

export class WebSocketService {
  private static instance: WebSocketService | null = null;
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private isConnecting = false;
  private subscriptions: Set<string> = new Set();
  private eventListeners: Map<string, Function[]> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Prevent multiple instances in React StrictMode
    if (WebSocketService.instance) {
      console.log('🔄 WebSocketService: Returning existing instance');
      return WebSocketService.instance;
    }
    
    console.log('🚀 WebSocketService: Creating new instance at:', new Date().toLocaleTimeString());
    WebSocketService.instance = this;
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public ensureConnection(): void {
    if (!this.socket || !this.isConnected) {
      console.log('🔌 WebSocketService: Ensuring connection...');
      this.connect();
    } else {
      console.log('✅ WebSocketService: Already connected');
    }
  }

  private connect(): void {
    if (this.isConnecting || this.isConnected) {
      console.log('⏳ WebSocketService: Connection already in progress or established');
      return;
    }

    this.isConnecting = true;
    
    try {
      const websocketUrl = process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:5001';
      console.log('🔌 Attempting WebSocket connection to:', websocketUrl);
      
      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      
      this.socket = io(websocketUrl, {
        transports: ['websocket'], // Use WebSocket only for optimal performance
        upgrade: false, // Disable upgrade for consistency
        rememberUpgrade: false,
        timeout: 5000, // Balanced 5s connection timeout
        forceNew: false, // Allow connection reuse
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10, // Reasonable attempts for reliability
        reconnectionDelay: 1000, // Balanced 1s reconnection delay
        randomizationFactor: 0.2, // Balanced jitter to avoid thundering herd
      });

      console.log('✅ Socket.IO instance created');
      this.setupEventHandlers();
      this.startHealthCheck();
    } catch (error) {
      console.error('💥 Failed to connect to WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) {
      console.error('❌ Cannot setup event handlers: socket is null');
      return;
    }

    console.log('🎯 Setting up WebSocket event handlers...');

    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server at:', process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:5001');
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      
      // Clear any pending reconnection timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
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
      this.isConnecting = false;
      this.emit('disconnected', reason);

      // Only reconnect for certain disconnect reasons
      if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'transport error') {
        console.log('🔄 Scheduling reconnection due to:', reason);
        this.scheduleReconnect();
      } else {
        console.log('⏹️ Not reconnecting due to:', reason);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.isConnected = false;
      this.isConnecting = false;
      this.scheduleReconnect();
    });

    this.socket.on('authenticated', (data) => {
      this.emit('authenticated', data);
    });

    this.socket.on('priceUpdate', (data: MarketData) => {
      // Ultra-fast processing with minimal logging for maximum performance
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
      console.error('❌ Max reconnection attempts reached. Giving up.');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts); // Exponential backoff
    console.log(`⏰ Scheduling reconnection attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.connect();
    }, delay);
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
      // Store subscriptions for when connection is established
      symbols.forEach(symbol => this.subscriptions.add(symbol));
      console.log('📝 Stored subscription for later:', symbols);
    }
  }

  unsubscribe(symbols: string[]): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe', { symbols });
    }
    symbols.forEach(symbol => this.subscriptions.delete(symbol));
  }

  searchSymbols(query: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('searchSymbols', { query });
    }
  }

  getCandlestickData(symbol: string, timeframe: TimeFrame): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('getCandlestickData', { symbol, timeframe });
    }
  }

  getPortfolioData(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('getPortfolioData');
    }
  }

  createPriceAlert(symbol: string, targetPrice: number, alertType: 'above' | 'below'): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('createPriceAlert', { symbol, targetPrice, alertType });
    }
  }

  ping(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('ping', { timestamp: Date.now() });
    }
  }

  // Event management
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!this.eventListeners.has(event)) return;
    
    if (callback) {
      const listeners = this.eventListeners.get(event)!;
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      this.eventListeners.delete(event);
    }
  }

  private emit(event: string, data?: any): void {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }

  disconnect(): void {
    console.log('🔌 Disconnecting WebSocket service...');
    
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.subscriptions.clear();
    this.eventListeners.clear();
  }

  // Health check
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(() => {
      if (this.isConnected && this.socket) {
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
export const websocketService = WebSocketService.getInstance();