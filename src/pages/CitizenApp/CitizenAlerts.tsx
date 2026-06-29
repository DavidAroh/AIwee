import { useState } from "react";
import { useIncidentStore } from "../../store/useIncidentStore";
import {
  Bell,
  AlertTriangle,
  Info,
  ShieldAlert,
  Flame,
  Car,
  Droplets,
  Heart,
  Shield,
  Check,
  X,
  MapPin,
  Users,
  ChevronRight,
  Clock,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";

/* ── Type icon mapping ───────────────────────────────────────────────────── */
const TYPE_ICON: Record<string, typeof Flame> = {
  Fire: Flame,
  Accident: Car,
  Flood: Droplets,
  Medical: Heart,
  Crime: Shield,
  Other: AlertTriangle,
};

const TYPE_COLOR: Record<string, { bg: string; text: string; glow: string }> = {
  Fire: { bg: "bg-red-500/15", text: "text-red-400", glow: "bg-red-500" },
  Accident: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    glow: "bg-amber-500",
  },
  Crime: { bg: "bg-pink-500/15", text: "text-pink-400", glow: "bg-pink-500" },
  Medical: {
    bg: "bg-blue-600/15",
    text: "text-blue-500",
    glow: "bg-blue-600",
  },
  Flood: { bg: "bg-cyan-500/15", text: "text-cyan-400", glow: "bg-cyan-500" },
  Other: {
    bg: "bg-violet-500/15",
    text: "text-violet-400",
    glow: "bg-violet-500",
  },
};

/* ── Alert type config ───────────────────────────────────────────────────── */
const ALERT_CFG = {
  URGENT: {
    icon: AlertTriangle,
    iconBg: "bg-red-500/20",
    iconColor: "text-red-400",
    labelColor: "text-red-400",
    label: "URGENT",
  },
  CAUTIONARY: {
    icon: AlertTriangle,
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
    labelColor: "text-amber-400",
    label: "CAUTIONARY",
  },
  VERIFICATION: {
    icon: ShieldAlert,
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
    labelColor: "text-blue-400",
    label: "VERIFICATION",
  },
  INFORMATIONAL: {
    icon: Info,
    iconBg: "bg-slate-300",
    iconColor: "text-slate-500",
    labelColor: "text-slate-500",
    label: "INFO",
  },
};

/* ── Severity label ──────────────────────────────────────────────────────── */
function getSeverityLabel(score: number) {
  if (score >= 8)
    return {
      label: "Critical",
      color: "text-red-400 bg-red-500/10 border-red-500/20",
    };
  if (score >= 5)
    return {
      label: "Moderate",
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    };
  return {
    label: "Low",
    color: "text-blue-500 bg-blue-600/10 border-blue-600/20",
  };
}

export default function CitizenAlerts() {
  const {
    alerts,
    incidents,
    dismissedAlerts,
    dismissAlert,
    markAlertRead,
    confirmIncident,
  } = useIncidentStore();
  const navigate = useNavigate();

  const [voted, setVoted] = useState<Record<string, "yes" | "no">>({});
  const [tab, setTab] = useState<"live" | "alerts">("live");

  // "Alerts" tab — crowd-sourced alerts from the store
  const visibleAlerts = alerts.filter((a) => !dismissedAlerts.includes(a.id));
  const unread = visibleAlerts.filter((a) => !a.read).length;

  // "Live" tab — all active live AI incidents
  const liveIncidents = incidents.filter(
    (i) => (i as any).source === "live" && i.status !== "CLOSED",
  );

  const handleVote = (
    alertId: string,
    incidentId: string,
    choice: "yes" | "no",
  ) => {
    setVoted((v) => ({ ...v, [alertId]: choice }));
    confirmIncident(incidentId, choice === "yes");
    markAlertRead(alertId);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-100 backdrop-blur-xl border-b border-slate-200 px-4 py-3.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 bg-linear-to-br from-red-500 to-rose-600 rounded-[10px] flex items-center justify-center shadow-lg shadow-red-500/25 shrink-0">
              <Bell
                className="w-[18px] h-[18px] text-white"
                strokeWidth={2.5}
              />
              {unread + liveIncidents.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] bg-white rounded-full flex items-center justify-center">
                  <span className="w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] font-black text-white flex items-center justify-center animate-pulse">
                    {unread + liveIncidents.length > 9
                      ? "9+"
                      : unread + liveIncidents.length}
                  </span>
                </span>
              )}
            </div>
            <div>
              <h1 className="text-[15px] font-extrabold text-slate-900 tracking-tight leading-none">
                Alerts
              </h1>
              <p className="text-[9px] text-slate-500 mt-0.5 font-medium uppercase tracking-wider">
                Live AI + Crowd · Port Harcourt
              </p>
            </div>
          </div>

          {/* Tab toggle */}
          <div className="flex items-center gap-1 bg-slate-200/70 border border-slate-200 rounded-full p-1">
            {(["live", "alerts"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-[10px] font-bold transition-all capitalize tracking-wide",
                  tab === t
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                {t === "live"
                  ? `Live (${liveIncidents.length})`
                  : `Alerts (${visibleAlerts.length})`}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── LIVE TAB — AI-sourced incidents ────────────────────────────────── */}
      {tab === "live" ? (
        <main className="flex-1 overflow-y-auto p-4 space-y-3 pb-28">
          {liveIncidents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 animate-fade-in py-16">
              <div className="w-16 h-16 rounded-full bg-slate-200/60 flex items-center justify-center">
                <Zap className="w-8 h-8 opacity-25" />
              </div>
              <p className="text-sm font-medium">
                No live AI incidents right now.
              </p>
              <p className="text-xs text-slate-400 text-center max-w-xs">
                Live incidents from Google News and Gemini AI will appear here
                automatically.
              </p>
            </div>
          ) : (
            liveIncidents.map((incident, idx) => {
              const colors = TYPE_COLOR[incident.type] ?? TYPE_COLOR.Other;
              const Icon = TYPE_ICON[incident.type] ?? AlertTriangle;
              const sev = getSeverityLabel(incident.severityScore);

              return (
                <button
                  key={incident.id}
                  onClick={() => navigate(`/citizen?incident=${incident.id}`)}
                  className="w-full text-left relative bg-slate-100 backdrop-blur-xl border border-slate-200 rounded-[24px] p-5 space-y-3 animate-slide-up hover:border-slate-200 hover:bg-slate-100 transition-all active:scale-[0.98] overflow-hidden shadow-xl group"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {/* Ambient glow */}
                  <div
                    className={cn(
                      "absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-15 group-hover:opacity-25 transition-opacity pointer-events-none",
                      colors.glow,
                    )}
                  />

                  {/* Top row: icon + type + severity + time */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-[10px] flex items-center justify-center border border-slate-200",
                          colors.bg,
                        )}
                      >
                        <Icon
                          className={cn("w-4 h-4", colors.text)}
                          strokeWidth={2.5}
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200",
                            colors.bg,
                            colors.text,
                          )}
                        >
                          {incident.type}
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-lg text-[9px] font-bold border",
                            sev.color,
                          )}
                        >
                          {sev.label}
                        </span>
                        <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-lg text-[9px] font-bold animate-pulse">
                          ⚡ LIVE AI
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(incident.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="text-slate-800 text-sm leading-relaxed relative z-10 font-medium">
                    {incident.summary || incident.description}
                  </p>

                  {/* Confidence bar */}
                  <div className="space-y-1.5 relative z-10 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                    <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase tracking-widest">
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
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
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

                  {/* Meta row */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 relative z-10">
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {incident.cues[0] ?? "Port Harcourt"}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-blue-500 font-bold">
                      View on map <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </main>
      ) : (
        /* ── ALERTS TAB — crowd-sourced alerts ────────────────────────────── */
        <main className="flex-1 overflow-y-auto p-4 space-y-3 pb-28">
          {visibleAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 animate-fade-in py-16">
              <div className="w-16 h-16 rounded-full bg-slate-200/60 flex items-center justify-center">
                <Bell className="w-8 h-8 opacity-25" />
              </div>
              <p className="text-sm font-medium">
                No active alerts in your area.
              </p>
              <p className="text-xs text-slate-400 text-center max-w-xs">
                You'll be notified when incidents near you are verified by the
                crowd.
              </p>
            </div>
          ) : (
            visibleAlerts.map((alert, idx) => {
              const incident = incidents.find((i) => i.id === alert.incidentId);
              const cfg = ALERT_CFG[alert.type];
              const AlertIcon = cfg.icon;
              const isVerif = alert.type === "VERIFICATION";
              const myVote = voted[alert.id];
              const location = incident?.cues[0] ?? "Port Harcourt";
              const status = incident?.status?.toLowerCase() ?? "unverified";
              const reporters = incident?.reportersCount ?? 1;

              return (
                <div
                  key={alert.id}
                  className={cn(
                    "relative bg-slate-100 backdrop-blur-xl border border-slate-200 rounded-[24px] p-5 space-y-3.5 animate-slide-up overflow-hidden shadow-xl",
                    alert.read && "opacity-60 saturate-50",
                  )}
                  style={{ animationDelay: `${idx * 0.07}s` }}
                >
                  {/* Background ambient glow */}
                  <div
                    className={cn(
                      "absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none",
                      cfg.iconColor.replace("text-", "bg-"),
                    )}
                  />

                  {/* Dismiss */}
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Icon + label row */}
                  <div className="flex items-center gap-3 pr-6 relative z-10">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border border-slate-200",
                        cfg.iconBg,
                      )}
                    >
                      <AlertIcon
                        className={cn("w-4 h-4", cfg.iconColor)}
                        strokeWidth={2.5}
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-[11px] font-black uppercase tracking-widest",
                            cfg.labelColor,
                          )}
                        >
                          {cfg.label}
                        </span>
                        {!alert.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {formatDistanceToNow(new Date(alert.timestamp), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Message */}
                  <p className="text-slate-800 text-sm leading-relaxed relative z-10 font-medium">
                    {alert.message}
                  </p>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 relative z-10 pt-1 border-t border-slate-200">
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                      <MapPin className="w-3 h-3 text-slate-500" /> {location}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-[10px] text-slate-500 font-bold">
                      {status}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                      <Users className="w-3 h-3 text-slate-500" /> {reporters}{" "}
                      report{reporters !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* YES / NO — verification only */}
                  {isVerif && (
                    <div className="relative z-10 pt-1">
                      {myVote ? (
                        <div
                          className={cn(
                            "h-11 px-3 rounded-2xl text-xs font-bold flex items-center gap-2 border",
                            myVote === "yes"
                              ? "bg-blue-600/10 text-blue-500 border-blue-600/20"
                              : "bg-slate-200/40 text-slate-500 border-slate-300/50",
                          )}
                        >
                          {myVote === "yes" ? (
                            <>
                              <Check className="w-4 h-4" /> Confirmed — thank
                              you!
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4" /> Reported as unconfirmed
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2.5">
                          <button
                            onClick={() =>
                              handleVote(alert.id, alert.incidentId, "yes")
                            }
                            className="flex-1 h-11 flex items-center justify-center gap-1.5 bg-linear-to-tr from-blue-600/10 to-blue-500/5 text-blue-500 border border-blue-600/20 rounded-2xl text-[11px] font-black tracking-wide hover:bg-blue-600/20 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/5"
                          >
                            <Check className="w-4 h-4" /> YES, I SEE IT
                          </button>
                          <button
                            onClick={() =>
                              handleVote(alert.id, alert.incidentId, "no")
                            }
                            className="flex-1 h-11 flex items-center justify-center gap-1.5 bg-slate-200/40 text-slate-700 border border-slate-300/50 rounded-2xl text-[11px] font-black tracking-wide hover:bg-slate-300/60 active:scale-[0.98] transition-all"
                          >
                            <X className="w-4 h-4" /> NO
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* View on map — non-verification */}
                  {incident && !isVerif && (
                    <button
                      onClick={() =>
                        navigate(
                          incident
                            ? `/citizen?incident=${incident.id}`
                            : "/citizen",
                        )
                      }
                      className="relative z-10 flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-900 font-bold transition-colors pt-1"
                    >
                      View on map <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </main>
      )}
    </div>
  );
}
