import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Home, Bell, User } from "lucide-react";
import { cn } from "../../lib/utils";
import { useIncidentStore } from "../../store/useIncidentStore";
import { useLiveData } from "../../hooks/useLiveData";
import CitizenHome from "./CitizenHome";
import CitizenReport from "./CitizenReport";
import CitizenAlerts from "./CitizenAlerts";
import CitizenProfile from "./CitizenProfile";

export default function CitizenApp() {
  // Fetch live data at the app-layout level so it runs on ALL pages
  useLiveData();
  const location = useLocation();
  const alerts = useIncidentStore((s) => s.alerts);
  const dismissedAlerts = useIncidentStore((s) => s.dismissedAlerts);
  const unreadCount = alerts.filter(
    (a) => !a.read && !dismissedAlerts.includes(a.id),
  ).length;

  const isActive = (path: string) =>
    path === "/citizen"
      ? location.pathname === path
      : location.pathname.startsWith(path);

  // Each regular nav item
  const NAV_ITEMS = [
    { path: "/citizen", icon: Home, label: "Home" },
    { path: "/citizen/alerts", icon: Bell, label: "Alerts" },
    { path: "/citizen/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen phone-shadow relative flex flex-col overflow-hidden">
        {/* Page content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <Routes>
            <Route path="/" element={<CitizenHome />} />
            <Route path="/report" element={<CitizenReport />} />
            <Route path="/alerts" element={<CitizenAlerts />} />
            <Route path="/profile" element={<CitizenProfile />} />
          </Routes>
        </div>

        {/* ── Floating Island Bottom Nav ──────────────────────────────────────── */}
        <nav className="fixed bottom-6 lg:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md z-[5000] flex justify-center pointer-events-none px-4">
          <div className="bg-slate-100 backdrop-blur-2xl border border-slate-200 rounded-full p-1.5 shadow-2xl pointer-events-auto flex items-center gap-1.5">
            {/* Regular Nav Items Mapped */}
            {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
              // Special case for Alerts badge
              const isAlerts = path === "/citizen/alerts";
              const active = isActive(path);

              return (
                <React.Fragment key={path}>
                  <Link
                    to={path}
                    className={cn(
                      "relative flex items-center justify-center h-12 transition-all duration-500 ease-out rounded-full overflow-hidden",
                      active
                        ? "px-[18px] bg-slate-200/80"
                        : "w-12 hover:bg-slate-200/40",
                    )}
                  >
                    <Icon
                      size={20}
                      strokeWidth={active ? 2.5 : 2}
                      className={cn(
                        "shrink-0 transition-colors",
                        active ? "text-blue-500" : "text-slate-500",
                      )}
                    />

                    {/* Expanding Label */}
                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-500 ease-out flex items-center",
                        active
                          ? "max-w-[80px] opacity-100 ml-2.5"
                          : "max-w-0 opacity-0 ml-0",
                      )}
                    >
                      <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
                        {label}
                      </span>
                    </div>

                    {/* Alerts Badge */}
                    {!active && isAlerts && unreadCount > 0 && (
                      <span className="absolute top-2.5 right-2.5 min-w-[14px] h-[14px] bg-red-500 rounded-full text-[8.5px] font-black text-white flex items-center justify-center px-[3px] shadow-sm">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                </React.Fragment>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
