import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST before any other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import { MarketDataService } from './services/MarketDataService';
import { WebSocketService } from './services/WebSocketService';
import { CacheService } from './services/CacheService';
import { authRouter } from './routes/auth';
import { portfolioRouter } from './routes/portfolio';
import { alertsRouter } from './routes/alerts';
import { marketDataRouter } from './routes/marketData';
import { errorHandler } from './middleware/errorHandler';
import { auth } from './middleware/auth';

console.log('Environment loaded - Alpaca Key:', process.env.ALPACA_API_KEY ? 'Found ✅' : 'Not Found ❌');
console.log('Environment loaded - Alpaca Secret:', process.env.ALPACA_SECRET_KEY ? 'Found ✅' : 'Not Found ❌');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

const rateLimitMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    await rateLimiter.consume(req.ip || req.socket.remoteAddress || 'unknown');
    next();
  } catch (rejRes) {
    res.status(429).send('Too Many Requests');
  }
};

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimitMiddleware);

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stocktracker');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn('Database connection failed, continuing without database:', error instanceof Error ? error.message : String(error));
    // Don't exit the process, continue without database
  }
};

// Routes
app.use('/api/auth', authRouter);
app.use('/api/portfolio', auth, portfolioRouter);
app.use('/api/alerts', auth, alertsRouter);
app.use('/api/market', marketDataRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Initialize services
const cacheService = new CacheService();
const marketDataService = new MarketDataService(cacheService);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const webSocketService = new WebSocketService(io, marketDataService, cacheService);

// WebSocketService initializes itself in the constructor

// Start server
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    // Start HTTP server first
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Try optional connections in background
    connectDB().catch((err: any) => console.warn('MongoDB connection failed:', err.message));
    cacheService.connect().catch((err: any) => console.warn('Cache connection failed:', err.message));

    // Start market data streaming
    try {
      await marketDataService.startStreaming();
      console.log('✅ Market data streaming started');
      
      // Subscribe to popular symbols for real-time data
      const popularSymbols = [
        'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'AMD',
        'BTC/USD', 'ETH/USD', 'SOL/USD', 'ADA/USD', 'MATIC/USD'
      ];
      
      popularSymbols.forEach(symbol => {
        marketDataService.subscribeToSymbol(symbol);
      });
      
      console.log(`📊 Subscribed to ${popularSymbols.length} popular symbols for real-time data`);
    } catch (error) {
      console.error('❌ Market data streaming failed:', error);
      throw error; // Exit since we only want real data
    }
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await marketDataService.stopStreaming();
  await cacheService.disconnect();
  await mongoose.connection.close();
  httpServer.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await marketDataService.stopStreaming();
  await cacheService.disconnect();
  await mongoose.connection.close();
  httpServer.close(() => {
    process.exit(0);
  });
});

startServer();

export { app, httpServer, io };