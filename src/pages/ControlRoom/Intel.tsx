/**
 * Control Room — Intelligence Page
 * AI confidence breakdown, source analysis, verification timeline, type distribution
 */
import { useMemo } from 'react';
import { useIncidentStore } from '../../store/useIncidentStore';
import { formatDistanceToNow } from 'date-fns';
import { Zap, Users, Shield, TrendingUp, Clock, BarChart2, Activity } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  Fire: '#ef4444', Accident: '#f59e0b', Crime: '#ec4899',
  Medical: '#10b981', Flood: '#06b6d4', Other: '#8b5cf6',
};

export default function Intel() {
  const { incidents, alerts } = useIncidentStore();

  const totalActive = incidents.filter((i) => i.status !== 'CLOSED');
  const verified    = totalActive.filter((i) => i.status === 'VERIFIED');
  const unverified  = totalActive.filter((i) => i.status === 'UNVERIFIED');
  const citizen     = totalActive.filter((i) => (i as any).source === 'citizen' || !(i as any).source);
  const live        = totalActive.filter((i) => (i as any).source === 'live');

  const avgConf = totalActive.length
    ? Math.round(totalActive.reduce((s, i) => s + i.confidenceScore, 0) / totalActive.length)
    : 0;

  const avgSev = totalActive.length
    ? (totalActive.reduce((s, i) => s + i.severityScore, 0) / totalActive.length).toFixed(1)
    : '0.0';

  // Type distribution
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inc of totalActive) {
      counts[inc.type] = (counts[inc.type] ?? 0) + 1;
    }
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [totalActive]);

  // Confidence distribution buckets
  const confBuckets = useMemo(() => [
    { label: 'High (70–100%)', count: totalActive.filter(i => i.confidenceScore >= 70).length, color: '#10b981' },
    { label: 'Medium (40–69%)', count: totalActive.filter(i => i.confidenceScore >= 40 && i.confidenceScore < 70).length, color: '#f59e0b' },
    { label: 'Low (0–39%)', count: totalActive.filter(i => i.confidenceScore < 40).length, color: '#ef4444' },
  ], [totalActive]);

  const maxConfCount = Math.max(...confBuckets.map(b => b.count), 1);

  // Severity distribution buckets
  const sevBuckets = useMemo(() => [
    { label: 'Critical (8–10)', count: totalActive.filter(i => i.severityScore >= 8).length, color: '#ef4444' },
    { label: 'High (5–7)',      count: totalActive.filter(i => i.severityScore >= 5 && i.severityScore < 8).length, color: '#f59e0b' },
    { label: 'Low (1–4)',       count: totalActive.filter(i => i.severityScore < 5).length, color: '#10b981' },
  ], [totalActive]);

  const maxSevCount = Math.max(...sevBuckets.map(b => b.count), 1);

  // Last 10 alerts as timeline
  const recentAlerts = alerts.slice(0, 10);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 text-slate-300">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-indigo-500/15 rounded-xl border border-indigo-500/25">
          <Activity className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-white tracking-tight">Intelligence Analytics</h2>
          <p className="text-xs text-slate-500">AI confidence · source breakdown · verification metrics</p>
        </div>
      </div>

      {/* ── KPI grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Active',     value: totalActive.length, color: 'text-white',       icon: BarChart2, iconColor: 'text-slate-400' },
          { label: 'Verified',         value: verified.length,    color: 'text-emerald-400', icon: Shield,    iconColor: 'text-emerald-400' },
          { label: 'Avg Confidence',   value: `${avgConf}%`,      color: 'text-blue-400',    icon: Zap,       iconColor: 'text-blue-400' },
          { label: 'Avg Severity',     value: avgSev,             color: 'text-amber-400',   icon: TrendingUp,iconColor: 'text-amber-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{kpi.label}</p>
              <kpi.icon className={`w-4 h-4 ${kpi.iconColor}`} />
            </div>
            <p className={`text-2xl font-extrabold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* ── Confidence distribution ───────────────────────────────────── */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">AI Confidence</h3>
          </div>
          <div className="space-y-2.5">
            {confBuckets.map((b) => (
              <div key={b.label} className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">{b.label}</span>
                  <span className="font-bold" style={{ color: b.color }}>{b.count}</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(b.count / maxConfCount) * 100}%`, background: b.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Severity distribution ─────────────────────────────────────── */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Severity Levels</h3>
          </div>
          <div className="space-y-2.5">
            {sevBuckets.map((b) => (
              <div key={b.label} className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">{b.label}</span>
                  <span className="font-bold" style={{ color: b.color }}>{b.count}</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(b.count / maxSevCount) * 100}%`, background: b.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Source breakdown ──────────────────────────────────────────── */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Source Breakdown</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Citizen Reports', count: citizen.length, color: '#10b981', pct: totalActive.length ? Math.round(citizen.length / totalActive.length * 100) : 0 },
              { label: 'AI Live Feed',    count: live.length,    color: '#3b82f6', pct: totalActive.length ? Math.round(live.length / totalActive.length * 100) : 0 },
            ].map((s) => (
              <div key={s.label} className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">{s.label}</span>
                  <span className="font-bold" style={{ color: s.color }}>{s.count} ({s.pct}%)</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-700/40 space-y-1">
              {[
                { label: 'Verified',   count: verified.length,   color: '#10b981' },
                { label: 'Unverified', count: unverified.length, color: '#f59e0b' },
              ].map((s) => (
                <div key={s.label} className="flex justify-between text-[10px]">
                  <span className="text-slate-400">{s.label}</span>
                  <span className="font-bold" style={{ color: s.color }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Incident type distribution ──────────────────────────────────── */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Incident Type Distribution</h3>
        </div>
        {typeCounts.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">No incidents recorded.</p>
        ) : (
          <div className="flex items-end gap-3 h-24 pt-2">
            {typeCounts.map(([type, count]) => {
              const maxCount = Math.max(...typeCounts.map(([, c]) => c), 1);
              const pct = (count / maxCount) * 100;
              return (
                <div key={type} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[9px] font-bold" style={{ color: TYPE_COLORS[type] }}>{count}</span>
                  <div className="w-full rounded-t-md transition-all duration-700" style={{
                    height: `${pct * 0.7}px`, minHeight: 4,
                    background: TYPE_COLORS[type], opacity: 0.8,
                  }} />
                  <span className="text-[8px] text-slate-500 font-semibold">{type}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Alert timeline ──────────────────────────────────────────────── */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recent Alert Timeline</h3>
        </div>
        {recentAlerts.length === 0 ? (
          <p className="text-xs text-slate-500">No alerts dispatched yet.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {recentAlerts.map((alert) => {
              const typeColor =
                alert.type === 'URGENT'        ? '#ef4444' :
                alert.type === 'CAUTIONARY'    ? '#f59e0b' :
                alert.type === 'VERIFICATION'  ? '#3b82f6' : '#71717a';

              const inc = useIncidentStore.getState().incidents.find(i => i.id === alert.incidentId);

              return (
                <div key={alert.id} className="flex items-start gap-3 py-2 border-b border-slate-700/30 last:border-0">
                  <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: typeColor }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: typeColor }}>{alert.type}</span>
                      {inc && <span className="text-[9px] text-slate-500">{inc.type}</span>}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed truncate">{alert.message}</p>
                  </div>
                  <span className="text-[9px] text-slate-600 shrink-0">{formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
