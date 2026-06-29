import { useState } from 'react';
import {
  Shield, Settings, LogOut, ChevronRight, Star, BarChart2,
  Bell, MapPin, Info, Copy, Check, Sliders,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useIncidentStore } from '../../store/useIncidentStore';

const TRUST_LEVELS = [
  { min: 0,  max: 25,  label: 'Observer',      color: 'text-slate-500',   bar: '#71717a' },
  { min: 25, max: 50,  label: 'Contributor',   color: 'text-blue-400',   bar: '#3b82f6' },
  { min: 50, max: 75,  label: 'Verifier',      color: 'text-blue-500', bar: '#2563eb' },
  { min: 75, max: 101, label: 'Civic Guardian', color: 'text-amber-400',  bar: '#f59e0b' },
];

function getTrustLevel(score: number) {
  return TRUST_LEVELS.find((l) => score >= l.min && score < l.max) ?? TRUST_LEVELS[0];
}

// Settings bottom sheet
function SettingsSheet({ onClose }: { onClose: () => void }) {
  const [radius, setRadius]     = useState(3);
  const [notifyVerif, setVerif] = useState(true);
  const [notifyUrgent, setUrg]  = useState(true);
  const [notifyCaut, setCaut]   = useState(true);
  const [notifyInfo, setInfo]   = useState(false);

  return (
    <>
      <div className="absolute inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 rounded-t-3xl animate-slide-up shadow-2xl">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>
        <div className="px-5 pt-2 pb-8 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">App Settings</h3>
          </div>

          {/* Alert radius */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alert Radius</label>
              <span className="text-sm font-bold text-blue-500">{radius} km</span>
            </div>
            <input
              type="range" min={1} max={10} value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full h-1.5 rounded-full bg-slate-300 outline-none accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-400">
              <span>1 km</span><span>5 km</span><span>10 km</span>
            </div>
          </div>

          {/* Notification toggles */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notification Types</label>
            <div className="bg-slate-200/40 border border-slate-300/40 rounded-2xl overflow-hidden divide-y divide-slate-300/30">
              {[
                { label: 'Verification Requests', sub: 'Help verify nearby reports', val: notifyVerif, set: setVerif, color: 'text-blue-400' },
                { label: 'Urgent Alerts', sub: 'Critical incidents in your area', val: notifyUrgent, set: setUrg, color: 'text-red-400' },
                { label: 'Cautionary Alerts', sub: 'Verified incidents nearby', val: notifyCaut, set: setCaut, color: 'text-amber-400' },
                { label: 'Informational', sub: 'General area updates', val: notifyInfo, set: setInfo, color: 'text-slate-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3.5">
                  <div>
                    <p className={`text-xs font-semibold ${item.color}`}>{item.label}</p>
                    <p className="text-[10px] text-slate-500">{item.sub}</p>
                  </div>
                  <button
                    onClick={() => item.set(!item.val)}
                    className={`w-10 h-5.5 rounded-full relative transition-all ${item.val ? 'bg-blue-600' : 'bg-slate-300'}`}
                    style={{ height: 22, minWidth: 40 }}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${item.val ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 active:scale-[0.98] transition-all"
          >
            Save Settings
          </button>
        </div>
      </div>
    </>
  );
}

export default function CitizenProfile() {
  const { sessionId, sessionReports, sessionVerifications, incidents } = useIncidentStore();
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  // Compute trust score from session actions
  const trustScore = Math.min(100, sessionReports * 5 + sessionVerifications * 2 + 10);
  const trustLevel = getTrustLevel(trustScore);

  const copyId = () => {
    navigator.clipboard.writeText(sessionId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const MENU_ITEMS = [
    { icon: Bell,       label: 'Notifications',    sub: `${sessionVerifications} verifications cast`, action: () => setShowSettings(true) },
    { icon: MapPin,     label: 'Coverage Area',     sub: 'Port Harcourt · 3 km radius', action: () => setShowSettings(true) },
    { icon: BarChart2,  label: 'Impact Report',     sub: `${sessionReports} reports · ${sessionVerifications} verifications` },
    { icon: Shield,     label: 'Privacy & Data',    sub: 'Anonymous by default · No ID required' },
    { icon: Star,       label: 'Rate AiWee',        sub: 'Help us improve' },
    { icon: Info,       label: 'About AiWee',       sub: 'v1.0 · Civic incident platform · Port Harcourt' },
  ];

  return (
    <div className="h-full flex flex-col relative">
      <header className="glass sticky top-0 z-10 px-4 py-3.5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Profile</h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Anonymous citizen account</p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-xl bg-slate-200/60 border border-slate-300/40 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">

        {/* Avatar card */}
        <div className="bg-slate-200/50 border border-slate-300/40 rounded-2xl p-5 flex flex-col items-center text-center gap-4 animate-fade-in-scale">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-blue-600/30 to-blue-500/30 border-2 border-slate-400 flex items-center justify-center">
              <span className="text-3xl">🎭</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full border-2 border-slate-100 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </div>

          <div>
            <h2 className="text-base font-extrabold text-slate-900">Anonymous Citizen</h2>
            <button
              onClick={copyId}
              className="flex items-center gap-1.5 mx-auto mt-1 text-[10px] text-slate-500 font-mono hover:text-slate-700 transition-colors"
            >
              ID: {sessionId}
              {copied ? <Check className="w-3 h-3 text-blue-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          {/* Stats row */}
          <div className="w-full grid grid-cols-3 gap-2 pt-3 border-t border-slate-300/40">
            {[
              { value: sessionReports,       label: 'Reports',       color: 'text-blue-500' },
              { value: sessionVerifications, label: 'Verifications', color: 'text-blue-400'    },
              { value: incidents.filter(i => i.status !== 'CLOSED').length, label: 'Active',  color: 'text-amber-400' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-100/60 rounded-xl p-2.5 text-center">
                <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5 font-semibold">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Trust score bar */}
          <div className="w-full space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-500 font-medium">Civic Trust Score</span>
              <span className={`font-extrabold ${trustLevel.color}`}>{trustLevel.label} · {trustScore}/100</span>
            </div>
            <div className="h-2 bg-slate-300 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${trustScore}%`, background: trustLevel.bar }}
              />
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="space-y-1 animate-fade-in delay-200">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1 pb-1">Account</h3>
          <div className="bg-slate-200/40 border border-slate-300/40 rounded-2xl overflow-hidden divide-y divide-slate-300/30">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="w-full flex items-center justify-between p-3.5 hover:bg-slate-300/20 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-300/50 rounded-xl flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    <p className="text-[10px] text-slate-500">{item.sub}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Exit */}
        <div className="pb-2 animate-fade-in delay-300">
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/8 border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/15 hover:border-red-500/30 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Exit App
          </Link>
        </div>
      </main>

      {/* Settings sheet */}
      {showSettings && (
        <div className="absolute inset-0 z-40 pointer-events-auto">
          <SettingsSheet onClose={() => setShowSettings(false)} />
        </div>
      )}
    </div>
  );
}
