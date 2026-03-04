/**
 * AiWee Control Room — redesigned after OPENWATCH concept
 *
 * Layout: [Left filters] | [Map] | [Detail panel*] | [Right intel feed]
 * *Detail panel slides in between map and feed when an incident is selected
 */
import { useState, useEffect } from 'react';
import { useIncidentStore, type Incident } from '../../store/useIncidentStore';
import { useLiveData } from '../../hooks/useLiveData';
import { LiveBadge } from '../../components/LiveBadge';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
import MapView from '../../components/Map';
import {
  X, Send, CheckCircle2, CheckSquare,
  Star, GitBranch, Archive, Shuffle,
} from 'lucide-react';

// ── Incident type palette ──────────────────────────────────────────────────────
const TYPE_CFG: Record<string, { hex: string; bg: string; label: string }> = {
  Fire:     { hex: '#ef4444', bg: 'bg-red-500/15 text-red-400 border-red-500/30',     label: 'Fire'     },
  Accident: { hex: '#f59e0b', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'Accident' },
  Crime:    { hex: '#ec4899', bg: 'bg-pink-500/15 text-pink-400 border-pink-500/30',   label: 'Crime'    },
  Medical:  { hex: '#10b981', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Medical' },
  Flood:    { hex: '#06b6d4', bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',   label: 'Flood'    },
  Other:    { hex: '#8b5cf6', bg: 'bg-violet-500/15 text-violet-400 border-violet-500/30', label: 'Other' },
};

const statusOf = (i: Incident) => {
  if (i.status === 'CLOSED')    return 'Archived';
  if (i.status === 'VERIFIED')  return 'Confirmed';
  if (i.severityScore >= 8)     return 'Breaking';
  return 'Developing';
};

const STATUS_CFG = {
  Breaking:   { color: 'text-red-400',    dot: 'bg-red-500',     icon: Star        },
  Developing: { color: 'text-amber-400',  dot: 'bg-amber-500',   icon: GitBranch   },
  Confirmed:  { color: 'text-emerald-400',dot: 'bg-emerald-500', icon: CheckCircle2},
  Archived:   { color: 'text-slate-500',  dot: 'bg-slate-600',   icon: Archive     },
};

// ─────────────────────────────────────────────────────────────────────────────
// INCIDENT DETAIL PANEL
// ─────────────────────────────────────────────────────────────────────────────
function DetailPanel({
  incident,
  onClose,
}: {
  incident: Incident;
  onClose: () => void;
}) {
  const { verifyIncident, closeIncident, addAlert } = useIncidentStore();
  const [dispatched, setDispatched] = useState(false);
  const status  = statusOf(incident);
  const cfg     = TYPE_CFG[incident.type] ?? TYPE_CFG.Other;
  const sCfg    = STATUS_CFG[status as keyof typeof STATUS_CFG];
  const isLive  = (incident as any).source === 'live';
  const coords  = `${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`;
  const sources = incident.corroboratingEvidence?.length
    ? incident.corroboratingEvidence
    : ['AI Feed — Gemini analysis with Google Search grounding'];

  return (
    <div className="w-[340px] shrink-0 flex flex-col bg-[#0c1220] border-l border-[#1e2d40] overflow-hidden animate-fade-in-left">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d40] shrink-0">
        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Incident Detail</span>
        <button
          onClick={onClose}
          className="text-[10px] font-semibold text-slate-500 hover:text-slate-200 uppercase tracking-widest flex items-center gap-1 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Close
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar text-[11px] text-slate-300">

        {/* Type / Status / Priority badges */}
        <div className="px-4 py-3 flex flex-wrap gap-1.5 border-b border-[#1e2d40]">
          <span className={cn('px-2.5 py-1 rounded font-bold text-[10px] uppercase border', cfg.bg)}>
            ● {incident.type}
          </span>
          <span className={cn('px-2.5 py-1 rounded font-bold text-[10px] uppercase border', sCfg.color,
            status === 'Confirmed' ? 'border-emerald-500/30 bg-emerald-500/10'
            : status === 'Breaking' ? 'border-red-500/30 bg-red-500/10'
            : 'border-amber-500/30 bg-amber-500/10'
          )}>
            ● {status.toUpperCase()}
          </span>
          <span className={cn('px-2.5 py-1 rounded font-bold text-[10px] uppercase border',
            incident.severityScore >= 8 ? 'text-red-400 border-red-500/30 bg-red-500/10'
            : incident.severityScore >= 5 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
            : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
          )}>
            ● {incident.severityScore >= 8 ? 'CRITICAL' : incident.severityScore >= 5 ? 'HIGH' : 'LOW'}
          </span>
          {isLive && (
            <span className="px-2.5 py-1 rounded font-bold text-[10px] uppercase border text-teal-400 border-teal-500/30 bg-teal-500/10">
              ⚡ LIVE
            </span>
          )}
        </div>

        <div className="divide-y divide-[#1e2d40]">
          {/* LOCATION */}
          <section className="px-4 py-3 space-y-1">
            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Location</h4>
            <p className="font-semibold text-slate-200">{incident.cues[0] ?? 'Port Harcourt'}</p>
            <p className="text-slate-400">Port Harcourt, Rivers State</p>
            <p className="text-slate-600 font-mono text-[10px]">{coords}</p>
          </section>

          {/* SUMMARY */}
          <section className="px-4 py-3 space-y-1.5">
            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Summary</h4>
            <p className="text-slate-300 leading-relaxed">{incident.summary || incident.description}</p>
          </section>

          {/* CASUALTIES */}
          <section className="px-4 py-3">
            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Casualties</h4>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Persons affected</span>
              <span className="text-slate-200 font-bold">{incident.reportersCount} Report{incident.reportersCount !== 1 ? 's' : ''}</span>
            </div>
          </section>

          {/* AI ANALYSIS */}
          <section className="px-4 py-3 space-y-2">
            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">AI Analysis</h4>
            <div>
              <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-1">Key Indicators</p>
              <div className="flex flex-wrap gap-1">
                {incident.cues.slice(0, 5).map((c, i) => (
                  <span key={i} className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded text-[9px] font-semibold">{c}</span>
                ))}
              </div>
            </div>
            {incident.nearbyPlaces && incident.nearbyPlaces.length > 0 && (
              <div className="mt-2">
                <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-1">Nearby Services</p>
                <div className="flex flex-wrap gap-1">
                  {incident.nearbyPlaces.slice(0, 3).map((p, i) => (
                    <span key={i} className="bg-blue-900/30 border border-blue-700/30 text-blue-400 px-2 py-0.5 rounded text-[9px] font-semibold">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SOURCES */}
          <section className="px-4 py-3 space-y-2">
            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Sources ({sources.length})
            </h4>
            {sources.map((src, i) => (
              <div key={i} className="bg-[#111827] border border-[#1e2d40] rounded-lg p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                    {i === 0 ? 'Gemini AI' : 'Source ' + (i + 1)}
                  </span>
                  <span className="text-[9px] text-slate-600">Tier A</span>
                </div>
                <p className="text-slate-400 leading-relaxed line-clamp-2">{src}</p>
              </div>
            ))}
          </section>

          {/* INTELLIGENCE */}
          <section className="px-4 py-3 space-y-2.5">
            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Intelligence</h4>
            <div>
              <div className="flex justify-between text-[9px] mb-1.5">
                <span className="text-slate-500">Confidence</span>
                <span className="font-bold text-emerald-400">{incident.confidenceScore}%</span>
              </div>
              <div className="h-1 bg-[#1e2d40] rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-700"
                  style={{
                    width: `${incident.confidenceScore}%`,
                    background: incident.confidenceScore >= 70 ? '#10b981' : incident.confidenceScore >= 40 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between text-[9px]">
              <span className="text-slate-500">AI Label</span>
              <span className={cn('font-bold uppercase tracking-wider', sCfg.color)}>{status}</span>
            </div>
          </section>

          {/* TIMELINE */}
          <section className="px-4 py-3 space-y-1.5">
            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Timeline</h4>
            {[
              { label: 'Incident Time', value: format(new Date(incident.timestamp), 'dd MMM yyyy, HH:mm') + ' WAT' },
              { label: 'First Report',  value: formatDistanceToNow(new Date(incident.timestamp), { addSuffix: true }) },
              { label: 'Severity',      value: `${incident.severityScore} / 10` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span className="text-slate-300 font-medium">{value}</span>
              </div>
            ))}
          </section>
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 p-3 border-t border-[#1e2d40] space-y-2">
        <button
          onClick={() => { addAlert({ incidentId: incident.id, type: 'URGENT', message: `⚠ ${incident.type} alert — ${incident.cues[0] ?? 'Port Harcourt'}. Avoid area, emergency services en route.`, radiusKm: 3 }); setDispatched(true); }}
          disabled={dispatched}
          className={cn(
            'w-full py-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-2 transition-all',
            dispatched
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
              : 'bg-red-600 text-white hover:bg-red-500 shadow shadow-red-600/20'
          )}
        >
          {dispatched ? <><CheckCircle2 className="w-3.5 h-3.5" /> Alert Dispatched</> : <><Send className="w-3.5 h-3.5" /> Dispatch Alert</>}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => verifyIncident(incident.id)} className="py-2 rounded-lg text-[10px] font-bold bg-[#1e2d40] border border-[#2d3f55] text-slate-300 hover:bg-[#2d3f55] transition-all flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Verify
          </button>
          <button onClick={() => { closeIncident(incident.id); onClose(); }} className="py-2 rounded-lg text-[10px] font-bold bg-[#1e2d40] border border-[#2d3f55] text-slate-300 hover:bg-[#2d3f55] transition-all flex items-center justify-center gap-1.5">
            <CheckSquare className="w-3 h-3 text-blue-400" /> Resolve
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEL FEED (right panel)
// ─────────────────────────────────────────────────────────────────────────────
function IntelFeed({
  incidents,
  selected,
  onSelect,
}: {
  incidents: Incident[];
  selected: Incident | null;
  onSelect: (i: Incident) => void;
}) {
  const [timeFilter, setTimeFilter] = useState<'24H' | '48H' | '7D' | 'ALL'>('48H');

  const now = Date.now();
  const filtered = incidents.filter((i) => {
    if (i.status === 'CLOSED') return false;
    const ms = now - new Date(i.timestamp).getTime();
    if (timeFilter === '24H') return ms < 86_400_000;
    if (timeFilter === '48H') return ms < 172_800_000;
    if (timeFilter === '7D')  return ms < 604_800_000;
    return true;
  });

  return (
    <div className="w-[300px] shrink-0 flex flex-col bg-[#080f1a] border-l border-[#1e2d40]">
      {/* Feed header */}
      <div className="px-4 py-2.5 border-b border-[#1e2d40] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">Intel Feed</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping absolute opacity-60" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 relative" />
            </span>
            <span className="text-[9px] text-emerald-400 font-bold">LIVE</span>
          </div>
          <span className="text-[9px] text-slate-500 font-medium">{filtered.length} EVENTS</span>
        </div>
        {/* Time filters */}
        <div className="flex gap-1">
          {(['24H', '48H', '7D', 'ALL'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeFilter(t)}
              className={cn(
                'px-2 py-0.5 rounded text-[9px] font-bold transition-all',
                timeFilter === t
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Feed items */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#1e2d40]">
        {filtered.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-8">No events in this window.</p>
        )}
        {filtered.map((inc) => {
          const cfg   = TYPE_CFG[inc.type] ?? TYPE_CFG.Other;
          const stat  = statusOf(inc);
          const sCfg  = STATUS_CFG[stat as keyof typeof STATUS_CFG];
          const isLive = (inc as any).source === 'live';
          const isSelected = selected?.id === inc.id;

          return (
            <button
              key={inc.id}
              onClick={() => onSelect(inc)}
              className={cn(
                'w-full text-left px-4 py-3 space-y-1.5 transition-colors',
                isSelected ? 'bg-[#1a2940]' : 'hover:bg-[#0f1929]'
              )}
            >
              {/* Row 1: type + time */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.hex }} />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: cfg.hex }}>
                    {inc.type}
                  </span>
                  {isLive && (
                    <span className="text-[8px] font-bold text-teal-400 bg-teal-400/10 border border-teal-400/20 px-1 rounded">⚡</span>
                  )}
                </div>
                <span className="text-[9px] text-slate-600">
                  {formatDistanceToNow(new Date(inc.timestamp), { addSuffix: false })} ago
                </span>
              </div>

              {/* Row 2: location */}
              <p className="text-[10px] text-slate-400 font-medium">{inc.cues[0] ?? 'Port Harcourt'}</p>

              {/* Row 3: summary */}
              <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
                {inc.summary || inc.description}
              </p>

              {/* Row 4: badges */}
              <div className="flex items-center gap-2">
                <span className={cn('text-[9px] font-bold uppercase', sCfg.color)}>{stat}</span>
                <span className="text-[9px] text-slate-600">
                  CONF {inc.confidenceScore}%
                </span>
                <span className="text-[9px] text-slate-600">
                  SRC {inc.corroboratingEvidence?.length ?? 1}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
// ── Simulate helper — realistic Port Harcourt incidents for demo ────────────
const SIM_POOL = [
  { type: 'Accident' as const, desc: 'Multi-vehicle collision at Trans-Amadi roundabout — two lanes blocked.', lat: 4.830, lng: 7.030, sev: 8, conf: 72, cues: ['Trans-Amadi', 'collision', 'traffic blocked', 'injuries reported'] },
  { type: 'Fire'     as const, desc: 'Market stall fire at Mile 1 — spreading to adjacent stalls.',           lat: 4.800, lng: 6.975, sev: 9, conf: 84, cues: ['Mile 1 Market', 'flames', 'market', 'evacuation'] },
  { type: 'Flood'    as const, desc: 'Flash flooding at D-Line after heavy rainfall — road impassable.',      lat: 4.820, lng: 7.015, sev: 6, conf: 90, cues: ['D-Line', 'flooding', 'waterlogged', 'drainage'] },
  { type: 'Crime'    as const, desc: 'Armed robbery at ATM on Rumuola Road — suspect fled on motorcycle.',     lat: 4.815, lng: 7.043, sev: 8, conf: 65, cues: ['Rumuola Road', 'armed robbery', 'motorcycle', 'ATM'] },
  { type: 'Medical'  as const, desc: 'Pedestrian struck by vehicle at Eleme Junction — unconscious.',         lat: 4.773, lng: 7.091, sev: 10, conf: 81, cues: ['Eleme Junction', 'pedestrian hit', 'unconscious', 'ambulance'] },
  { type: 'Other'    as const, desc: 'Gas pipeline leak in Woji residential area — strong odour reported.',    lat: 4.839, lng: 7.025, sev: 7, conf: 76, cues: ['Woji', 'gas leak', 'pipeline', 'residential'] },
];

export default function Dashboard() {
  const incidents = useIncidentStore((s) => s.incidents);
  const addIncident = useIncidentStore((s) => s.addIncident);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [simFlash, setSimFlash] = useState(false);

  const simulateIncident = () => {
    const pick = SIM_POOL[Math.floor(Math.random() * SIM_POOL.length)];
    addIncident({
      type: pick.type,
      description: pick.desc,
      latitude: pick.lat + (Math.random() - 0.5) * 0.01,
      longitude: pick.lng + (Math.random() - 0.5) * 0.01,
      severityScore: pick.sev,
      confidenceScore: pick.conf,
      summary: `[SIM] ${pick.desc}`,
      cues: pick.cues,
      source: 'citizen',
    });
    setSimFlash(true);
    setTimeout(() => setSimFlash(false), 1500);
  };

  const { status: liveStatus, refresh } = useLiveData();

  // Clock
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1_000);
    return () => clearInterval(id);
  }, []);

  // Keep selected in sync with store
  useEffect(() => {
    if (selected) {
      const updated = incidents.find((i) => i.id === selected.id);
      setSelected(updated ?? null);
    }
  }, [incidents]);

  const active = incidents.filter((i) => i.status !== 'CLOSED');

  // ── Threat level ──────────────────────────────────────────────────────────
  const avgSev  = active.length ? active.reduce((s, i) => s + i.severityScore, 0) / active.length : 0;
  const threatScore = Math.round(avgSev * 10);
  const threatLevel = threatScore >= 70 ? 'HIGH' : threatScore >= 40 ? 'MED' : 'LOW';
  const threatColor = threatScore >= 70 ? '#ef4444' : threatScore >= 40 ? '#f59e0b' : '#10b981';

  // ── Type counts ───────────────────────────────────────────────────────────
  const typeCounts = Object.keys(TYPE_CFG).reduce<Record<string, number>>((acc, t) => {
    acc[t] = active.filter((i) => i.type === t).length;
    return acc;
  }, {});

  // ── Status counts ─────────────────────────────────────────────────────────
  const statusCounts = {
    Breaking:   active.filter((i) => statusOf(i) === 'Breaking').length,
    Developing: active.filter((i) => statusOf(i) === 'Developing').length,
    Confirmed:  active.filter((i) => statusOf(i) === 'Confirmed').length,
    Archived:   incidents.filter((i) => i.status === 'CLOSED').length,
  };

  // ── Filtered for map ──────────────────────────────────────────────────────
  const displayedIncidents = active.filter((i) => {
    if (typeFilter   && i.type          !== typeFilter)         return false;
    if (statusFilter && statusOf(i)     !== statusFilter)       return false;
    return true;
  });

  return (
    <div className="flex flex-col h-screen bg-[#080f1a] text-slate-300 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── TOP HEADER ──────────────────────────────────────────────────── */}
      <header className="h-10 shrink-0 flex items-center justify-between px-4 border-b border-[#1e2d40] bg-[#0a1220]">
        {/* Left: brand + region + live + threat */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#F97316] rounded flex items-center justify-center text-white font-extrabold text-[10px]">Ai</div>
            <span className="text-slate-300 text-[11px] font-bold uppercase tracking-widest">AIWEE</span>
            <span className="text-slate-600 text-[10px]">v1.0</span>
          </div>
          <div className="h-4 w-px bg-[#1e2d40]" />
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-slate-500 uppercase tracking-widest">Region</span>
            <span className="text-slate-200 font-bold uppercase tracking-wider">Port Harcourt</span>
          </div>
          <div className="h-4 w-px bg-[#1e2d40]" />
          <LiveBadge status={liveStatus} onRefresh={refresh} compact />
          <div className="h-4 w-px bg-[#1e2d40]" />
          {/* Threat badge */}
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider"
            style={{ color: threatColor, borderColor: `${threatColor}40`, background: `${threatColor}15` }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: threatColor }} />
            THREAT {threatLevel} {threatScore}
          </div>
        </div>

        {/* Right: stats + clock */}
        <div className="flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-4">
            {[
              { label: 'INCIDENTS', value: active.length },
              { label: 'ACTIVE',    value: active.filter(i => i.status !== 'VERIFIED').length },
              { label: 'VERIFIED',  value: active.filter(i => i.status === 'VERIFIED').length },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <span className="text-slate-500 uppercase tracking-widest">{label} </span>
                <span className="text-slate-100 font-bold">{value}</span>
              </div>
            ))}
          </div>
          <div className="h-4 w-px bg-[#1e2d40]" />
          <div className="text-slate-400 text-[10px]">
            {format(currentTime, 'EEE, dd MMM yyyy').toUpperCase()}
          </div>
          <div className="text-slate-200 font-mono font-bold text-[12px] tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {format(currentTime, 'HH:mm:ss')} WAT
          </div>
          <div className="h-4 w-px bg-[#1e2d40]" />
          {/* Simulate button */}
          <button
            onClick={simulateIncident}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold border uppercase tracking-wider transition-all',
              simFlash
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-[#1e2d40] text-slate-400 border-[#2d3f55] hover:text-slate-200 hover:bg-[#2d3f55]'
            )}
          >
            <Shuffle className="w-3 h-3" />
            {simFlash ? 'Spawned!' : 'Simulate'}
          </button>
        </div>
      </header>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT SIDEBAR — types + status filters */}
        <aside className="w-48 shrink-0 bg-[#080f1a] border-r border-[#1e2d40] overflow-y-auto custom-scrollbar">
          <div className="p-3 space-y-4">

            {/* TYPE filters */}
            <div>
              <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Types {Object.keys(TYPE_CFG).length}
              </h3>
              <div className="space-y-0.5">
                {Object.entries(TYPE_CFG).map(([type, cfg]) => {
                  const count = typeCounts[type] ?? 0;
                  const active = typeFilter === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(active ? null : type)}
                      className={cn(
                        'w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] transition-all',
                        active ? 'bg-[#1e2d40]' : 'hover:bg-[#0f1929]'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.hex }} />
                        <span className={active ? 'text-slate-200 font-semibold' : 'text-slate-400'}>{type}</span>
                      </div>
                      {count > 0 && (
                        <span className={cn(
                          'text-[10px] font-bold tabular-nums',
                          active ? 'text-slate-200' : 'text-slate-500'
                        )}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-[#1e2d40]" />

            {/* STATUS filters */}
            <div>
              <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Status 4
              </h3>
              <div className="space-y-0.5">
                {Object.entries(STATUS_CFG).map(([stat, cfg]) => {
                  const count = statusCounts[stat as keyof typeof statusCounts];
                  const Icon  = cfg.icon;
                  const isActive = statusFilter === stat;
                  return (
                    <button
                      key={stat}
                      onClick={() => setStatusFilter(isActive ? null : stat)}
                      className={cn(
                        'w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] transition-all',
                        isActive ? 'bg-[#1e2d40]' : 'hover:bg-[#0f1929]'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={cn('w-3 h-3 shrink-0', cfg.color)} />
                        <span className={isActive ? 'text-slate-200 font-semibold' : 'text-slate-400'}>{stat}</span>
                      </div>
                      {count > 0 && (
                        <span className={cn('text-[10px] font-bold tabular-nums', cfg.color)}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brief / Threat summary */}
            <div className="h-px bg-[#1e2d40]" />
            <div className="space-y-2">
              <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Threat Summary</h3>
              <div className="bg-[#0f1929] border border-[#1e2d40] rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-500">Avg Severity</span>
                  <span className="font-bold" style={{ color: threatColor }}>{avgSev.toFixed(1)} / 10</span>
                </div>
                <div className="h-1 bg-[#1e2d40] rounded overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${avgSev * 10}%`, background: threatColor }} />
                </div>
                <p className="text-[9px] text-slate-600 leading-relaxed mt-1">
                  {active.length} active incident{active.length !== 1 ? 's' : ''} across Port Harcourt.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER: MAP */}
        <div className="flex-1 relative overflow-hidden min-w-0">
          <MapView
            center={[4.8156, 7.0498]}
            zoom={13}
            height="100%"
          />

          {/* Severity overlay — top right */}
          <div className="absolute top-3 right-3 z-400 flex gap-2">
            {[
              { label: 'Urgent', value: active.filter(i => i.severityScore >= 8).length, color: 'text-red-400' },
              { label: 'Medium', value: active.filter(i => i.severityScore >= 5 && i.severityScore < 8).length, color: 'text-amber-400' },
              { label: 'Low',    value: active.filter(i => i.severityScore < 5).length, color: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="glass rounded-lg px-3 py-2 text-center pointer-events-none">
                <p className={cn('text-xl font-extrabold', s.color)}>{s.value}</p>
                <p className="text-[8px] text-slate-400 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Legend — bottom left */}
          <div className="absolute bottom-3 left-3 z-400">
            <div className="glass rounded-lg p-2.5 space-y-1.5">
              <h4 className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Severity</h4>
              {[
                ['bg-red-500',     'Critical — Sev 8+'],
                ['bg-amber-500',   'High — Sev 5–7'],
                ['bg-emerald-500', 'Low — Sev 1–4'],
              ].map(([dot, label]) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full shrink-0', dot)} />
                  <span className="text-[9px] text-slate-300">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* "Today's Brief" ticker — bottom center */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-400">
            <div className="glass rounded-lg px-4 py-2 flex items-center gap-3 max-w-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
              <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Today's Brief</span>
              <span className="text-[9px] text-slate-300 truncate">
                {displayedIncidents[0]?.summary?.slice(0, 55) ?? 'No active incidents.'} …
              </span>
            </div>
          </div>
        </div>

        {/* INCIDENT DETAIL (slides in when selected) */}
        {selected && (
          <DetailPanel
            incident={selected}
            onClose={() => setSelected(null)}
          />
        )}

        {/* RIGHT: INTEL FEED */}
        <IntelFeed
          incidents={incidents}
          selected={selected}
          onSelect={(inc) => setSelected(selected?.id === inc.id ? null : inc)}
        />
      </div>

      {/* ── BOTTOM BAR ───────────────────────────────────────────────────── */}
      <footer className="h-7 shrink-0 border-t border-[#1e2d40] bg-[#0a1220] flex items-center justify-between px-4 text-[9px]">
        {/* Left: quick stats */}
        <div className="flex items-center gap-4 text-slate-500">
          <span className="text-slate-600 font-bold">48H</span>
          {[
            ['INCIDENTS', active.length],
            ['ACTIVE', active.filter(i => i.status !== 'VERIFIED').length],
            ['LIVE FEED', active.filter(i => (i as any).source === 'live').length],
          ].map(([l, v]) => (
            <span key={l as string}><span className="text-slate-500">{l} </span><span className="text-slate-300 font-bold">{v}</span></span>
          ))}
          <span className="w-px h-4 bg-[#1e2d40]" />
          <span className="text-slate-600 font-bold">TOTAL</span>
          <span><span className="text-slate-500">ALL</span> <span className="text-slate-300 font-bold">{incidents.length}</span></span>
        </div>

        {/* Right: type counts */}
        <div className="flex items-center gap-3">
          {Object.entries(TYPE_CFG).filter(([t]) => typeCounts[t] > 0).map(([type, cfg]) => (
            <span key={type} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: cfg.hex }} />
              <span className="text-slate-500">{type}</span>
              <span className="text-slate-300 font-bold">{typeCounts[type]}</span>
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
