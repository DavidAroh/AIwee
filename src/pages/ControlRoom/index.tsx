import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import Dashboard from './Dashboard';
import Intel from './Intel';
import { Activity, Map } from 'lucide-react';

const MOBILE_BREAKPOINT = 768;

export default function ControlRoom() {
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < MOBILE_BREAKPOINT,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    const observer = new ResizeObserver(() => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT));
    observer.observe(document.documentElement);
    window.addEventListener('resize', handleResize);
    return () => { observer.disconnect(); window.removeEventListener('resize', handleResize); };
  }, []);

  if (isMobile) return <Navigate to="/citizen" replace />;

  return (
    <div className="min-h-screen bg-[#0B1121] text-slate-300 font-sans flex flex-col">
      {/* Sub-nav tabs for Desktop Control Room */}
      <div className="flex items-center gap-1 px-4 pt-1 pb-0 border-b border-white/5 bg-[#0B1121] z-50 relative">
        <NavLink
          to="/control"
          end
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              isActive
                ? 'text-emerald-400 border-emerald-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`
          }
        >
          <Map className="w-3.5 h-3.5" /> Dashboard
        </NavLink>
        <NavLink
          to="/control/intel"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              isActive
                ? 'text-indigo-400 border-indigo-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`
          }
        >
          <Activity className="w-3.5 h-3.5" /> Intelligence
        </NavLink>
      </div>

      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/intel" element={<Intel />} />
        </Routes>
      </div>
    </div>
  );
}
