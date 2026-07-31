/**
 * EmergencyOps — Control Room panel for active personal SOS emergencies.
 *
 * Renders as a red strip over the dashboard map when any SOS is active:
 * level, elapsed time, live movement, battery, GPS accuracy, responder acks,
 * "appears safe" votes, and operator actions (Acknowledge / Resolve — per the
 * spec, only operators close an emergency).
 */
import { useEffect, useState } from "react";
import { Siren, CheckCircle2, UserCheck, BatteryMedium, Crosshair } from "lucide-react";
import { useEmergencyStore, LEVEL_META } from "../../store/useEmergencyStore";
import { cn } from "../../lib/utils";

function Elapsed({ since }: { since: string }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return <span className="tabular-nums font-mono">{mm}:{ss}</span>;
}

export function EmergencyOps() {
  const emergencies = useEmergencyStore((s) => s.emergencies);
  const acknowledge = useEmergencyStore((s) => s.acknowledge);
  const voteSafe = useEmergencyStore((s) => s.voteSafe);
  const resolveEmergency = useEmergencyStore((s) => s.resolveEmergency);

  const active = emergencies.filter((e) => e.status === "ACTIVE");
  if (active.length === 0) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[450] w-[min(560px,90%)] space-y-2">
      {active.map((e) => {
        const meta = LEVEL_META[e.level];
        const last = e.track[e.track.length - 1];
        const speedKmh =
          typeof last?.speed === "number" && last.speed !== null
            ? (last.speed * 3.6).toFixed(0)
            : null;
        const lowered = e.safeVotes >= 2;

        return (
          <div
            key={e.id}
            className={cn(
              "rounded-xl border shadow-xl backdrop-blur-md px-4 py-3 animate-fade-in",
              lowered
                ? "bg-amber-50/95 border-amber-300"
                : "bg-red-50/95 border-red-300",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              {/* Identity */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  lowered ? "bg-amber-500/20" : "bg-red-500/20 animate-pulse",
                )}>
                  <Siren className={cn("w-4 h-4", lowered ? "text-amber-600" : "text-red-600")} />
                </div>
                <div className="min-w-0">
                  <p className={cn("text-[11px] font-black uppercase tracking-wider truncate",
                    lowered ? "text-amber-700" : "text-red-700")}>
                    {meta.emoji} SOS — {meta.label}
                    {e.auto && " · AUTO (timer)"}
                    {e.source === "sim" && " · SIM"}
                    {lowered && " · priority lowered"}
                  </p>
                  <p className="text-[10px] text-slate-600 truncate">
                    {e.note ?? meta.phrase}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => acknowledge(e.id)}
                  title="Acknowledge — responder heading to assist"
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
                >
                  <UserCheck className="w-3 h-3 text-blue-600" /> ACK {e.acks > 0 && e.acks}
                </button>
                <button
                  onClick={() => voteSafe(e.id)}
                  title="Mark: user appears safe (lowers priority at 2+ votes)"
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  SAFE? {e.safeVotes > 0 && e.safeVotes}
                </button>
                <button
                  onClick={() => resolveEmergency(e.id)}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-red-600 text-white hover:bg-red-500 transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" /> RESOLVE
                </button>
              </div>
            </div>

            {/* Telemetry row */}
            <div className="mt-2 pt-2 border-t border-slate-900/10 flex items-center gap-4 text-[10px] text-slate-600">
              <span>⏱ <Elapsed since={e.startedAt} /></span>
              <span className="flex items-center gap-1">
                <Crosshair className="w-3 h-3" />
                {last ? `${last.lat.toFixed(4)}, ${last.lng.toFixed(4)}` : "no fix"}
                {last?.accuracy ? ` ±${Math.round(last.accuracy)}m` : ""}
              </span>
              {speedKmh && <span>🏃 {speedKmh} km/h</span>}
              {typeof e.battery === "number" && (
                <span className="flex items-center gap-1">
                  <BatteryMedium className="w-3 h-3" /> {e.battery}%
                </span>
              )}
              <span>{e.track.length} pts</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
