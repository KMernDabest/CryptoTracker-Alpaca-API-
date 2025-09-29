import React, { useState, useMemo } from 'react';
import { 
  MagnifyingGlassIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useMarketStore } from '../stores/marketStore';
import { useMarketData } from '../hooks/useMarketData';
import { formatCurrency, formatPercentage, formatTimeAgo } from '../utils/formatters';

interface SymbolData {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto' | 'forex' | 'index';
  category: string;
  price?: number;
  change?: number;
  changePercent?: number;
  timestamp?: Date;
}

const ALL_SYMBOLS: SymbolData[] = [
  // STOCKS - Tech Giants
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', category: 'Tech Giants' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', category: 'Tech Giants' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock', category: 'Tech Giants' },
  { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock', category: 'Tech Giants' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock', category: 'Tech Giants' },
  { symbol: 'AMD', name: 'AMD Inc.', type: 'stock', category: 'Tech Giants' },
  
  // STOCKS - Growth & Media
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', category: 'Growth & Media' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', category: 'Growth & Media' },
  { symbol: 'NFLX', name: 'Netflix Inc.', type: 'stock', category: 'Growth & Media' },
  { symbol: 'DIS', name: 'Walt Disney Co.', type: 'stock', category: 'Growth & Media' },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc.', type: 'stock', category: 'Growth & Media' },
  { symbol: 'ADBE', name: 'Adobe Inc.', type: 'stock', category: 'Growth & Media' },
  
  // STOCKS - Enterprise
  { symbol: 'CRM', name: 'Salesforce Inc.', type: 'stock', category: 'Enterprise' },
  { symbol: 'ORCL', name: 'Oracle Corp.', type: 'stock', category: 'Enterprise' },
  { symbol: 'INTC', name: 'Intel Corp.', type: 'stock', category: 'Enterprise' },
  { symbol: 'IBM', name: 'IBM Corp.', type: 'stock', category: 'Enterprise' },
  
  // STOCKS - Financial
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: 'stock', category: 'Financial' },
  { symbol: 'BAC', name: 'Bank of America Corp.', type: 'stock', category: 'Financial' },
  { symbol: 'GS', name: 'Goldman Sachs Group Inc.', type: 'stock', category: 'Financial' },
  { symbol: 'MS', name: 'Morgan Stanley', type: 'stock', category: 'Financial' },
  { symbol: 'WFC', name: 'Wells Fargo & Co.', type: 'stock', category: 'Financial' },
  { symbol: 'V', name: 'Visa Inc.', type: 'stock', category: 'Financial' },
  { symbol: 'MA', name: 'Mastercard Inc.', type: 'stock', category: 'Financial' },
  
  // INDICES - Major ETFs
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'index', category: 'Major ETFs' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'index', category: 'Major ETFs' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', type: 'index', category: 'Major ETFs' },
  
  // INDICES - Broad Market
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', type: 'index', category: 'Broad Market' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'index', category: 'Broad Market' },
  { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', type: 'index', category: 'Broad Market' },
  { symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', type: 'index', category: 'Broad Market' },
  
  // CRYPTO - Major
  { symbol: 'BTC/USD', name: 'Bitcoin', type: 'crypto', category: 'Major' },
  { symbol: 'ETH/USD', name: 'Ethereum', type: 'crypto', category: 'Major' },
  
  // CRYPTO - Altcoins
  { symbol: 'LTC/USD', name: 'Litecoin', type: 'crypto', category: 'Altcoins' },
  { symbol: 'BCH/USD', name: 'Bitcoin Cash', type: 'crypto', category: 'Altcoins' },
  { symbol: 'LINK/USD', name: 'Chainlink', type: 'crypto', category: 'Altcoins' },
  { symbol: 'UNI/USD', name: 'Uniswap', type: 'crypto', category: 'Altcoins' },
  
  // CRYPTO - DeFi
  { symbol: 'AAVE/USD', name: 'Aave', type: 'crypto', category: 'DeFi' },
  { symbol: 'ALGO/USD', name: 'Algorand', type: 'crypto', category: 'DeFi' },
  { symbol: 'DOT/USD', name: 'Polkadot', type: 'crypto', category: 'DeFi' },
  { symbol: 'DOGE/USD', name: 'Dogecoin', type: 'crypto', category: 'DeFi' },
  
  // FOREX - Major Pairs
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', type: 'forex', category: 'Major Pairs' },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', type: 'forex', category: 'Major Pairs' },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', type: 'forex', category: 'Major Pairs' },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', type: 'forex', category: 'Major Pairs' },
  
  // FOREX - Commodity Pairs
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', type: 'forex', category: 'Commodity Pairs' },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', type: 'forex', category: 'Commodity Pairs' },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', type: 'forex', category: 'Commodity Pairs' },
  
  // FOREX - Cross Pairs
  { symbol: 'EUR/GBP', name: 'Euro / British Pound', type: 'forex', category: 'Cross Pairs' },
  { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', type: 'forex', category: 'Cross Pairs' },
  { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', type: 'forex', category: 'Cross Pairs' },
];

const Watchlist: React.FC = () => {
  const { getAllMarketData, isConnected } = useMarketStore();
  useMarketData(); // Initialize market data connection
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'stock' | 'crypto' | 'forex' | 'index'>('all');
  const [sortBy, setSortBy] = useState<'symbol' | 'price' | 'change' | 'changePercent'>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Get live market data
  const liveMarketData = getAllMarketData();

  // Combine symbols with live market data
  const enrichedSymbols = useMemo(() => {
    return ALL_SYMBOLS.map(symbol => {
      const liveData = liveMarketData.find(data => data.symbol === symbol.symbol);
      return {
        ...symbol,
        price: liveData?.price || 0,
        change: liveData?.change || 0,
        changePercent: liveData?.changePercent || 0,
        timestamp: liveData?.timestamp || new Date(),
      };
    });
  }, [liveMarketData]);

  // Filter and sort symbols
  const filteredAndSortedSymbols = useMemo(() => {
    let filtered = enrichedSymbols.filter(symbol => {
      const matchesSearch = symbol.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           symbol.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'all' || symbol.type === selectedType;
      return matchesSearch && matchesType;
    });

    // Sort symbols
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case 'change':
          aValue = a.change || 0;
          bValue = b.change || 0;
          break;
        case 'changePercent':
          aValue = a.changePercent || 0;
          bValue = b.changePercent || 0;
          break;
        default:
          aValue = a.symbol;
          bValue = b.symbol;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    return filtered;
  }, [enrichedSymbols, searchTerm, selectedType, sortBy, sortOrder]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc'); // Default to desc for numerical fields
    }
  };

  // Group symbols by category
  const symbolsByCategory = useMemo(() => {
    const grouped: Record<string, typeof filteredAndSortedSymbols> = {};
    filteredAndSortedSymbols.forEach(symbol => {
      if (!grouped[symbol.category]) {
        grouped[symbol.category] = [];
      }
      grouped[symbol.category].push(symbol);
    });
    return grouped;
  }, [filteredAndSortedSymbols]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'crypto': return '₿';
      case 'forex': return '💱';
      case 'index': return '📈';
      default: return '📊';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'crypto': return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300';
      case 'forex': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      case 'index': return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300';
      default: return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Watchlist</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track all available symbols with real-time price data
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isConnected ? 'Live Data' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Data Source Information */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-600 dark:text-gray-300">Live Data</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-xs text-gray-600 dark:text-gray-300">Simulated (SIM)</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            📋 Simulated data for FOREX, some ETFs & altcoins due to paper trading limitations
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search symbols or names..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Type Filter */}
          <div className="flex flex-wrap gap-2">
            {['all', 'stock', 'crypto', 'forex', 'index'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2">
            {[
              { key: 'symbol', label: 'Symbol' },
              { key: 'price', label: 'Price' },
              { key: 'change', label: 'Change' },
              { key: 'changePercent', label: 'Change %' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleSort(key as any)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  sortBy === key
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {label} {sortBy === key && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              Showing {filteredAndSortedSymbols.length} of {ALL_SYMBOLS.length} symbols
            </span>
            <span>
              Live data: {liveMarketData.length} symbols
            </span>
          </div>
        </div>
      </div>

      {/* Symbols List */}
      <div className="space-y-6">
        {Object.entries(symbolsByCategory).map(([category, symbols]) => (
          <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2">{getTypeIcon(symbols[0].type)}</span>
                {category}
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({symbols.length} symbols)
                </span>
              </h3>
            </div>
            <div className="p-4">
              <div className="grid gap-3">
                {symbols.map((symbol) => {
                  const isPositive = (symbol.changePercent || 0) >= 0;
                  const changeColor = isPositive ? 'text-green-500' : 'text-red-500';
                  
                  return (
                    <div
                      key={symbol.symbol}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(symbol.type)}`}>
                            {symbol.type.toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {symbol.symbol}
                            </h4>
                            {symbol.price > 0 && (
                              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {symbol.name}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                            {symbol.price > 0 ? (
                              <>
                                {formatCurrency(symbol.price)}
                                {/* Add indicator for simulated data */}
                                {(symbol.type === 'forex' || 
                                  ['LTC/USD', 'BCH/USD', 'LINK/USD', 'UNI/USD', 'AAVE/USD', 'ALGO/USD', 'DOT/USD', 'DOGE/USD'].includes(symbol.symbol) ||
                                  ['VEA', 'VWO', 'IWM'].includes(symbol.symbol)) && (
                                  <span className="ml-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-1 py-0.5 rounded text-[10px]">
                                    SIM
                                  </span>
                                )}
                              </>
                            ) : (
                              'No Data'
                            )}
                          </div>
                          {symbol.price > 0 && (
                            <div className={`text-xs font-medium flex items-center justify-end ${changeColor}`}>
                              {isPositive ? (
                                <ArrowUpIcon className="w-3 h-3 mr-1" />
                              ) : (
                                <ArrowDownIcon className="w-3 h-3 mr-1" />
                              )}
                              {formatCurrency(Math.abs(symbol.change || 0))} ({formatPercentage(symbol.changePercent || 0)})
                            </div>
                          )}
                        </div>
                        
                        {symbol.price > 0 && (
                          <div className="text-right">
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <ClockIcon className="w-3 h-3 mr-1" />
                              {formatTimeAgo(symbol.timestamp || new Date())}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAndSortedSymbols.length === 0 && (
        <div className="text-center py-12">
          <EyeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No symbols found matching your criteria</p>
        </div>
      )}
    </div>
  );
};

export default Watchlist;