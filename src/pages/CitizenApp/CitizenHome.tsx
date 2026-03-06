import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useIncidentStore, type Incident } from "../../store/useIncidentStore";
import MapView from "../../components/Map";
import { LiveBadge } from "../../components/LiveBadge";
import { useLiveData } from "../../hooks/useLiveData";
import {
  ShieldAlert,
  MapPin,
  Clock,
  Users,
  Zap,
  ChevronDown,
  Check,
  X as XIcon,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../../lib/utils";

const TYPE_CONFIG: Record<
  string,
  { bg: string; text: string; dot: string; hex: string }
> = {
  Accident: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    dot: "bg-amber-500",
    hex: "#f59e0b",
  },
  Fire: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    dot: "bg-red-500",
    hex: "#ef4444",
  },
  Crime: {
    bg: "bg-pink-500/15",
    text: "text-pink-400",
    dot: "bg-pink-500",
    hex: "#ec4899",
  },
  Medical: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    dot: "bg-emerald-500",
    hex: "#10b981",
  },
  Flood: {
    bg: "bg-cyan-500/15",
    text: "text-cyan-400",
    dot: "bg-cyan-500",
    hex: "#06b6d4",
  },
  Other: {
    bg: "bg-zinc-700/40",
    text: "text-zinc-300",
    dot: "bg-zinc-500",
    hex: "#8b5cf6",
  },
};

// ── Bottom sheet: incident detail ─────────────────────────────────────────────
// Rendered via a fixed overlay so it's never clipped by any parent scroll/overflow
function IncidentDrawer({
  incident,
  onClose,
}: {
  incident: Incident;
  onClose: () => void;
}) {
  const { confirmIncident } = useIncidentStore();
  const [voted, setVoted] = useState<"yes" | "no" | null>(null);
  const cfg = TYPE_CONFIG[incident.type] ?? TYPE_CONFIG.Other;
  const isLive = (incident as any).source === "live";

  // Prevent body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const vote = (choice: "yes" | "no") => {
    setVoted(choice);
    confirmIncident(incident.id, choice === "yes");
  };

  return (
    // Fixed overlay so the drawer is never clipped by parent scroll containers
    <div className="fixed inset-0 z-9999 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0B1121]/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-[#0B1121]/95 backdrop-blur-3xl border-t border-white/10 rounded-t-[32px] animate-slide-up max-w-md w-full mx-auto overflow-hidden shadow-2xl">
        {/* Ambient top glow */}
        <div
          className={cn(
            "absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-[50px] opacity-20 pointer-events-none",
            cfg.text.replace("text-", "bg-"),
          )}
        />

        {/* Handle */}
        <div className="flex justify-center pt-4 pb-2 relative z-10">
          <div className="w-12 h-1.5 rounded-full bg-white/10" />
        </div>

        <div className="px-6 pt-2 pb-8 space-y-5 max-h-[75vh] overflow-y-auto relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest border border-white/[0.08]",
                  cfg.bg,
                  cfg.text,
                )}
              >
                {incident.type}
              </span>
              {incident.status === "VERIFIED" && (
                <span className="px-3 py-1.5 rounded-xl text-[11px] font-black border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  ✓ VERIFIED
                </span>
              )}
              {isLive && (
                <span className="px-3 py-1.5 rounded-xl text-[11px] font-black border bg-teal-500/10 text-teal-400 border-teal-500/30 animate-pulse">
                  ⚡ LIVE AI
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ChevronDown className="w-5 h-5 text-white/70" />
            </button>
          </div>

          {/* Summary */}
          <p className="text-zinc-200 text-sm leading-relaxed">
            {incident.summary || incident.description}
          </p>

          {/* Confidence bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">
              <span>AI Confidence</span>
              <span
                style={{
                  color:
                    incident.confidenceScore >= 70
                      ? "#10b981"
                      : incident.confidenceScore >= 40
                        ? "#f59e0b"
                        : "#ef4444",
                }}
              >
                {incident.confidenceScore}%
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${incident.confidenceScore}%`,
                  background:
                    incident.confidenceScore >= 70
                      ? "#10b981"
                      : incident.confidenceScore >= 40
                        ? "#f59e0b"
                        : "#ef4444",
                }}
              />
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Severity",
                value: `${incident.severityScore}/10`,
                color:
                  incident.severityScore >= 8
                    ? "text-red-400"
                    : incident.severityScore >= 5
                      ? "text-amber-400"
                      : "text-emerald-400",
              },
              {
                label: "Reports",
                value: incident.reportersCount.toString(),
                color: "text-blue-400",
              },
              {
                label: "Status",
                value: incident.status,
                color:
                  incident.status === "VERIFIED"
                    ? "text-emerald-400"
                    : "text-amber-400",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-white/[0.03] border border-white/[0.04] rounded-2xl p-3 flex flex-col items-center justify-center text-center"
              >
                <p
                  className={cn(
                    "text-sm font-black whitespace-nowrap tracking-wide flex-1 flex items-center",
                    m.color,
                  )}
                >
                  {m.value}
                </p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mt-1.5">
                  {m.label}
                </p>
              </div>
            ))}
          </div>

          {/* Location & time */}
          <div className="flex items-center gap-4 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {incident.cues[0] ?? "Port Harcourt"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(incident.timestamp), {
                addSuffix: true,
              })}
            </span>
          </div>

          {/* Cues */}
          {incident.cues.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {incident.cues.slice(1, 6).map((c) => (
                <span
                  key={c}
                  className="bg-zinc-800 border border-zinc-700 text-zinc-400 text-[9px] font-semibold px-2 py-0.5 rounded-md"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Timeline */}
          {incident.statusHistory && incident.statusHistory.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                Timeline
              </h4>
              <div className="space-y-1">
                {incident.statusHistory.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        h.status === "VERIFIED"
                          ? "bg-emerald-500"
                          : h.status === "CLOSED"
                            ? "bg-zinc-500"
                            : "bg-amber-500",
                      )}
                    />
                    <span className="text-zinc-500">
                      {formatDistanceToNow(new Date(h.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                    <span className="text-zinc-400 font-semibold">
                      {h.note ?? h.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Crowd confirm CTA — only for unverified */}
          {incident.status === "UNVERIFIED" && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-zinc-400 font-medium text-center">
                Can you confirm this incident?
              </p>
              {voted ? (
                <div
                  className={cn(
                    "py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border",
                    voted === "yes"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                      : "bg-zinc-700/40 text-zinc-400 border-zinc-600",
                  )}
                >
                  {voted === "yes" ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Confirmed — helps verify
                      this report
                    </>
                  ) : (
                    <>
                      <XIcon className="w-3.5 h-3.5" /> Marked as unconfirmed
                    </>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => vote("yes")}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 py-3 rounded-xl text-xs font-bold hover:bg-emerald-500/25 active:scale-[0.98] transition-all"
                  >
                    <Check className="w-4 h-4" /> YES, I see it
                  </button>
                  <button
                    onClick={() => vote("no")}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 text-zinc-400 border border-zinc-700 py-3 rounded-xl text-xs font-bold hover:bg-zinc-700 active:scale-[0.98] transition-all"
                  >
                    <XIcon className="w-4 h-4" /> NO
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CitizenHome() {
  const incidents = useIncidentStore((s) => s.incidents);
  const [activeTab, setActiveTab] = useState<"map" | "feed">("map");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    4.8156, 7.0498,
  ]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [searchParams, setSearchParams] = useSearchParams();

  const { status: liveStatus, refresh } = useLiveData();

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        setUserLocation(loc);
        // Removed auto-centering on user location so we don't accidentally pan away from the incidents
      },
      () => console.warn("Geolocation denied"),
    );
  }, []);

  // Auto-select incident from ?incident=<id> URL param (deep-link from Alerts page)
  useEffect(() => {
    const incidentId = searchParams.get("incident");
    if (!incidentId || incidents.length === 0) return;
    const target = incidents.find((i) => i.id === incidentId);
    if (target) {
      setSelectedIncident(target);
      setMapCenter([target.latitude, target.longitude]);
      setActiveTab("map");
      // Remove param from URL so back-navigation works cleanly
      setSearchParams({}, { replace: true });
    }
  }, [incidents, searchParams]);

  // Keep selected incident in sync if store updates it (e.g. votes change its status)
  useEffect(() => {
    if (selectedIncident) {
      const updated = incidents.find((i) => i.id === selectedIncident.id);
      setSelectedIncident(updated ?? null);
    }
  }, [incidents]);

  const activeIncidents = incidents.filter((i) => i.status !== "CLOSED");
  const verified = activeIncidents.filter(
    (i) => i.status === "VERIFIED",
  ).length;
  const liveCount = activeIncidents.filter(
    (i) => (i as any).source === "live",
  ).length;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 shrink-0 bg-[#0B1121]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="px-4 py-3 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[10px] flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <ShieldAlert
                className="w-[18px] h-[18px] text-white"
                strokeWidth={2.5}
              />
            </div>
            <div>
              <h1 className="text-[15px] font-extrabold text-white leading-none tracking-tight">
                AiWee
              </h1>
              <p className="text-[9px] text-zinc-500 leading-none mt-0.5 font-medium tracking-wider uppercase">
                Port Harcourt
              </p>
            </div>
          </div>

          {/* Map / Feed toggle */}
          <div className="flex items-center gap-1 bg-zinc-800/70 border border-white/[0.06] rounded-full p-1">
            {(["map", "feed"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold transition-all capitalize tracking-wide",
                  activeTab === tab
                    ? "bg-emerald-500 text-zinc-950 shadow-sm shadow-emerald-500/30"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Live status bar */}
        <div className="px-4 pb-2.5 flex items-center justify-between">
          <LiveBadge status={liveStatus} onRefresh={refresh} />
          {liveCount > 0 && (
            <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
              <Zap className="w-2.5 h-2.5" /> {liveCount} AI-sourced
            </div>
          )}
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === "map" ? (
          <div className="h-full w-full relative">
            <MapView
              center={mapCenter}
              zoom={13}
              height="100%"
              userLocation={userLocation}
            />

            {/* Stat overlays — top right */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 z-400 pointer-events-none">
              <div className="bg-[#0B1121]/85 backdrop-blur-md border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-right pointer-events-auto shadow-lg">
                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">
                  ACTIVE
                </p>
                <p className="text-2xl font-black text-white leading-tight">
                  {activeIncidents.length}
                </p>
              </div>
              <div className="bg-[#0B1121]/85 backdrop-blur-md border border-emerald-500/20 rounded-2xl px-3.5 py-2.5 text-right pointer-events-auto shadow-lg shadow-emerald-500/10">
                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">
                  VERIFIED
                </p>
                <p className="text-2xl font-black text-emerald-400 leading-tight">
                  {verified}
                </p>
              </div>
            </div>

            {/* Incident ticker — bottom of map, above bottom nav */}
            {activeIncidents.length > 0 && !selectedIncident && (
              <button
                onClick={() => setSelectedIncident(activeIncidents[0])}
                className="absolute bottom- lg:bottom-10 left-4 right-4 z-[400] bg-[#0B1121]/80 backdrop-blur-2xl rounded-2xl p-3.5 flex items-center gap-3 border border-emerald-500/20 shadow-lg shadow-emerald-500/10 hover:border-emerald-500/40 transition-all animate-fade-in group active:scale-[0.98]"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                  <AlertTriangle className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <span className="text-xs text-zinc-200 font-bold block truncate">
                    {activeIncidents[0].summary ||
                      activeIncidents[0].description}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                      {activeIncidents[0].type} · VIEW Details
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-5 h-5 text-emerald-500/50 group-hover:text-emerald-400 -rotate-90 shrink-0 transition-colors" />
              </button>
            )}
          </div>
        ) : (
          // Feed tab — scrollable list
          <div className="h-full overflow-y-auto p-4 space-y-3">
            {activeIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500 animate-fade-in gap-3">
                <ShieldAlert className="w-12 h-12 opacity-15" />
                <p className="text-sm font-medium">
                  All clear — no active incidents.
                </p>
                <p className="text-xs text-zinc-600 text-center">
                  Live AI feed updates every 5 minutes.
                </p>
              </div>
            ) : (
              activeIncidents.map((incident, idx) => {
                const cfg = TYPE_CONFIG[incident.type] ?? TYPE_CONFIG.Other;
                const isLive = (incident as any).source === "live";

                return (
                  <button
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident)}
                    className="w-full text-left relative bg-[#0B1121]/60 backdrop-blur-xl border border-white/[0.04] rounded-[24px] p-5 space-y-3.5 animate-slide-up hover:border-white/[0.08] hover:bg-[#0B1121]/80 transition-all active:scale-[0.98] overflow-hidden shadow-xl group"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {/* Background ambient glow based on severity */}
                    <div
                      className={cn(
                        "absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[40px] opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none",
                        cfg.text.replace("text-", "bg-"),
                      )}
                    />

                    <div className="flex justify-between items-start relative z-10">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/[0.05]",
                            cfg.bg,
                            cfg.text,
                          )}
                        >
                          {incident.type}
                        </span>
                        {incident.status === "VERIFIED" && (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                            ✓ Verified
                          </span>
                        )}
                        {isLive && (
                          <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse">
                            ⚡ LIVE
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1.5 shrink-0 bg-white/[0.03] px-2 py-1 rounded-lg">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        {formatDistanceToNow(new Date(incident.timestamp), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>

                    <p className="text-zinc-200 text-sm leading-relaxed line-clamp-2 relative z-10 font-medium">
                      {incident.summary || incident.description}
                    </p>

                    {/* Confidence bar */}
                    <div className="space-y-1.5 relative z-10 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.02]">
                      <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                        <span>AI Confidence</span>
                        <span
                          style={{
                            color:
                              incident.confidenceScore >= 70
                                ? "#10b981"
                                : incident.confidenceScore >= 40
                                  ? "#f59e0b"
                                  : "#ef4444",
                          }}
                        >
                          {incident.confidenceScore}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${incident.confidenceScore}%`,
                            background:
                              incident.confidenceScore > 70
                                ? "#10b981"
                                : incident.confidenceScore > 40
                                  ? "#f59e0b"
                                  : "#ef4444",
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] relative z-10">
                      <span className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-bold">
                        <MapPin className="w-3 h-3 text-zinc-500" />
                        {incident.cues[0] ?? "Port Harcourt"}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-bold">
                        <Users className="w-3 h-3 text-zinc-500" />
                        {incident.reportersCount} report
                        {incident.reportersCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* ── Bottom sheet drawer — rendered as fixed overlay ─────────────── */}
      {selectedIncident && (
        <IncidentDrawer
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
}
