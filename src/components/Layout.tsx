import React, { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { LayoutDashboard, BookOpen, FileText, Settings, PieChart, Receipt, LogOut, Package } from 'lucide-react';
import { cn } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export function Layout() {
  const { company, logout } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, shortcut: 'Alt+D' },
    { name: 'Ledgers', path: '/ledgers', icon: BookOpen, shortcut: 'Alt+L' },
    { name: 'Inventory', path: '/inventory', icon: Package, shortcut: 'Alt+I' },
    { name: 'Vouchers', path: '/vouchers', icon: Receipt, shortcut: 'Alt+V' },
    { name: 'Day Book', path: '/daybook', icon: FileText, shortcut: 'Alt+B' },
    { name: 'Reports', path: '/reports', icon: PieChart, shortcut: 'Alt+R' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'd': e.preventDefault(); navigate('/'); break;
          case 'l': e.preventDefault(); navigate('/ledgers'); break;
          case 'i': e.preventDefault(); navigate('/inventory'); break;
          case 'v': e.preventDefault(); navigate('/vouchers'); break;
          case 'b': e.preventDefault(); navigate('/daybook'); break;
          case 'r': e.preventDefault(); navigate('/reports'); break;
          case 's': e.preventDefault(); navigate('/settings'); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="flex h-screen w-full bg-zinc-50 font-sans text-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-zinc-200/80 bg-white flex flex-col shadow-sm z-10">
        <div className="flex h-16 items-center border-b border-zinc-200/80 px-6">
          <div className="flex items-center gap-2.5 font-bold text-lg tracking-tight font-display">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white shadow-sm shadow-zinc-900/20">
              N
            </div>
            NUMERA
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-6 px-4 py-3.5 bg-zinc-50/80 rounded-xl border border-zinc-200/60 shadow-sm">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Current Company</p>
            <p className="font-semibold text-sm text-zinc-900">{company?.name}</p>
            <p className="text-xs text-zinc-500 mt-0.5 font-medium">FY: {company?.financialYearStart}</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group',
                    isActive 
                      ? 'bg-zinc-900 text-white shadow-sm shadow-zinc-900/10' 
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn("h-4 w-4 transition-colors", isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-600")} />
                    {item.name}
                  </div>
                  <span className={cn(
                    "text-[10px] font-mono border rounded px-1.5 py-0.5 transition-colors",
                    isActive ? "border-zinc-700 text-zinc-300" : "border-zinc-200 text-zinc-400 bg-white"
                  )}>{item.shortcut}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="p-4 border-t border-zinc-200/80 space-y-1 bg-zinc-50/50">
          <Link to="/settings" className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-all duration-200 group">
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
              Settings
            </div>
            <span className="text-[10px] text-zinc-400 font-mono border border-zinc-200 bg-white rounded px-1.5 py-0.5">Alt+S</span>
          </Link>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 group">
            <LogOut className="h-4 w-4 text-red-400 group-hover:text-red-600 transition-colors" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-50/50">
        <header className="h-16 flex items-center justify-between border-b border-zinc-200/80 bg-white/80 backdrop-blur-md px-8 sticky top-0 z-10">
          <h1 className="text-xl font-bold font-display tracking-tight text-zinc-900">
            {navItems.find(i => i.path === location.pathname)?.name || (location.pathname === '/settings' ? 'Settings' : 'NUMERA')}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-zinc-500 bg-zinc-100/80 px-3 py-1.5 rounded-full border border-zinc-200/50 shadow-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
