import React, { useState } from 'react';
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
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { MarketTrend } from './charts/MarketTrend';

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  changeValue?: string;
  icon: React.ComponentType<any>;
  color?: 'green' | 'red' | 'blue' | 'purple';
}

function StatCard({ title, value, change, changeValue, icon: Icon, color = 'blue' }: StatCardProps) {
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
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
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

interface MarketItemProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: string;
}

function MarketItem({ symbol, name, price, change, changePercent }: MarketItemProps) {
  const isPositive = change >= 0;

  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
      <div className="flex items-center">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
          {symbol.charAt(0)}
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{symbol}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {formatCurrency(price)}
        </p>
        <div className="flex items-center justify-end">
          {isPositive ? (
            <ArrowUpIcon className="h-3 w-3 text-green-500 mr-1" />
          ) : (
            <ArrowDownIcon className="h-3 w-3 text-red-500 mr-1" />
          )}
          <span
            className={`text-xs font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatPercentage(Math.abs(changePercent))}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isConnected, getAllMarketData } = useMarketStore();
  // Initialize market data hook for WebSocket connection
  useMarketData();
  const [timeRange, setTimeRange] = useState('1D');

  // Get live market data from Alpaca
  const liveMarketData = getAllMarketData();
  const hasLiveData = liveMarketData.length > 0;

  // Real portfolio data will be implemented when needed

  // Symbol name mapping for display
  const symbolNames: { [key: string]: string } = {
    'AAPL': 'Apple Inc.',
    'GOOGL': 'Alphabet Inc.',
    'MSFT': 'Microsoft Corp.',
    'TSLA': 'Tesla Inc.',
    'AMZN': 'Amazon.com Inc.',
    'BTC/USD': 'Bitcoin',
    'ETH/USD': 'Ethereum',
    'SOL/USD': 'Solana',
    'ADA/USD': 'Cardano',
    'NVDA': 'NVIDIA Corp.',
    'META': 'Meta Platforms Inc.'
  };

  // Debug information
  console.log('🎯 Dashboard render - isConnected:', isConnected, 'hasLiveData:', hasLiveData, 'liveMarketData count:', liveMarketData.length);
  liveMarketData.forEach(data => {
    console.log(`📈 Live data: ${data.symbol} = $${data.price} (${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(2)}%)`);
  });

  // Use only real-time Alpaca data
  const displayData = liveMarketData.slice(0, 8).map(data => ({
    symbol: data.symbol,
    name: symbolNames[data.symbol] || data.symbol,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    volume: data.volume?.toString() || '0'
  }));

  const timeRanges = ['1D', '1W', '1M', '3M', '6M', '1Y'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back! Here's your portfolio overview.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
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
        <h3 className="font-bold mb-2">🔍 Debug Information</h3>
        <div className="space-y-1">
          <div>Connection Status: <span className={isConnected ? 'text-green-600' : 'text-red-600'}>{isConnected ? 'Connected ✅' : 'Disconnected ❌'}</span></div>
          <div>Live Data Count: <span className="text-blue-600">{liveMarketData.length}</span></div>
          <div>Display Data Count: <span className="text-purple-600">{displayData.length}</span></div>
          <div>Timestamp: <span className="text-gray-600">{new Date().toLocaleTimeString()}</span></div>
          {liveMarketData.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold">Sample Live Data:</div>
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
        />
      </div>

      {/* Charts and Market Data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio Chart */}
        <div className="lg:col-span-2">
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

        {/* Top Movers */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top Movers
            </h2>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All
            </button>
          </div>
          
          <div className="space-y-2">
            {displayData.length > 0 ? (
              displayData.map((item) => (
                <MarketItem key={item.symbol} {...item} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="animate-pulse">
                  <div className="text-lg mb-2">📡 Connecting to Alpaca Markets</div>
                  <div className="text-sm">Waiting for real-time market data...</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Live data status */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${hasLiveData ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {hasLiveData ? (
                  <>🔴 Live from Alpaca Markets • {displayData.length} symbols</>
                ) : (
                  <>⏳ Establishing Alpaca connection...</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h2>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All
          </button>
        </div>
        
        <div className="space-y-4">
          {[
            { action: 'Buy', symbol: 'BTC', amount: '0.1234', price: '$43,567', time: '2 minutes ago', type: 'buy' },
            { action: 'Sell', symbol: 'ETH', amount: '2.456', price: '$2,687', time: '1 hour ago', type: 'sell' },
            { action: 'Alert', symbol: 'AAPL', amount: 'Price Alert Triggered', price: '$184.92', time: '3 hours ago', type: 'alert' }
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  activity.type === 'buy' ? 'bg-green-500' :
                  activity.type === 'sell' ? 'bg-red-500' : 'bg-blue-500'
                }`}>
                  {activity.symbol.charAt(0)}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.action} {activity.symbol}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.amount}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {activity.price}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}