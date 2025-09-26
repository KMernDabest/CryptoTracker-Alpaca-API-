import express from 'express';
import { MarketDataService } from '../services/MarketDataService';
import { CacheService } from '../services/CacheService';

const router = express.Router();
const cacheService = new CacheService();
const marketDataService = new MarketDataService(cacheService);

// Get market data for a symbol
router.get('/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const marketData = await marketDataService.getMarketData(symbol);
    
    if (!marketData) {
      return res.status(404).json({ message: 'Market data not found' });
    }

    res.json({ data: marketData });
  } catch (error) {
    console.error('Get market data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get candlestick data
router.get('/chart/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1day', limit = 100 } = req.query;
    
    const candlestickData = await marketDataService.getCandlestickData(
      symbol,
      timeframe as any,
      parseInt(limit as string)
    );

    if (!candlestickData) {
      return res.status(404).json({ message: 'Chart data not found' });
    }

    res.json({ data: candlestickData });
  } catch (error) {
    console.error('Get chart data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search symbols
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const results = await marketDataService.searchSymbols(q);
    res.json({ results });
  } catch (error) {
    console.error('Search symbols error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get multiple quotes
router.post('/quotes', async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!Array.isArray(symbols)) {
      return res.status(400).json({ message: 'Symbols array is required' });
    }

    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        const data = await marketDataService.getMarketData(symbol);
        return { symbol, data };
      })
    );

    res.json({ quotes: quotes.filter(q => q.data !== null) });
  } catch (error) {
    console.error('Get multiple quotes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get market summary
router.get('/summary', async (req, res) => {
  try {
    // Get real market data for popular symbols
    const popularSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'AMD'];
    const marketSummary = await Promise.all(
      popularSymbols.map(async (symbol) => {
        const data = await marketDataService.getMarketData(symbol);
        return { symbol, data };
      })
    );

    // Note: Major indices data would require additional API calls to Alpaca
    // For now, only return individual stock data
    res.json({
      marketSummary: marketSummary.filter(item => item.data !== null),
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get market summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get market status
router.get('/status', (req, res) => {
  try {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = easternTime.getHours();
    const day = easternTime.getDay();
    
    // Market is open 9:30 AM to 4:00 PM ET, Monday to Friday
    const isMarketOpen = (day >= 1 && day <= 5) && (hour >= 9.5 && hour < 16);
    
    const nextOpen = new Date();
    const nextClose = new Date();
    
    // Calculate next market open/close times (simplified)
    if (isMarketOpen) {
      nextClose.setHours(16, 0, 0, 0); // 4:00 PM ET
    } else {
      if (day === 0) { // Sunday
        nextOpen.setDate(nextOpen.getDate() + 1); // Monday
      } else if (day === 6) { // Saturday
        nextOpen.setDate(nextOpen.getDate() + 2); // Monday
      } else if (hour >= 16) { // After hours on weekday
        nextOpen.setDate(nextOpen.getDate() + 1);
      }
      nextOpen.setHours(9, 30, 0, 0); // 9:30 AM ET
    }

    res.json({
      isOpen: isMarketOpen,
      nextOpen: isMarketOpen ? null : nextOpen.toISOString(),
      nextClose: isMarketOpen ? nextClose.toISOString() : null,
      timezone: 'America/New_York',
      currentTime: easternTime.toISOString()
    });
  } catch (error) {
    console.error('Get market status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get historical candlestick data for charting
router.get('/bars/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1Day', start, end, limit = 100 } = req.query;
    
    // Validate parameters
    const validTimeframes = ['1Min', '5Min', '15Min', '1Hour', '1Day'];
    if (!validTimeframes.includes(timeframe as string)) {
      return res.status(400).json({ 
        message: `Invalid timeframe. Valid options: ${validTimeframes.join(', ')}` 
      });
    }

    const bars = await marketDataService.getBars(
      symbol, 
      timeframe as string, 
      start as string, 
      end as string, 
      parseInt(limit as string)
    );

    res.json({ 
      symbol,
      timeframe,
      bars: bars || []
    });
  } catch (error) {
    console.error(`Get bars error for ${req.params.symbol}:`, error);
    res.status(500).json({ 
      message: 'Error fetching historical data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as marketDataRouter };