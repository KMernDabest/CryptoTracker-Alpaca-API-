import { useEffect, useRef } from 'react';
import { useMarketStore } from '../stores/marketStore';
import { websocketService } from '../services/websocket';
import { MarketData } from '../types';

export function useMarketData() {
  const { 
    setMarketData, 
    setConnected, 
    setLoading, 
    setError, 
    isConnected,
    marketData 
  } = useMarketStore();
  
  // Use ref to prevent double initialization in React StrictMode
  const initializedRef = useRef(false);
  const handlersSetupRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initializedRef.current) {
      console.log('🔄 useMarketData: Already initialized, skipping...');
      return;
    }
    
    console.log('🚀 useMarketData: Initializing hook...');
    console.log('📊 useMarketData: Current market data count:', Object.keys(marketData).length);
    
    initializedRef.current = true;
    setLoading(true);

    const handleConnected = () => {
      console.log('✅ useMarketData: WebSocket connected');
      setConnected(true);
      setLoading(false);
      setError(null);
    };

    const handleDisconnected = () => {
      console.log('❌ useMarketData: WebSocket disconnected');
      setConnected(false);
      setLoading(false);
    };

    const handlePriceUpdate = (data: MarketData) => {
      console.log('💹 useMarketData: Received price update for:', data.symbol, '$' + data.price.toFixed(2));
      setMarketData(data.symbol, data);
    };

    const handleError = (error: string) => {
      console.log('❌ useMarketData: WebSocket error:', error);
      setError(error);
      setLoading(false);
    };

    // Only set up event listeners once
    if (!handlersSetupRef.current) {
      console.log('🎯 useMarketData: Setting up event listeners...');
      websocketService.on('connected', handleConnected);
      websocketService.on('disconnected', handleDisconnected);
      websocketService.on('priceUpdate', handlePriceUpdate);
      websocketService.on('error', handleError);
      handlersSetupRef.current = true;
    }

    // Ensure connection is established
    websocketService.ensureConnection();

    // Subscribe to only reliable symbols that work with Alpaca API
    console.log('🔗 useMarketData: Current connection status:', isConnected);
    const defaultSymbols = [
      // Reliable stock symbols
      'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'AMD', 'SPY',
      // Only working crypto symbols
      'BTC/USD', 'ETH/USD'
    ];
    
    console.log('📡 useMarketData: Subscribing to symbols:', defaultSymbols);
    websocketService.subscribe(defaultSymbols);

    // Cleanup function
    return () => {
      console.log('🧹 useMarketData: Cleanup function called');
      // Note: We keep the connection alive and only clean up on actual component unmount
      // The singleton websocket service will manage the connection lifecycle
      if (handlersSetupRef.current) {
        websocketService.off('connected', handleConnected);
        websocketService.off('disconnected', handleDisconnected);
        websocketService.off('priceUpdate', handlePriceUpdate);
        websocketService.off('error', handleError);
        handlersSetupRef.current = false;
      }
      initializedRef.current = false;
    };
  }, []); // Empty dependency array - setters are stable, prevent re-runs

  // Subscribe to a specific symbol
  const subscribeToSymbol = (symbol: string) => {
    console.log('📡 useMarketData: Subscribing to symbol:', symbol);
    websocketService.subscribe([symbol]);
  };

  // Unsubscribe from a specific symbol
  const unsubscribeFromSymbol = (symbol: string) => {
    console.log('🔕 useMarketData: Unsubscribing from symbol:', symbol);
    websocketService.unsubscribe([symbol]);
  };

  return {
    subscribeToSymbol,
    unsubscribeFromSymbol,
    isConnected,
    marketData: Object.fromEntries(marketData)
  };
}