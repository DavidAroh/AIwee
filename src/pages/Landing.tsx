import { Link } from 'react-router-dom';
import { ShieldAlert, Smartphone, Radio, MapPin, Activity, Zap, ArrowRight, Shield, Users, CheckCircle2 } from 'lucide-react';

const STATS = [
  { value: '2,400+', label: 'Verified Incidents' },
  { value: '98.2%', label: 'Uptime' },
  { value: '4.1min', label: 'Avg. Verify Time' },
  { value: '14k+', label: 'Active Citizens' },
];

const FEATURES = [
  { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/10', title: 'AI-Powered Triage', desc: 'Gemini multimodal analysis classifies and scores every report in seconds.' },
  { icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10', title: 'Crowd Verification', desc: 'Corroborating reports from nearby citizens boost confidence scores automatically.' },
  { icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10', title: 'Privacy First', desc: 'No facial recognition, no biometric storage, no individual tracking — ever.' },
  { icon: Activity, color: 'text-purple-400', bg: 'bg-purple-400/10', title: 'Live Command Room', desc: 'Operators monitor a real-time map with severity heatmaps and one-click dispatch.' },
];

function StatPulse() {
  return (
    <div className="relative flex items-center justify-center w-6 h-6">
      <span className="absolute inline-flex h-full w-full rounded-full bg-blue-600 opacity-40 animate-ping" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600" />
    </div>
  );
}

export default function Landing() {

  return (
    <div className="min-h-screen bg-gradient-radial-emerald text-slate-900 overflow-x-hidden" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 glass border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">AiWee</span>
          </div>
          <div className="flex items-center gap-3">
            <StatPulse />
            <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Live · Port Harcourt</span>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 flex flex-col lg:flex-row items-center gap-16">

        {/* Left copy */}
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-500 text-sm font-semibold animate-fade-in">
            <Radio className="w-4 h-4 animate-pulse" />
            AI-Powered Civic Safety — Rivers State
          </div>

          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-none animate-fade-in delay-100">
            Safer Cities<br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-500 via-teal-300 to-cyan-400">
              Start With You
            </span>
          </h1>

          <p className="text-lg text-slate-500 max-w-lg leading-relaxed animate-fade-in delay-200">
            AiWee lets Port Harcourt citizens report emergencies in seconds. Our Gemini AI verifies,
            scores, and routes every incident to the right responders — automatically.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in delay-300">
            <Link
              to="/citizen"
              id="cta-citizen"
              className="group flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:scale-[1.03] active:scale-[0.98]"
            >
              <Smartphone className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Citizen App
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/control"
              id="cta-control"
              className="group flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-900 font-bold text-lg hover:bg-slate-100 transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              <ShieldAlert className="w-5 h-5 group-hover:text-orange-400 transition-colors" />
              Control Room
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 animate-fade-in delay-400">
            {STATS.map((s, i) => (
              <div key={i} className="glass rounded-2xl p-4 text-center metric-card">
                <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Phone mock */}
        <div className="shrink-0 animate-float delay-200">
          <div className="phone-shadow w-72 h-[580px] rounded-[3rem] bg-slate-100 border border-slate-200 overflow-hidden relative">
            {/* Status bar */}
            <div className="h-10 bg-slate-100/80 flex items-center justify-between px-5 pt-1">
              <span className="text-[10px] font-bold text-slate-500">9:41 AM</span>
              <div className="flex gap-1">
                <div className="w-4 h-2 border border-slate-400 rounded-sm relative">
                  <div className="absolute inset-0.5 right-1 bg-blue-600 rounded-[1px]" />
                </div>
              </div>
            </div>
            {/* Mock app content */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-slate-900">AiWee</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-200 rounded-full px-2.5 py-1">
                  <span className="text-[10px] text-slate-700 font-medium">Map</span>
                  <span className="text-[10px] text-slate-500 font-medium">Feed</span>
                </div>
              </div>
              {/* Map placeholder */}
              <div className="h-48 rounded-2xl bg-[#1a2535] relative overflow-hidden border border-slate-200">
                <div className="absolute inset-0 opacity-20"
                  style={{backgroundImage: 'linear-gradient(#2a3845 1px, transparent 1px), linear-gradient(90deg, #2a3845 1px, transparent 1px)', backgroundSize: '20px 20px'}} />
                <MapPin className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600 drop-shadow-lg" />
                {/* Incident dots */}
                <div className="absolute top-8 left-12 w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50">
                  <div className="absolute inset-0 rounded-full bg-red-500 animate-ping-slow opacity-60" />
                </div>
                <div className="absolute bottom-10 right-16 w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50" />
                <div className="absolute top-20 right-8 w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50">
                  <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping-slow opacity-60 delay-300" />
                </div>
                {/* Overlay card */}
                <div className="absolute top-3 left-3 right-3 glass rounded-xl p-2.5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Active Incidents</p>
                    <p className="text-sm font-extrabold text-slate-900">3</p>
                  </div>
                </div>
              </div>
              {/* Feed cards */}
              {[
                { type: 'Fire', color: 'bg-red-500', label: 'text-red-400', time: '2m ago', desc: 'Fire outbreak at Diobu Market' },
                { type: 'Flood', color: 'bg-blue-500', label: 'text-blue-400', time: '15m ago', desc: 'Flooding at Rumuigbo junction' },
              ].map((item, i) => (
                <div key={i} className="bg-slate-200/60 border border-slate-300/40 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${item.label} bg-current/10 px-2 py-0.5 rounded-md`}
                      style={{ backgroundColor: `${item.color.replace('bg-', '')}20` }}
                    >{item.type}</span>
                    <span className="text-[9px] text-slate-500">{item.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-snug">{item.desc}</p>
                </div>
              ))}
            </div>
            {/* Bottom nav */}
            <div className="absolute bottom-0 left-0 right-0 h-16 glass border-t border-slate-200 flex items-center justify-around px-4">
              {['Home', 'Report', 'Alerts', 'Profile'].map((label, i) => (
                <div key={label} className={`flex flex-col items-center gap-1 ${i === 0 ? 'text-blue-500' : 'text-slate-400'}`}>
                  <div className="w-4 h-4 rounded bg-current opacity-50" />
                  <span className="text-[8px] font-semibold">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Built for Real Emergencies</h2>
          <p className="text-slate-500 max-w-xl mx-auto">Every feature was designed with Port Harcourt's unique urban challenges in mind.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className={`glass rounded-2xl p-6 space-y-4 metric-card animate-fade-in`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className={`w-11 h-11 ${f.bg} rounded-xl flex items-center justify-center`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trust bar ── */}
      <section className="border-t border-slate-200 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-slate-500 font-medium">No personal data sold or shared</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-slate-500 font-medium">Open-source AI constraints</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-slate-500 font-medium">Human-approved dispatch only</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-slate-500 font-medium">Powered by Google Gemini</span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-slate-500">AiWee MVP v1.0 — Port Harcourt, Rivers State</span>
          </div>
          <span className="text-xs text-slate-400">Built with Gemini AI</span>
        </div>
      </footer>
    </div>
  );
}
