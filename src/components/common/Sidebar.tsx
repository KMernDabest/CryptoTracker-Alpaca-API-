import React from 'react';
import {
  HomeIcon,
  ChartPieIcon,
  ChartBarIcon,
  BellAlertIcon,
  CogIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  WalletIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useLocation } from 'react-router-dom';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  current?: boolean;
  badge?: number;
}

const navigation: SidebarItem[] = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Portfolio', href: '/portfolio', icon: WalletIcon },
  { name: 'Markets', href: '/markets', icon: ChartBarIcon },
  { name: 'Watchlist', href: '/watchlist', icon: EyeIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartPieIcon },
  { name: 'Alerts', href: '/alerts', icon: BellAlertIcon, badge: 3 },
  { name: 'Trading', href: '/trading', icon: ArrowTrendingUpIcon },
];

const quickActions = [
  { name: 'Favorites', href: '/favorites', icon: StarIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isCollapsed = false }: SidebarProps) {
  const location = useLocation();

  return (
    <div
      className={classNames(
        'flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo Section */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
              CryptoTracker
            </span>
          </div>
        )}
        {isCollapsed && (
          <ChartBarIcon className="h-8 w-8 text-blue-600 mx-auto" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isCurrent = location.pathname === item.href;
          return (
            <a
              key={item.name}
              href={item.href}
              className={classNames(
                isCurrent
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 border-r-2 border-blue-600'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
                'group flex items-center px-3 py-2 text-sm font-medium rounded-l-md transition-colors relative'
              )}
            >
              <item.icon
                className={classNames(
                  isCurrent 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300',
                  'flex-shrink-0 h-5 w-5',
                  isCollapsed ? 'mx-auto' : 'mr-3'
                )}
                aria-hidden="true"
              />
              {!isCollapsed && (
                <>
                  {item.name}
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {isCollapsed && item.badge && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </a>
          );
        })}
      </nav>

      {/* Market Summary Widget */}
      {!isCollapsed && (
        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Market Overview
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 dark:text-gray-400">S&P 500</span>
                <div className="text-right">
                  <div className="text-xs font-medium text-gray-900 dark:text-white">4,527.12</div>
                  <div className="text-xs text-green-600">+0.85%</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 dark:text-gray-400">Bitcoin</span>
                <div className="text-right">
                  <div className="text-xs font-medium text-gray-900 dark:text-white">$43,567</div>
                  <div className="text-xs text-green-600">+2.34%</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 dark:text-gray-400">Ethereum</span>
                <div className="text-right">
                  <div className="text-xs font-medium text-gray-900 dark:text-white">$2,687</div>
                  <div className="text-xs text-red-600">-0.92%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
        )}
        <div className="space-y-1">
          {quickActions.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={classNames(
                'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors'
              )}
            >
              <item.icon
                className={classNames(
                  'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300',
                  'flex-shrink-0 h-5 w-5',
                  isCollapsed ? 'mx-auto' : 'mr-3'
                )}
                aria-hidden="true"
              />
              {!isCollapsed && item.name}
            </a>
          ))}
        </div>
      </div>

      {/* User Stats */}
      {!isCollapsed && (
        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Portfolio Value
                </div>
                <div className="text-lg font-bold text-green-600">
                  $47,823.45
                </div>
                <div className="text-xs text-green-600">
                  +$1,234.56 (+2.65%) today
                </div>
              </div>
              <div className="h-10 w-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                <ArrowTrendingUpIcon className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collapse Toggle (for desktop) */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
        <button
          className="w-full flex items-center justify-center p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={classNames(
              'h-4 w-4 transition-transform',
              isCollapsed ? 'rotate-180' : ''
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}