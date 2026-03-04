import { useState } from 'react';
import { useIncidentStore } from '../../store/useIncidentStore';
import { Bell, AlertTriangle, Info, ShieldAlert, Check, X, MapPin, Users, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

const ALERT_CFG = {
  URGENT:       { bg: 'bg-red-500/8 border-red-500/25',     icon: AlertTriangle, color: 'text-red-400',    iconBg: 'bg-red-500/20'    },
  CAUTIONARY:   { bg: 'bg-amber-500/8 border-amber-500/25', icon: AlertTriangle, color: 'text-amber-400',  iconBg: 'bg-amber-500/20'  },
  VERIFICATION: { bg: 'bg-blue-500/8 border-blue-500/25',   icon: ShieldAlert,   color: 'text-blue-400',   iconBg: 'bg-blue-500/20'   },
  INFORMATIONAL:{ bg: 'bg-zinc-800/50 border-zinc-700/40',  icon: Info,          color: 'text-zinc-300',   iconBg: 'bg-zinc-700'      },
};

export default function CitizenAlerts() {
  const { alerts, incidents, dismissedAlerts, dismissAlert, markAlertRead, confirmIncident } = useIncidentStore();
  const navigate = useNavigate();

  // Track which verification alerts have been voted on
  const [voted, setVoted] = useState<Record<string, 'yes' | 'no'>>({});

  const visible = alerts.filter((a) => !dismissedAlerts.includes(a.id));
  const unread  = visible.filter((a) => !a.read).length;

  const handleVote = (alertId: string, incidentId: string, choice: 'yes' | 'no') => {
    setVoted((v) => ({ ...v, [alertId]: choice }));
    confirmIncident(incidentId, choice === 'yes');
    markAlertRead(alertId);
  };

  return (
    <div className="h-full flex flex-col">
      <header className="glass sticky top-0 z-10 px-4 py-3.5 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-zinc-400" />
            <h1 className="text-base font-bold text-white tracking-tight">Alerts</h1>
            {unread > 0 && (
              <span className="w-5 h-5 bg-red-500 rounded-full text-[10px] font-extrabold text-white flex items-center justify-center animate-pulse">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
          {visible.length > 0 && (
            <button
              onClick={() => visible.forEach((a) => markAlertRead(a.id))}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors font-semibold"
            >
              Mark all read
            </button>
          )}
        </div>
        <p className="text-[10px] text-zinc-500 mt-0.5">Crowd-sourced alerts near you · Port Harcourt</p>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {visible.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-3 animate-fade-in py-16">
            <div className="w-16 h-16 rounded-full bg-zinc-800/60 flex items-center justify-center">
              <Bell className="w-8 h-8 opacity-25" />
            </div>
            <p className="text-sm font-medium">No active alerts in your area.</p>
            <p className="text-xs text-zinc-600 text-center max-w-xs">
              You'll be notified when incidents near you are verified by the crowd.
            </p>
          </div>
        ) : (
          visible.map((alert, idx) => {
            const incident = incidents.find((i) => i.id === alert.incidentId);
            const cfg = ALERT_CFG[alert.type];
            const Icon = cfg.icon;
            const isVerification = alert.type === 'VERIFICATION';
            const myVote = voted[alert.id];

            return (
              <div
                key={alert.id}
                className={cn(
                  'rounded-2xl border p-4 space-y-3 animate-slide-up relative transition-opacity',
                  cfg.bg,
                  alert.read && 'opacity-60',
                )}
                style={{ animationDelay: `${idx * 0.07}s` }}
              >
                {/* Dismiss button */}
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="absolute top-3 right-3 text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-start gap-3 pr-5">
                  <div className={cn('p-2.5 rounded-xl shrink-0', cfg.iconBg)}>
                    <Icon className={cn('w-5 h-5', cfg.color)} />
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={cn('text-[10px] font-extrabold uppercase tracking-wider', cfg.color)}>
                        {alert.type}
                      </h3>
                      {!alert.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      )}
                      <span className="text-[9px] text-zinc-600 ml-auto">
                        {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-zinc-200 text-sm leading-relaxed">{alert.message}</p>

                    {/* Incident metadata */}
                    {incident && (
                      <div className="flex items-center gap-3 pt-1">
                        <span className="flex items-center gap-1 text-[9px] text-zinc-500">
                          <MapPin className="w-3 h-3" />
                          {incident.cues[0] ?? 'Port Harcourt'}
                        </span>
                        <span className="flex items-center gap-1 text-[9px] text-zinc-500">
                          <Users className="w-3 h-3" />
                          {incident.reportersCount} report{incident.reportersCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification YES / NO */}
                {isVerification && (
                  myVote ? (
                    <div className={cn(
                      'ml-12 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center gap-2',
                      myVote === 'yes'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        : 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/40'
                    )}>
                      {myVote === 'yes' ? <><Check className="w-3.5 h-3.5" /> Confirmed — thank you!</> : <><X className="w-3.5 h-3.5" /> Reported as unconfirmed</>}
                    </div>
                  ) : (
                    <div className="flex gap-2 ml-12">
                      <button
                        onClick={() => handleVote(alert.id, alert.incidentId, 'yes')}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-500/25 active:scale-[0.98] transition-all"
                      >
                        <Check className="w-3.5 h-3.5" /> YES, I see it
                      </button>
                      <button
                        onClick={() => handleVote(alert.id, alert.incidentId, 'no')}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-700/40 text-zinc-400 border border-zinc-600/40 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-700/60 active:scale-[0.98] transition-all"
                      >
                        <X className="w-3.5 h-3.5" /> NO
                      </button>
                    </div>
                  )
                )}

                {/* View incident detail */}
                {incident && alert.type !== 'VERIFICATION' && (
                  <button
                    onClick={() => navigate('/citizen')}
                    className="ml-12 flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 font-semibold transition-colors"
                  >
                    View on map <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
