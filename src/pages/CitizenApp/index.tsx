import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, PlusCircle, Bell, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIncidentStore } from '../../store/useIncidentStore';
import CitizenHome from './CitizenHome';
import CitizenReport from './CitizenReport';
import CitizenAlerts from './CitizenAlerts';
import CitizenProfile from './CitizenProfile';

const NAV_ITEMS = [
  { path: '/citizen',         icon: Home,       label: 'Home' },
  { path: '/citizen/report',  icon: PlusCircle, label: 'Report' },
  { path: '/citizen/alerts',  icon: Bell,       label: 'Alerts' },
  { path: '/citizen/profile', icon: User,       label: 'Profile' },
];

export default function CitizenApp() {
  const location = useLocation();
  const alerts = useIncidentStore((s) => s.alerts);

  return (
    <div className="min-h-screen bg-zinc-950 flex justify-center">
      <div className="w-full max-w-md bg-[#0B1121] min-h-screen phone-shadow relative flex flex-col overflow-hidden">

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
          <Routes>
            <Route path="/"        element={<CitizenHome />} />
            <Route path="/report"  element={<CitizenReport />} />
            <Route path="/alerts"  element={<CitizenAlerts />} />
            <Route path="/profile" element={<CitizenProfile />} />
          </Routes>
        </div>

        {/* Bottom Nav */}
        <nav className="absolute bottom-0 w-full bg-[#0B1121]/95 backdrop-blur-xl border-t border-white/5 flex justify-around items-center py-2.5 pb-safe z-30">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/citizen' && location.pathname.startsWith(item.path));
            const hasBadge = item.path === '/citizen/alerts' && alerts.length > 0;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-1.5 px-4 rounded-2xl transition-all',
                  isActive ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-emerald-500/8 rounded-2xl" />
                )}
                <div className="relative">
                  <Icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-110')} />
                  {hasBadge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-extrabold text-white flex items-center justify-center">
                      {alerts.length > 9 ? '9+' : alerts.length}
                    </span>
                  )}
                </div>
                <span className={cn('text-[9px] font-semibold tracking-wide transition-colors', isActive ? 'text-emerald-400' : '')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
