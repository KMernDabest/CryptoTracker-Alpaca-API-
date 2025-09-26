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
import { formatCurrency, formatPercentage, formatTimeAgo } from '../utils/formatters';
import { 
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
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
  type: 'stock' | 'crypto';
}

const AVAILABLE_SYMBOLS: SymbolOption[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', type: 'stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock' },
  { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', type: 'stock' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'stock' },
  { symbol: 'BTC/USD', name: 'Bitcoin', type: 'crypto' },
  { symbol: 'ETH/USD', name: 'Ethereum', type: 'crypto' },
];

const TIME_RANGES = [
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
];

export default function Markets() {
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolOption>(AVAILABLE_SYMBOLS[0]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1D');
  const [candlestickData, setCandlestickData] = useState<CandlestickDataPoint[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { getAllMarketData, isConnected } = useMarketStore();
  
  // Chart reference for proper cleanup
  const chartRef = useRef<any>(null);

  // Filter symbols based on search
  const filteredSymbols = AVAILABLE_SYMBOLS.filter(symbol =>
    symbol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    symbol.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    const basePrice = currentMarketData?.price || (symbol.includes('BTC') ? 110000 : symbol.includes('ETH') ? 4000 : 200);
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
            const point = context.raw as CandlestickDataPoint;
            if (!point) return '';
            return [
              `Open: $${point.open?.toFixed(2) || 'N/A'}`,
              `High: $${point.high?.toFixed(2) || 'N/A'}`,
              `Low: $${point.low?.toFixed(2) || 'N/A'}`,
              `Close: $${point.close?.toFixed(2) || 'N/A'}`,
              `Volume: ${point.volume?.toLocaleString() || 'N/A'}`,
            ];
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

  // Create chart data for Chart.js
  const chartData = {
    labels: candlestickData.map(d => new Date(d.timestamp).toLocaleString()),
    datasets: [
      {
        label: `${selectedSymbol.symbol} High`,
        data: candlestickData.map(d => d.high),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.1,
      },
      {
        label: `${selectedSymbol.symbol} Low`,
        data: candlestickData.map(d => d.low),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.1,
      },
      {
        label: `${selectedSymbol.symbol} Close`,
        data: candlestickData.map(d => d.close),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        pointRadius: 3,
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Markets
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time market analysis and price charts
        </p>
      </div>

      {/* Connection Status */}
      <div className="mb-6">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          isConnected 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`} />
          {isConnected ? 'Live Data Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Symbol Selection Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select Symbol
            </h3>
            
            {/* Search */}
            <div className="relative mb-4">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search symbols..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Symbol List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredSymbols.map((symbol) => {
                const marketData = getAllMarketData().find(data => data.symbol === symbol.symbol);
                const isSelected = selectedSymbol.symbol === symbol.symbol;
                
                return (
                  <button
                    key={symbol.symbol}
                    onClick={() => setSelectedSymbol(symbol)}
                    className={`w-full p-3 text-left rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700'
                        : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            symbol.type === 'crypto' 
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {symbol.type.toUpperCase()}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {symbol.symbol}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {symbol.name}
                        </p>
                      </div>
                      {marketData && (
                        <div className="text-right">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(marketData.price)}
                          </div>
                          <div className={`text-sm font-medium flex items-center ${
                            marketData.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {marketData.changePercent >= 0 ? (
                              <ArrowUpIcon className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDownIcon className="h-3 w-3 mr-1" />
                            )}
                            {formatPercentage(Math.abs(marketData.changePercent))}
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            {/* Chart Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="mb-4 sm:mb-0">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedSymbol.name} ({selectedSymbol.symbol})
                </h2>
                {currentMarketData && (
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(currentMarketData.price)}
                    </span>
                    <span className={`flex items-center text-sm font-medium ${
                      currentMarketData.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {currentMarketData.changePercent >= 0 ? (
                        <ArrowUpIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 mr-1" />
                      )}
                      {formatCurrency(Math.abs(currentMarketData.change))} 
                      ({formatPercentage(Math.abs(currentMarketData.changePercent))})
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      {formatTimeAgo(currentMarketData.timestamp)}
                    </span>
                  </div>
                )}
              </div>

              {/* Time Range Selector */}
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {TIME_RANGES.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setSelectedTimeRange(range.value)}
                    className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                      selectedTimeRange === range.value
                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="relative h-[500px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : candlestickData.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400">No chart data available</p>
                </div>
              ) : (
                <div className="p-4 h-full">
                  <Line
                    ref={(chart: any) => {
                      if (chart && chart.chartInstance) {
                        chartRef.current = chart.chartInstance;
                      } else if (chart) {
                        chartRef.current = chart;
                      }
                    }}
                    data={chartData}
                    options={chartOptions}
                    key={`${selectedSymbol.symbol}-${selectedTimeRange}-${candlestickData.length}`}
                  />
                </div>
              )}
            </div>

            {/* Chart Stats */}
            {candlestickData.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Period High</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(Math.max(...candlestickData.map(d => d.high)))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Period Low</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(Math.min(...candlestickData.map(d => d.low)))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Volume</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {Math.floor(candlestickData.reduce((sum, d) => sum + d.volume, 0) / candlestickData.length).toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Data Points</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {candlestickData.length}
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