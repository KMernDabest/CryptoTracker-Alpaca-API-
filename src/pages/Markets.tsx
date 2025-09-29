import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useMarketStore } from '../stores/marketStore';
import { useMarketData } from '../hooks/useMarketData';
import { formatCurrency, formatPercentage, formatTimeAgo } from '../utils/formatters';
import { 
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  ChartBarIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

interface CandlestickDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SymbolOption {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto' | 'forex' | 'index';
  category?: string;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  lastUpdated?: Date;
}

interface WatchlistItemProps {
  symbol: SymbolOption;
  isSelected: boolean;
  onClick: () => void;
}

const AVAILABLE_SYMBOLS: SymbolOption[] = [
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

const TIME_RANGES = [
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
];

// WatchlistItem Component
const WatchlistItem: React.FC<WatchlistItemProps> = ({ symbol, isSelected, onClick }) => {
  const { getAllMarketData } = useMarketStore();
  const marketData = getAllMarketData().find(data => data.symbol === symbol.symbol);
  
  const price = marketData?.price || symbol.currentPrice || 0;
  const change = marketData?.change || symbol.change || 0;
  const changePercent = marketData?.changePercent || symbol.changePercent || 0;
  const lastUpdated = marketData?.timestamp || symbol.lastUpdated || new Date();
  
  const isPositive = change >= 0;
  const changeColor = isPositive ? 'text-green-500' : 'text-red-500';
  const bgColor = isSelected 
    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750';
  
  return (
    <div
      onClick={onClick}
      className={`p-2 border rounded-lg cursor-pointer transition-all duration-200 ${bgColor}`}
    >
      <div className="flex justify-between items-start mb-1.5">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
            {symbol.symbol}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 break-words leading-tight">
            {symbol.name}
          </p>
          {symbol.category && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {symbol.category}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0 ml-1">
          <div className="font-semibold text-sm text-gray-900 dark:text-white">
            {formatCurrency(price)}
          </div>
          <div className={`text-xs font-medium flex items-center justify-end ${changeColor}`} title="1 Minute Change">
            {isPositive ? (
              <ArrowUpIcon className="w-3 h-3 mr-1" />
            ) : (
              <ArrowDownIcon className="w-3 h-3 mr-1" />
            )}
            {formatCurrency(Math.abs(change))} ({formatPercentage(changePercent)})
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          symbol.type === 'crypto' 
            ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300'
            : symbol.type === 'forex'
            ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
            : symbol.type === 'index'
            ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300'
            : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
        }`}>
          {symbol.type === 'crypto' ? 'CRYPTO' : 
           symbol.type === 'forex' ? 'FOREX' :
           symbol.type === 'index' ? 'INDEX' : 'STOCK'}
        </span>
        <span className="flex items-center">
          <ClockIcon className="w-3 h-3 mr-1" />
          {formatTimeAgo(lastUpdated)}
        </span>
      </div>
    </div>
  );
};

export default function Markets() {
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolOption>(AVAILABLE_SYMBOLS[0]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1D');
  const [candlestickData, setCandlestickData] = useState<CandlestickDataPoint[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'stock' | 'crypto' | 'forex' | 'index'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const { getAllMarketData, isConnected } = useMarketStore();
  
  // Initialize real-time market data connection
  useMarketData();
  
  // Chart reference for proper cleanup
  const chartRef = useRef<any>(null);

  // Filter symbols based on search and type
  const filteredSymbols = AVAILABLE_SYMBOLS.filter(symbol => {
    const matchesSearch = symbol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         symbol.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || symbol.type === selectedType;
    return matchesSearch && matchesType;
  });

  // Get current market data for the selected symbol
  const currentMarketData = getAllMarketData().find(data => data.symbol === selectedSymbol.symbol);

  // Generate sample candlestick data (in real implementation, this would come from backend)
  const generateSampleCandlestickData = useCallback(async (symbol: string, timeRange: string): Promise<CandlestickDataPoint[]> => {
    try {
      // Try to fetch real data from backend
      const response = await fetch(`http://localhost:5001/api/market-data/bars/${symbol}?timeframe=${timeRange === '1D' ? '1Hour' : '1Day'}&limit=${timeRange === '1D' ? 24 : timeRange === '1W' ? 7 : timeRange === '1M' ? 30 : 100}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Fetched ${data.bars?.length || 0} bars for ${symbol}`);
        if (data.bars && data.bars.length > 0) {
          return data.bars.map((bar: any) => ({
            timestamp: bar.timestamp,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            volume: bar.volume,
          }));
        }
      } else {
        console.log(`❌ Backend request failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log('⚠️ Failed to fetch backend data, using sample data:', error);
    }
    
    // Fallback to sample data
    console.log(`📊 Generating sample data for ${symbol} (${timeRange})`);
    const now = Date.now();
    const basePrice = currentMarketData?.price || (symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 2800 : symbol === 'SPY' ? 450 : 150);
    console.log(`Base price for ${symbol}: $${basePrice}`);
    const data: CandlestickDataPoint[] = [];
    
    let intervals = 24; // Default for 1D
    let intervalMs = 60 * 60 * 1000; // 1 hour
    
    switch (timeRange) {
      case '1D':
        intervals = 24;
        intervalMs = 60 * 60 * 1000; // 1 hour
        break;
      case '1W':
        intervals = 7;
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        break;
      case '1M':
        intervals = 30;
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        break;
      case '3M':
        intervals = 90;
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        break;
      case '6M':
        intervals = 180;
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        break;
      case '1Y':
        intervals = 365;
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        break;
    }

    for (let i = intervals; i >= 0; i--) {
      const timestamp = now - (i * intervalMs);
      const volatility = 0.02; // 2% volatility
      const trend = Math.sin(i * 0.1) * 0.01; // Small trend
      
      const open = basePrice * (1 + (Math.random() - 0.5) * volatility + trend);
      const close = open * (1 + (Math.random() - 0.5) * volatility + trend);
      const high = Math.max(open, close) * (1 + Math.random() * volatility);
      const low = Math.min(open, close) * (1 - Math.random() * volatility);
      const volume = Math.floor(Math.random() * 1000000) + 100000;

      data.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume,
      });
    }

    console.log(`✅ Generated ${data.length} data points for ${symbol}:`, data.slice(0, 3));
    return data;
  }, [currentMarketData?.price]);

  // Cleanup function for chart
  const destroyChart = useCallback(() => {
    if (chartRef.current) {
      try {
        chartRef.current.destroy();
      } catch (error) {
        console.warn('Chart destruction error:', error);
      } finally {
        chartRef.current = null;
      }
    }
  }, []);

  // Chart options with safe DOM access
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0, // Disable animations to prevent DOM access issues
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: true,
        text: `${selectedSymbol.symbol} - ${selectedTimeRange} Chart`,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const datasetLabel = context.dataset.label;
            const value = context.parsed.y;
            const dataIndex = context.dataIndex;
            const point = candlestickData[dataIndex];
            
            if (datasetLabel.includes('Close')) {
              return [
                `${datasetLabel}: $${value.toFixed(2)}`,
                `Open: $${point?.open?.toFixed(2) || 'N/A'}`,
                `High: $${point?.high?.toFixed(2) || 'N/A'}`,
                `Low: $${point?.low?.toFixed(2) || 'N/A'}`,
                `Volume: ${point?.volume?.toLocaleString() || 'N/A'}`,
              ];
            }
            return `${datasetLabel}: $${value.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const, // Change from 'time' to 'linear' to avoid date adapter issues
        title: {
          display: true,
          text: 'Time',
        },
        ticks: {
          callback: function(value: any, index: number) {
            // Format timestamps as readable time
            if (candlestickData[index]) {
              const date = new Date(candlestickData[index].timestamp);
              return selectedTimeRange === '1D' 
                ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
            return '';
          },
        },
      },
      y: {
        title: {
          display: true,
          text: 'Price ($)',
        },
        ticks: {
          callback: (value: any) => `$${Number(value).toFixed(2)}`,
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
    elements: {
      point: {
        radius: 2,
        hoverRadius: 4,
      },
      line: {
        tension: 0.1,
        borderWidth: 2,
      },
    },
  }), [selectedSymbol.symbol, selectedTimeRange, candlestickData]);

  // Cleanup chart on component unmount
  useEffect(() => {
    return destroyChart;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update candlestick data when symbol or time range changes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Destroy existing chart before creating new one
      destroyChart();
      
      try {
        console.log(`📊 Fetching chart data for ${selectedSymbol.symbol} (${selectedTimeRange})`);
        const newData = await generateSampleCandlestickData(selectedSymbol.symbol, selectedTimeRange);
        setCandlestickData(newData);
        console.log(`✅ Chart data loaded: ${newData.length} data points`);
      } catch (error) {
        console.error('❌ Error fetching chart data:', error);
        setCandlestickData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol, selectedTimeRange]);

  // Create chart data for Chart.js with proper candlestick visualization
  const chartData = useMemo(() => {
    console.log(`🎨 Creating chart data with ${candlestickData.length} points`);
    console.log(`📊 Chart data for ${selectedSymbol.symbol}:`, candlestickData.slice(0, 3));
    
    if (candlestickData.length === 0) {
      console.log('⚠️ No candlestick data available for chart');
      return {
        labels: [],
        datasets: []
      };
    }

    const labels = candlestickData.map((d, index) => {
      const date = new Date(d.timestamp);
      return selectedTimeRange === '1D' 
        ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    return {
      labels,
      datasets: [
        {
          label: `${selectedSymbol.symbol} Close Price`,
          data: candlestickData.map(d => d.close),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.1,
          fill: false,
        },
        {
          label: `${selectedSymbol.symbol} High`,
          data: candlestickData.map(d => d.high),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 1,
          pointRadius: 1,
          borderDash: [5, 5],
          tension: 0.1,
          fill: false,
        },
        {
          label: `${selectedSymbol.symbol} Low`,
          data: candlestickData.map(d => d.low),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 1,
          pointRadius: 1,
          borderDash: [5, 5],
          tension: 0.1,
          fill: false,
        },
      ],
    };
  }, [candlestickData, selectedSymbol.symbol, selectedTimeRange]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar - Watchlist */}
      <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Watchlist
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
          
          {/* Search */}
          <div className="relative mb-3">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search symbols..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          
          {/* Type Filter */}
          <div className="flex gap-1 overflow-x-auto">
            {[
              { key: 'all', label: 'All', color: 'gray' },
              { key: 'stock', label: 'Stocks', color: 'blue' },
              { key: 'index', label: 'Indices', color: 'purple' },
              { key: 'crypto', label: 'Crypto', color: 'orange' },
              { key: 'forex', label: 'Forex', color: 'green' }
            ].map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setSelectedType(key as any)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedType === key
                    ? `bg-${color}-100 dark:bg-${color}-900/20 text-${color}-800 dark:text-${color}-300`
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Watchlist Items */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            {filteredSymbols.length} symbols {selectedType !== 'all' && `(${selectedType})`}
          </div>
          <div className="space-y-2">
            {filteredSymbols.map((symbol) => (
              <WatchlistItem
                key={symbol.symbol}
                symbol={symbol}
                isSelected={selectedSymbol.symbol === symbol.symbol}
                onClick={() => setSelectedSymbol(symbol)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar with Symbol Info and Time Range */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            {/* Selected Symbol Info */}
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedSymbol.name} ({selectedSymbol.symbol})
                </h1>
                <div className="flex items-center space-x-4 mt-1">
                  {currentMarketData && (
                    <>
                      <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(currentMarketData.price)}
                      </span>
                      <div className={`flex items-center text-lg font-medium ${
                        currentMarketData.change >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {currentMarketData.change >= 0 ? (
                          <ArrowUpIcon className="w-4 h-4 mr-1" />
                        ) : (
                          <ArrowDownIcon className="w-4 h-4 mr-1" />
                        )}
                        {formatCurrency(Math.abs(currentMarketData.change))} ({formatPercentage(currentMarketData.changePercent)})
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        {formatTimeAgo(currentMarketData.timestamp)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center space-x-2">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setSelectedTimeRange(range.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedTimeRange === range.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 p-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
                  <p className="text-gray-500 dark:text-gray-400">Loading chart data...</p>
                </div>
              </div>
            ) : candlestickData.length > 0 ? (
              (() => {
                console.log('🚀 Rendering chart with data:', { 
                  symbol: selectedSymbol.symbol, 
                  dataPoints: candlestickData.length,
                  chartDatasets: chartData.datasets?.length 
                });
                return (
                  <div className="p-6 h-full">
                    <Line 
                      ref={chartRef}
                      data={chartData} 
                      options={{
                        ...chartOptions,
                        maintainAspectRatio: false,
                        responsive: true,
                      }} 
                    />
                  </div>
                );
              })()
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <EyeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No chart data available</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Select a symbol to view price charts
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}