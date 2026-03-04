import { useState, useEffect } from 'react';
import { useIncidentStore, type Incident } from '../../store/useIncidentStore';
import MapView from '../../components/Map';
import { LiveBadge } from '../../components/LiveBadge';
import { useLiveData } from '../../hooks/useLiveData';
import { ShieldAlert, MapPin, Clock, Users, Zap, ChevronDown, Check, X as XIcon, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';

const TYPE_CONFIG: Record<string, { bg: string; text: string; dot: string; hex: string }> = {
  Accident: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-500', hex: '#f59e0b' },
  Fire:     { bg: 'bg-red-500/15',   text: 'text-red-400',   dot: 'bg-red-500',   hex: '#ef4444' },
  Crime:    { bg: 'bg-pink-500/15',  text: 'text-pink-400',  dot: 'bg-pink-500',  hex: '#ec4899' },
  Medical:  { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-500', hex: '#10b981' },
  Flood:    { bg: 'bg-cyan-500/15',  text: 'text-cyan-400',  dot: 'bg-cyan-500',  hex: '#06b6d4' },
  Other:    { bg: 'bg-zinc-700/40',  text: 'text-zinc-300',  dot: 'bg-zinc-500',  hex: '#8b5cf6' },
};

// ── Bottom drawer: incident detail ────────────────────────────────────────────
function IncidentDrawer({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const { confirmIncident } = useIncidentStore();
  const [voted, setVoted] = useState<'yes' | 'no' | null>(null);
  const cfg = TYPE_CONFIG[incident.type] ?? TYPE_CONFIG.Other;
  const isLive = (incident as any).source === 'live';

  const vote = (choice: 'yes' | 'no') => {
    setVoted(choice);
    confirmIncident(incident.id, choice === 'yes');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 z-40 animate-fade-in"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-[#111827] border-t border-zinc-700/60 rounded-t-3xl animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        <div className="px-5 pt-2 pb-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border', cfg.bg, cfg.text)}>
                ● {incident.type}
              </span>
              {incident.status === 'VERIFIED' && (
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">✓ Verified</span>
              )}
              {isLive && (
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-teal-500/10 text-teal-400 border-teal-500/30 animate-pulse">⚡ LIVE</span>
              )}
            </div>
            <button onClick={onClose}>
              <ChevronDown className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          {/* Summary */}
          <p className="text-zinc-200 text-sm leading-relaxed">{incident.summary || incident.description}</p>

          {/* Confidence bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">
              <span>AI Confidence</span>
              <span style={{ color: incident.confidenceScore >= 70 ? '#10b981' : incident.confidenceScore >= 40 ? '#f59e0b' : '#ef4444' }}>
                {incident.confidenceScore}%
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${incident.confidenceScore}%`,
                  background: incident.confidenceScore >= 70 ? '#10b981' : incident.confidenceScore >= 40 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Severity', value: `${incident.severityScore}/10`, color: incident.severityScore >= 8 ? 'text-red-400' : incident.severityScore >= 5 ? 'text-amber-400' : 'text-emerald-400' },
              { label: 'Reports', value: incident.reportersCount.toString(), color: 'text-blue-400' },
              { label: 'Status', value: incident.status, color: incident.status === 'VERIFIED' ? 'text-emerald-400' : 'text-amber-400' },
            ].map((m) => (
              <div key={m.label} className="bg-zinc-800/50 rounded-xl p-2.5 text-center">
                <p className={cn('text-base font-extrabold', m.color)}>{m.value}</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Location & time */}
          <div className="flex items-center gap-4 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{incident.cues[0] ?? 'Port Harcourt'}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(incident.timestamp), { addSuffix: true })}</span>
          </div>

          {/* Cues */}
          {incident.cues.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {incident.cues.slice(1, 6).map((c) => (
                <span key={c} className="bg-zinc-800 border border-zinc-700 text-zinc-400 text-[9px] font-semibold px-2 py-0.5 rounded-md">{c}</span>
              ))}
            </div>
          )}

          {/* Timeline */}
          {incident.statusHistory && incident.statusHistory.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Timeline</h4>
              <div className="space-y-1">
                {incident.statusHistory.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <div className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                      h.status === 'VERIFIED' ? 'bg-emerald-500' : h.status === 'CLOSED' ? 'bg-zinc-500' : 'bg-amber-500')} />
                    <span className="text-zinc-500">{formatDistanceToNow(new Date(h.timestamp), { addSuffix: true })}</span>
                    <span className="text-zinc-400 font-semibold">{h.note ?? h.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Crowd confirm CTA — only for unverified */}
          {incident.status === 'UNVERIFIED' && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-400 font-medium text-center">Can you confirm this incident?</p>
              {voted ? (
                <div className={cn('py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border',
                  voted === 'yes' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-zinc-700/40 text-zinc-400 border-zinc-600')}>
                  {voted === 'yes' ? <><Check className="w-3.5 h-3.5" /> Confirmed — helps verify this report</> : <><XIcon className="w-3.5 h-3.5" /> Marked as unconfirmed</>}
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => vote('yes')} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 py-3 rounded-xl text-xs font-bold hover:bg-emerald-500/25 active:scale-[0.98] transition-all">
                    <Check className="w-4 h-4" /> YES
                  </button>
                  <button onClick={() => vote('no')} className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 text-zinc-400 border border-zinc-700 py-3 rounded-xl text-xs font-bold hover:bg-zinc-700 active:scale-[0.98] transition-all">
                    <XIcon className="w-4 h-4" /> NO
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CitizenHome() {
  const incidents = useIncidentStore((s) => s.incidents);
  const [activeTab, setActiveTab] = useState<'map' | 'feed'>('map');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([4.8156, 7.0498]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const { status: liveStatus, refresh } = useLiveData();

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        setMapCenter(loc);
      },
      () => console.warn('Geolocation denied — using Port Harcourt centre'),
    );
  }, []);

  const activeIncidents = incidents.filter((i) => i.status !== 'CLOSED');
  const verified        = activeIncidents.filter((i) => i.status === 'VERIFIED').length;
  const liveCount       = activeIncidents.filter((i) => (i as any).source === 'live').length;

  return (
    <div className="flex flex-col h-full relative">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="glass sticky top-0 z-20 px-4 py-3 border-b border-white/5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/30">
              <ShieldAlert className="w-4 h-4 text-zinc-950" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none tracking-tight">AiWee</h1>
              <p className="text-[10px] text-zinc-500 leading-none mt-0.5">Port Harcourt</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-800/80 rounded-full p-1">
            {(['map', 'feed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-xs font-semibold transition-all capitalize',
                  activeTab === tab ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200',
                )}
              >{tab}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
          <LiveBadge status={liveStatus} onRefresh={refresh} />
          {liveCount > 0 && (
            <div className="flex items-center gap-1 text-[9px] text-emerald-400 font-semibold">
              <Zap className="w-3 h-3" /> {liveCount} AI-sourced
            </div>
          )}
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto relative">
        {activeTab === 'map' ? (
          <div className="h-[calc(100vh-150px)] w-full relative">
            <MapView
              center={mapCenter}
              zoom={13}
              height="100%"
              userLocation={userLocation}
            />

            {/* Stat overlays */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 z-500 pointer-events-none">
              <div className="glass rounded-xl px-3 py-2.5 text-right pointer-events-auto animate-fade-in-scale">
                <p className="text-[9px] text-zinc-400 font-semibold uppercase tracking-widest">Active</p>
                <p className="text-xl font-extrabold text-white leading-tight">{activeIncidents.length}</p>
              </div>
              <div className="glass rounded-xl px-3 py-2.5 text-right pointer-events-auto animate-fade-in-scale delay-100">
                <p className="text-[9px] text-zinc-400 font-semibold uppercase tracking-widest">Verified</p>
                <p className="text-xl font-extrabold text-emerald-400 leading-tight">{verified}</p>
              </div>
            </div>

            {/* Active incident ticker — bottom of map */}
            {activeIncidents.length > 0 && !selectedIncident && (
              <button
                onClick={() => setSelectedIncident(activeIncidents[0])}
                className="absolute bottom-3 left-3 right-16 z-500 glass rounded-xl px-3 py-2.5 flex items-center gap-2 border border-white/5 hover:border-white/10 transition-all animate-fade-in"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="flex-1 text-left overflow-hidden">
                  <span className="text-[10px] text-zinc-300 font-semibold block truncate">{activeIncidents[0].summary || activeIncidents[0].description}</span>
                  <span className="text-[9px] text-zinc-600">{activeIncidents[0].type} · Tap to view</span>
                </div>
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {activeIncidents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500 animate-fade-in">
                <ShieldAlert className="w-12 h-12 opacity-15 mb-3" />
                <p className="text-sm font-medium">All clear — no active incidents.</p>
              </div>
            )}

            {activeIncidents.map((incident, idx) => {
              const cfg = TYPE_CONFIG[incident.type] ?? TYPE_CONFIG.Other;
              const isLive = (incident as any).source === 'live';

              return (
                <div
                  key={incident.id}
                  onClick={() => setSelectedIncident(incident)}
                  className="bg-zinc-800/60 border border-zinc-700/40 rounded-2xl p-4 space-y-3 animate-slide-up hover:border-zinc-600/60 hover:bg-zinc-800/80 transition-all cursor-pointer active:scale-[0.99]"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />
                      <span className={cn('px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider', cfg.bg, cfg.text)}>
                        {incident.type}
                      </span>
                      {incident.status === 'VERIFIED' && (
                        <span className="badge-verified px-2 py-0.5 rounded-lg text-[10px] font-bold">✓ Verified</span>
                      )}
                      {isLive && (
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-[10px] font-bold animate-pulse">⚡ LIVE</span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(incident.timestamp), { addSuffix: true })}
                    </span>
                  </div>

                  <p className="text-zinc-200 text-sm leading-relaxed line-clamp-2">
                    {incident.summary || incident.description}
                  </p>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">
                      <span>AI Confidence</span><span>{incident.confidenceScore}%</span>
                    </div>
                    <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${incident.confidenceScore}%`,
                          background: incident.confidenceScore > 70 ? '#10b981' : incident.confidenceScore > 40 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-700/40">
                    <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                      <MapPin className="w-3 h-3" />{incident.cues[0] ?? 'Port Harcourt'}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                      <Users className="w-3 h-3" />{incident.reportersCount} report{incident.reportersCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Incident detail bottom drawer ─────────────────────────────── */}
      {selectedIncident && (
        <div className="absolute inset-0 z-40 pointer-events-auto">
          <IncidentDrawer
            incident={selectedIncident}
            onClose={() => setSelectedIncident(null)}
          />
        </div>
      )}
    </div>
  );
}
