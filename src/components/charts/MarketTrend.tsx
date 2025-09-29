import React, { useState, useEffect } from 'react';
import { ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { useMarketStore } from '../../stores/marketStore';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
// import { apiService } from '../../services/api'; // Temporarily disabled

interface MarketTrendProps {
  className?: string;
}

interface TrendData {
  time: string;
  price: number;
  volume: number;
}

const timeRanges = [
  { value: '1D', label: '1 Day', timeframe: '1hour' as const },
  { value: '1W', label: '1 Week', timeframe: '1hour' as const },
  { value: '1M', label: '1 Month', timeframe: '1day' as const },
  { value: '3M', label: '3 Months', timeframe: '1day' as const },
];

export function MarketTrend({ className = '' }: MarketTrendProps) {
  const { marketData, isConnected } = useMarketStore();
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [timeRange, setTimeRange] = useState('1D');
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Available symbols for selection
  const availableSymbols = [
    'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'AMD',
    'BTC/USD', 'ETH/USD'
  ];

  // Get current market data for selected symbol
  const currentData = marketData.get(selectedSymbol);
  const isPositive = currentData ? currentData.changePercent >= 0 : true;

  // Fetch real trend data from backend
  useEffect(() => {
    const fetchTrendData = async () => {
      setIsLoading(true);
      
      try {
        const currentRange = timeRanges.find(r => r.value === timeRange);
        if (!currentRange) return;

        // Temporarily disabled - Alpaca paper account doesn't have SIP data access
        // const limit = timeRange === '1D' ? 24 : timeRange === '1W' ? 168 : timeRange === '1M' ? 30 : 90;
        // 
        // const response = await apiService.getCandlestickData(
        //   selectedSymbol,
        //   currentRange.timeframe,
        //   limit
        // );
        // 
        // const candlestickData = response.data;
        // 
        // if (candlestickData?.data && candlestickData.data.length > 0) {
        //   const formattedData: TrendData[] = candlestickData.data.map((bar, index) => {
        //     const date = new Date(bar.time);
        //     let timeLabel = '';
        //     
        //     if (currentRange.timeframe === '1hour') {
        //       timeLabel = date.getHours().toString().padStart(2, '0') + ':00';
        //     } else {
        //       timeLabel = `${date.getMonth() + 1}/${date.getDate()}`;
        //     }
        //     
        //     return {
        //       time: timeLabel,
        //       price: bar.close,
        //       volume: bar.volume
        //     };
        //   });
        //   
        //   setTrendData(formattedData);
        // } else {
        //   // Fallback to simulated data if no real data available
        //   generateFallbackData();
        // }
        
        // Use fallback data for now (until we get SIP data access)
        generateFallbackData();
        
      } catch (error) {
        console.error('Failed to fetch trend data:', error);
        // Fallback to simulated data on error
        generateFallbackData();
      } finally {
        setIsLoading(false);
      }
    };

    const generateFallbackData = () => {
      const basePrice = currentData?.price || 150;
      const points = timeRange === '1D' ? 24 : timeRange === '1W' ? 7 * 24 : 30;
      const interval = timeRange === '1D' ? 'hour' : 'day';
      
      const data: TrendData[] = [];
      let currentPrice = basePrice * 0.95; // Start slightly lower
      
      for (let i = 0; i < Math.min(points, 50); i++) {
        const change = (Math.random() - 0.5) * (basePrice * 0.02); // 2% max change
        currentPrice += change;
        
        let timeLabel = '';
        const now = new Date();
        
        if (interval === 'hour') {
          const time = new Date(now.getTime() - (points - i) * 60 * 60 * 1000);
          timeLabel = time.getHours().toString().padStart(2, '0') + ':00';
        } else {
          const time = new Date(now.getTime() - (points - i) * 24 * 60 * 60 * 1000);
          timeLabel = `${time.getMonth() + 1}/${time.getDate()}`;
        }
        
        data.push({
          time: timeLabel,
          price: Math.max(currentPrice, basePrice * 0.8), // Don't go too low
          volume: Math.floor(Math.random() * 1000000) + 100000
        });
      }
      
      setTrendData(data);
    };

    fetchTrendData();
  }, [selectedSymbol, timeRange, currentData]);

  // Simple line chart component
  const SimpleLineChart = ({ data }: { data: TrendData[] }) => {
    if (data.length === 0) return null;

    const maxPrice = Math.max(...data.map(d => d.price));
    const minPrice = Math.min(...data.map(d => d.price));
    const priceRange = maxPrice - minPrice || 1;

    return (
      <div className="relative h-64 w-full min-w-0 overflow-hidden">
        <svg className="w-full h-full min-w-0" viewBox="0 0 500 200" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100, 125, 150, 175, 200].map(y => (
            <line 
              key={y}
              x1="0" 
              y1={y} 
              x2="500" 
              y2={y} 
              stroke="currentColor" 
              strokeOpacity="0.1"
            />
          ))}
          
          {/* Price line */}
          <polyline
            fill="none"
            stroke={isPositive ? "#10b981" : "#ef4444"}
            strokeWidth="2"
            points={data.map((point, index) => {
              const x = (index / (data.length - 1)) * 500;
              const y = 200 - ((point.price - minPrice) / priceRange) * 200;
              return `${x},${y}`;
            }).join(' ')}
          />
          
          {/* Data points */}
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * 500;
            const y = 200 - ((point.price - minPrice) / priceRange) * 200;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill={isPositive ? "#10b981" : "#ef4444"}
                className="opacity-0 hover:opacity-100 transition-opacity"
              />
            );
          })}
        </svg>
        
        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-2 overflow-hidden">
          <span className="truncate max-w-[4rem]">{data[0]?.time}</span>
          <span className="truncate max-w-[4rem]">{data[Math.floor(data.length / 2)]?.time}</span>
          <span className="truncate max-w-[4rem]">{data[data.length - 1]?.time}</span>
        </div>
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 -ml-16 overflow-hidden">
          <span className="truncate max-w-[4rem]">{formatCurrency(maxPrice)}</span>
          <span className="truncate max-w-[4rem]">{formatCurrency((maxPrice + minPrice) / 2)}</span>
          <span className="truncate max-w-[4rem]">{formatCurrency(minPrice)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 min-w-0 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 min-w-0">
        <div className="flex items-center space-x-3 min-w-0 overflow-hidden">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
            <ChartBarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              Market Trend
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              Track price movement over time
            </p>
          </div>
        </div>
        
        {/* Connection indicator */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Symbol selector */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4 min-w-0">
        <div className="flex items-center space-x-2 min-w-0">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            Symbol:
          </label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            aria-label="Select symbol for market trend"
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-0 max-w-full"
          >
            {availableSymbols.map(symbol => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center space-x-2 min-w-0">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            Period:
          </label>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 overflow-x-auto">
            {timeRanges.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTimeRange(value)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                  timeRange === value
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Current price info */}
      {currentData && (
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg min-w-0 gap-4">
          <div className="min-w-0 overflow-hidden">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {formatCurrency(currentData.price)}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              Current price
            </p>
          </div>
          
          <div className="text-right flex-shrink-0 min-w-0">
            <div className="flex items-center justify-end space-x-1 min-w-0">
              {isPositive ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 flex-shrink-0" />
              )}
              <span className={`text-sm font-semibold truncate ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{formatCurrency(currentData.change)}
              </span>
              <span className={`text-xs truncate ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                ({formatPercentage(Math.abs(currentData.changePercent))})
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
              {timeRange} change
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="relative min-w-0 overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-500">Loading trend data...</span>
          </div>
        ) : trendData.length > 0 ? (
          <SimpleLineChart data={trendData} />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <ChartBarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No trend data available</p>
            </div>
          </div>
        )}
      </div>

      {/* Chart info */}
      {trendData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 gap-2 min-w-0">
            <span className="truncate">Period: {timeRanges.find(r => r.value === timeRange)?.label}</span>
            <span className="whitespace-nowrap">{trendData.length} data points</span>
            <span className="truncate">Updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}