import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, Search, Home, ChevronLeft, ChevronRight, Book } from 'lucide-react';
import SessionHistory from './SessionHistory';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/chat', label: 'Chat Agent', icon: MessageSquare },
    { path: '/research', label: 'Research Agent', icon: Search },
    { path: '/docs', label: 'Docs Agent', icon: Book },
  ];

  return (
    <div className="flex h-screen ghibli-theme" style={{ backgroundColor: 'var(--ghibli-cream)' }}>
      {/* Sidebar Navigation */}
      <div
        className={`${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 flex flex-col ghibli-card`}
        style={{
          backgroundColor: 'var(--ghibli-warm-white)',
          borderRight: '1px solid var(--ghibli-sage)'
        }}
      >
        {/* Header */}
        <div className="p-4" style={{ borderBottom: '1px solid rgba(143, 188, 143, 0.2)' }}>
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-lg font-bold ghibli-heading" style={{ color: 'var(--ghibli-forest)' }}>
                  PortiaAgents
                </h1>
                <p className="text-xs mt-1" style={{ color: 'var(--ghibli-warm-brown)' }}>
                  AI Agents powered by PortiaAI SDK
                </p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-full transition-all duration-200 hover:scale-110"
              style={{
                color: 'var(--ghibli-sage)',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--ghibli-soft-gray)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-3">
            {navItems.map((item) => {
              const Icon = item.icon;

              // Check if current path matches the base path (for session-based URLs)
              const isActive = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path + '/'));

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-2xl transition-all duration-200 ghibli-card-hover ${isActive ? 'font-medium' : ''
                      }`}
                    style={{
                      backgroundColor: isActive ? 'var(--ghibli-sage)' : 'transparent',
                      color: isActive ? 'white' : 'var(--ghibli-forest)',
                    }}
                    title={sidebarCollapsed ? item.label : undefined}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--ghibli-soft-gray)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <SessionHistory type={location.pathname.startsWith('/chat') ? 'chat' : 'research'} />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default Layout;