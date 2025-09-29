import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useMarketStore } from '../stores/marketStore';
import { useMarketData } from '../hooks/useMarketData';
import { formatCurrency, formatPercentage, formatTimeAgo } from '../utils/formatters';
import { MarketTrend } from './charts/MarketTrend';



interface StatCardProps {
  title: string;
  value: string;
  change: number;
  changeValue?: string;
  icon: React.ComponentType<any>;
  color?: 'green' | 'red' | 'blue' | 'purple';
  lastUpdated?: Date | string;
}

function StatCard({ title, value, change, changeValue, icon: Icon, color = 'blue', lastUpdated }: StatCardProps) {
  const isPositive = change >= 0;
  const colorClasses = {
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            {lastUpdated && (
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {formatTimeAgo(lastUpdated)}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          <div className="flex items-center mt-2">
            {isPositive ? (
              <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span
              className={`text-sm font-medium ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}
              title="1 Minute Change"
            >
              {formatPercentage(Math.abs(change))}
              {changeValue && ` (${changeValue})`}
            </span>
          </div>
        </div>
        <div className={`p-3 rounded-full bg-gradient-to-r ${colorClasses[color]}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

interface MarketCategoryItemProps {
  symbol: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  icon?: string;
}

function MarketCategoryItem({ symbol, lastPrice, change, changePercent, icon }: MarketCategoryItemProps) {
  const isPositive = change >= 0;
  
  return (
    <div className="grid grid-cols-4 items-center py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded transition-colors min-w-0 gap-2">
      {/* Symbol Column */}
      <div className="flex items-center space-x-2 min-w-0 overflow-hidden">
        {icon && <span className="text-sm flex-shrink-0">{icon}</span>}
        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {symbol}
        </span>
      </div>
      
      {/* Last Price Column */}
      <div className="text-right min-w-0 overflow-hidden">
        <span className="text-sm font-medium text-gray-900 dark:text-white truncate block">
          {formatCurrency(lastPrice)}
        </span>
      </div>
      
      {/* Change Amount Column */}
      <div className="text-right min-w-0 overflow-hidden">
        <span className={`text-sm font-medium truncate block ${
          isPositive ? 'text-green-500' : 'text-red-500'
        }`}>
          {isPositive ? '+' : ''}{change.toFixed(2)}
        </span>
      </div>
      
      {/* Change Percent Column */}
      <div className="text-right min-w-0 overflow-hidden">
        <span className={`text-sm font-medium truncate block ${
          isPositive ? 'text-green-500' : 'text-red-500'
        }`} title="1 Hour Change">
          {formatPercentage(changePercent)}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isConnected, getAllMarketData, lastUpdated } = useMarketStore();
  // Initialize market data hook for WebSocket connection
  useMarketData();
  const [timeRange, setTimeRange] = useState('1D');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Optimized auto-refresh every 1 second for smooth all-symbol display
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 1000); // 1 second refresh for efficient all-symbol updates

    return () => clearInterval(interval);
  }, []);

  // Get live market data from Alpaca
  const liveMarketData = getAllMarketData();
  const hasLiveData = liveMarketData.length > 0;

  // Organize market data by categories
  const marketCategories = {
    STOCKS: {
      'Tech Giants': ['AAPL', 'GOOGL', 'MSFT', 'META', 'NVDA', 'AMD'],
      'Growth & Media': ['TSLA', 'AMZN', 'NFLX', 'DIS', 'PYPL', 'ADBE'],
      'Enterprise': ['CRM', 'ORCL', 'INTC', 'IBM'],
      'Financial': ['JPM', 'BAC', 'GS', 'MS', 'WFC', 'V', 'MA']
    },
    INDICES: {
      'Major ETFs': ['SPY', 'QQQ', 'IWM'],
      'Broad Market': ['VTI', 'VOO', 'VEA', 'VWO']
    },
    CRYPTO: {
      'Major': ['BTC/USD', 'ETH/USD'],
      'Altcoins': ['LTC/USD', 'BCH/USD', 'LINK/USD', 'UNI/USD'],
      'DeFi': ['AAVE/USD', 'ALGO/USD', 'DOT/USD', 'DOGE/USD']
    },
    FOREX: {
      'Major Pairs': ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF'],
      'Commodity Pairs': ['AUD/USD', 'USD/CAD', 'NZD/USD'],
      'Cross Pairs': ['EUR/GBP', 'EUR/JPY', 'GBP/JPY']
    }
  };
  
  // Create market data map for quick lookup
  const marketDataMap = new Map();
  liveMarketData.forEach(data => {
    marketDataMap.set(data.symbol, {
      symbol: data.symbol,
      lastPrice: data.price,
      change: data.change,
      changePercent: data.changePercent,
      icon: getSymbolIcon(data.symbol)
    });
  });
  
  function getSymbolIcon(symbol: string): string {
    // Crypto icons
    if (symbol === 'BTC/USD') return '₿';
    if (symbol === 'ETH/USD') return 'Ξ';
    if (symbol.includes('/USD')) return '🪙';
    
    // Stock icons
    const stockIcons: Record<string, string> = {
      'AAPL': '🍎', 'GOOGL': '🔍', 'MSFT': '🟦', 'META': '📘',
      'NVDA': '🎮', 'AMD': '🔥', 'TSLA': '🚗', 'AMZN': '📦',
      'NFLX': '🎬', 'DIS': '🏰', 'PYPL': '💰', 'ADBE': '🎨',
      'CRM': '☁️', 'ORCL': '🗃️', 'INTC': '💾', 'IBM': '🏢',
      'JPM': '🏛️', 'BAC': '🏦', 'GS': '💎', 'MS': '📊',
      'WFC': '🌎', 'V': '💳', 'MA': '💎',
      'SPY': '🕷️', 'QQQ': '💻', 'IWM': '🏭',
      'VTI': '📈', 'VOO': '🏢', 'VEA': '🌍', 'VWO': '🌏'
    };
    return stockIcons[symbol] || '📈';
  }

  // Symbol name mapping for display
  const symbolNames: { [key: string]: string } = {
    // Major Stocks
    'AAPL': 'Apple Inc.',
    'GOOGL': 'Alphabet Inc.',
    'MSFT': 'Microsoft Corp.',
    'TSLA': 'Tesla Inc.',
    'AMZN': 'Amazon.com Inc.',
    'META': 'Meta Platforms Inc.',
    'NVDA': 'NVIDIA Corp.',
    'AMD': 'Advanced Micro Devices',
    'NFLX': 'Netflix Inc.',
    'DIS': 'Walt Disney Co.',
    'PYPL': 'PayPal Holdings',
    'ADBE': 'Adobe Inc.',
    'CRM': 'Salesforce Inc.',
    'ORCL': 'Oracle Corp.',
    'INTC': 'Intel Corp.',
    'IBM': 'IBM Corp.',
    // Financial Stocks
    'JPM': 'JPMorgan Chase',
    'BAC': 'Bank of America',
    'GS': 'Goldman Sachs',
    'MS': 'Morgan Stanley',
    'WFC': 'Wells Fargo',
    'V': 'Visa Inc.',
    'MA': 'Mastercard Inc.',
    // ETFs and Indices
    'SPY': 'SPDR S&P 500 ETF',
    'QQQ': 'Invesco QQQ Trust',
    'IWM': 'iShares Russell 2000',
    'VTI': 'Vanguard Total Stock Market',
    'VOO': 'Vanguard S&P 500 ETF',
    'VEA': 'Vanguard FTSE Developed Markets',
    'VWO': 'Vanguard Emerging Markets',
    // Cryptocurrencies
    'BTC/USD': 'Bitcoin',
    'ETH/USD': 'Ethereum',
    'LTC/USD': 'Litecoin',
    'BCH/USD': 'Bitcoin Cash',
    'LINK/USD': 'Chainlink',
    'UNI/USD': 'Uniswap',
    'AAVE/USD': 'Aave',
    'ALGO/USD': 'Algorand',
    'DOT/USD': 'Polkadot',
    'DOGE/USD': 'Dogecoin'
  };



  // Debug information
  console.log('🎯 Dashboard render - isConnected:', isConnected, 'hasLiveData:', hasLiveData, 'liveMarketData count:', liveMarketData.length);
  liveMarketData.forEach(data => {
    console.log(`📈 Live data: ${data.symbol} = $${data.price} (${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(2)}%)`);
  });

  // Use only real-time Alpaca data - show all available data
  const displayData = useMemo(() => {
    return liveMarketData.map(data => ({
      symbol: data.symbol,
      name: symbolNames[data.symbol] || data.symbol,
      price: data.price,
      change: data.change,
      changePercent: data.changePercent,
      volume: data.volume?.toString() || '0',
      timestamp: data.timestamp,
      icon: // Same icon mapping as realTimeMarketItems
            data.symbol === 'BTC/USD' ? '₿' :
            data.symbol === 'ETH/USD' ? 'Ξ' :
            data.symbol === 'LTC/USD' ? 'Ł' :
            data.symbol === 'BCH/USD' ? '₿' :
            data.symbol === 'LINK/USD' ? '🔗' :
            data.symbol === 'UNI/USD' ? '🦄' :
            data.symbol === 'AAVE/USD' ? '👻' :
            data.symbol === 'ALGO/USD' ? '⚪' :
            data.symbol === 'DOT/USD' ? '🔴' :
            data.symbol === 'DOGE/USD' ? '🐕' :
            data.symbol === 'AAPL' ? '🍎' :
            data.symbol === 'GOOGL' ? '🔍' :
            data.symbol === 'MSFT' ? '💻' :
            data.symbol === 'TSLA' ? '🚗' :
            data.symbol === 'AMZN' ? '📦' :
            data.symbol === 'META' ? '👥' :
            data.symbol === 'NVDA' ? '💚' :
            data.symbol === 'AMD' ? '🔴' :
            data.symbol === 'NFLX' ? '🎬' :
            data.symbol === 'DIS' ? '🏰' :
            data.symbol === 'PYPL' ? '💳' :
            data.symbol === 'ADBE' ? '🎨' :
            data.symbol === 'CRM' ? '☁️' :
            data.symbol === 'ORCL' ? '🏛️' :
            data.symbol === 'INTC' ? '🔲' :
            data.symbol === 'IBM' ? '🔵' :
            data.symbol === 'JPM' ? '🏦' :
            data.symbol === 'BAC' ? '🏛️' :
            data.symbol === 'GS' ? '💰' :
            data.symbol === 'MS' ? '📊' :
            data.symbol === 'WFC' ? '🌎' :
            data.symbol === 'V' ? '💳' :
            data.symbol === 'MA' ? '💎' :
            data.symbol === 'SPY' ? '🕷️' :
            data.symbol === 'QQQ' ? '💻' :
            data.symbol === 'IWM' ? '🏭' :
            data.symbol === 'VTI' ? '📈' :
            data.symbol === 'VOO' ? '🏢' :
            data.symbol === 'VEA' ? '🌍' :
            data.symbol === 'VWO' ? '🌏' : '📈'
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMarketData, refreshTrigger, symbolNames]);

  const timeRanges = ['1D', '1W', '1M', '3M', '6M', '1Y'];

  return (
    <div className="p-6 space-y-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back! Here's your portfolio overview.
          </p>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 overflow-x-auto">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                  timeRange === range
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {isConnected ? 'Live data connected' : 'Connecting to market data...'}
        </span>
      </div>

      {/* Debug Panel */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-xs font-mono">
        <h3 className="font-bold mb-2 text-gray-900 dark:text-white">🔍 Debug Information</h3>
        <div className="space-y-1 text-gray-700 dark:text-gray-300">
          <div>Connection Status: <span className={isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{isConnected ? 'Connected ✅' : 'Disconnected ❌'}</span></div>
          <div>Live Data Count: <span className="text-blue-600 dark:text-blue-400">{liveMarketData.length}</span></div>
          <div>Display Data Count: <span className="text-purple-600 dark:text-purple-400">{displayData.length}</span></div>
          <div>Timestamp: <span className="text-gray-600 dark:text-gray-400">{new Date().toLocaleTimeString()}</span></div>
          {liveMarketData.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold text-gray-900 dark:text-white">Sample Live Data:</div>
              {liveMarketData.slice(0, 3).map(data => (
                <div key={data.symbol} className="text-gray-700 dark:text-gray-300">
                  {data.symbol}: ${data.price} ({data.changePercent > 0 ? '+' : ''}{data.changePercent.toFixed(2)}%)
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Live Market Data"
          value={displayData.length.toString()}
          change={hasLiveData ? 100 : 0}
          changeValue={hasLiveData ? 'Connected' : 'Disconnected'}
          icon={CurrencyDollarIcon}
          color={hasLiveData ? 'green' : 'red'}
          lastUpdated={displayData.length > 0 ? displayData[0].timestamp : undefined}
        />
        <StatCard
          title="Alpaca Connection"
          value={isConnected ? 'Active' : 'Inactive'}
          change={isConnected ? 100 : 0}
          icon={ArrowTrendingUpIcon}
          color={isConnected ? 'green' : 'red'}
        />
        <StatCard
          title="Tracked Symbols"
          value={displayData.length.toString()}
          change={displayData.length > 0 ? 100 : 0}
          icon={ChartBarIcon}
          color={displayData.length > 0 ? 'purple' : 'blue'}
        />
        <StatCard
          title="Real-Time Updates"
          value={hasLiveData ? 'Live' : 'Waiting'}
          change={hasLiveData ? 100 : 0}
          icon={EyeIcon}
          color={hasLiveData ? 'blue' : 'red'}
          lastUpdated={lastUpdated || undefined}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        {/* Portfolio Chart */}
        <div className="min-w-0">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Portfolio Performance
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Last updated: </span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
            
            {/* Placeholder for chart */}
            <div className="h-80 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <ChartBarIcon className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Portfolio chart will be rendered here</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Using lightweight-charts library
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Market Trend */}
        <MarketTrend />
      </div>

      {/* Full Width Live Market Data */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Live Market Data
            </h2>
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              isConnected 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`} />
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </div>
          </div>
          
          {/* Column Headers */}
          <div className="grid grid-cols-4 items-center mt-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-0 gap-2">
            <span className="truncate">Symbol</span>
            <span className="text-right truncate">Last</span>
            <span className="text-right truncate">Chg</span>
            <span className="text-right truncate">Chg%</span>
          </div>
        </div>

        {/* Categorized Market Data */}
        <div className="p-4">
          {liveMarketData.length > 0 ? (
            <div className="space-y-6">
              {/* STOCKS Category */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                  <span className="mr-2">📈</span> STOCKS
                </h3>
                {Object.entries(marketCategories.STOCKS).map(([subcategory, symbols]) => (
                  <div key={subcategory} className="mb-4">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-2 ml-4">{subcategory}</h4>
                    <div className="space-y-1">
                      {symbols.map(symbol => {
                        const item = marketDataMap.get(symbol);
                        return item ? <MarketCategoryItem key={symbol} {...item} /> : null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* INDICES Category */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                  <span className="mr-2">📊</span> INDICES & ETFS
                </h3>
                {Object.entries(marketCategories.INDICES).map(([subcategory, symbols]) => (
                  <div key={subcategory} className="mb-4">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-2 ml-4">{subcategory}</h4>
                    <div className="space-y-1">
                      {symbols.map(symbol => {
                        const item = marketDataMap.get(symbol);
                        return item ? <MarketCategoryItem key={symbol} {...item} /> : null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* CRYPTO Category */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                  <span className="mr-2">🪙</span> CRYPTOCURRENCY
                </h3>
                {Object.entries(marketCategories.CRYPTO).map(([subcategory, symbols]) => (
                  <div key={subcategory} className="mb-4">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-2 ml-4">{subcategory}</h4>
                    <div className="space-y-1">
                      {symbols.map(symbol => {
                        const item = marketDataMap.get(symbol);
                        return item ? <MarketCategoryItem key={symbol} {...item} /> : null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* FOREX Category */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                  <span className="mr-2">💱</span> FOREIGN EXCHANGE
                </h3>
                {Object.entries(marketCategories.FOREX).map(([subcategory, symbols]) => (
                  <div key={subcategory} className="mb-4">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-2 ml-4">{subcategory}</h4>
                    <div className="space-y-1">
                      {symbols.map(symbol => {
                        const item = marketDataMap.get(symbol);
                        return item ? <MarketCategoryItem key={symbol} {...item} /> : null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="animate-pulse">
                <div className="text-lg mb-2 text-gray-500 dark:text-gray-400">📡 Connecting to Alpaca Markets</div>
                <div className="text-sm text-gray-400 dark:text-gray-500">Waiting for real-time market data...</div>
              </div>
            </div>
          )}
        </div>

        {/* Live data status */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${hasLiveData ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {hasLiveData ? (
                <>🔴 Live from Alpaca Markets • {liveMarketData.length} symbols</>
              ) : (
                <>⏳ Establishing Alpaca connection...</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}