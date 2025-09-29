import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { useMarketStore } from './stores/marketStore';
import { websocketService } from './services/websocket';
import { useMarketData } from './hooks/useMarketData';
import Header from './components/common/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AuthPage from './components/AuthPage';
// Import page components
import Portfolio from './pages/Portfolio';
import Watchlist from './pages/Watchlist';
import Markets from './pages/Markets';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
};

// Main Layout Component
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      <Sidebar 
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 h-full">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-900">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

function App() {
  const { isAuthenticated, token, setLoading } = useAuthStore();
  const { setConnected } = useMarketStore();
  
  // Initialize market data connection
  useMarketData();

  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    // Initialize WebSocket connection when authenticated
    if (isAuthenticated && token) {
      setLoading(true);
      
      // Authenticate with the WebSocket service
      websocketService.authenticate(token);
      
      // Listen for connection status
      const handleConnected = () => {
        setConnected(true);
        setLoading(false);
      };

      const handleDisconnected = () => {
        setConnected(false);
      };

      websocketService.on('connect', handleConnected);
      websocketService.on('disconnect', handleDisconnected);

      return () => {
        websocketService.off('connect', handleConnected);
        websocketService.off('disconnect', handleDisconnected);
        websocketService.disconnect();
        setConnected(false);
      };
    }
  }, [isAuthenticated, token, setConnected, setLoading]);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/auth" 
            element={
              isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />
            } 
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/portfolio"
            element={
              <ProtectedRoute>
                <Layout>
                  <Portfolio />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/markets"
            element={
              <ProtectedRoute>
                <Layout>
                  <Markets />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/watchlist"
            element={
              <ProtectedRoute>
                <Layout>
                  <Watchlist />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--toast-bg)',
              color: 'var(--toast-color)',
              borderRadius: '8px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
