/**
 * LiveBadge — compact real-time status indicator
 * Shows: ● LIVE / fetching spinner / error dot + last-updated time + countdown
 */
import { RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import type { LiveStatus } from '../hooks/useLiveData';

interface Props {
  status: LiveStatus;
  onRefresh?: () => void;
  compact?: boolean; // hide countdown / new count on small layouts
}

export function LiveBadge({ status, onRefresh, compact = false }: Props) {
  const isFetching = status.state === 'fetching';
  const isError    = status.state === 'error';

  const dotColor = isFetching
    ? 'bg-amber-400'
    : isError
      ? 'bg-red-500'
      : 'bg-emerald-500';

  const label = isFetching ? 'Fetching…' : isError ? 'Error' : 'LIVE';

  const lastUpdatedText = status.lastUpdated
    ? relativeTime(status.lastUpdated)
    : 'Never';

  return (
    <div className="flex items-center gap-2">
      {/* Dot + label */}
      <div className="flex items-center gap-1.5 select-none">
        <span className={cn('relative flex w-2 h-2')}>
          {!isFetching && !isError && (
            <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-60', dotColor)} />
          )}
          <span className={cn('relative inline-flex rounded-full h-2 w-2', dotColor)} />
        </span>
        <span className={cn(
          'text-[10px] font-extrabold uppercase tracking-widest',
          isFetching ? 'text-amber-400' : isError ? 'text-red-400' : 'text-emerald-400',
        )}>
          {label}
        </span>
      </div>

      {!compact && status.lastUpdated && (
        <span className="text-[9px] text-slate-500 hidden sm:inline">
          {lastUpdatedText}
        </span>
      )}

      {!compact && !isFetching && (
        <span className="text-[9px] text-slate-600 hidden sm:inline">
          · {status.nextRefreshIn}s
        </span>
      )}

      {!compact && status.newCount > 0 && status.state === 'success' && (
        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
          +{status.newCount} new
        </span>
      )}

      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isFetching}
          className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
          title="Refresh now"
        >
          <RefreshCw className={cn('w-3 h-3', isFetching && 'animate-spin')} />
        </button>
      )}
    </div>
  );
}

function relativeTime(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 10)  return 'just now';
  if (s < 60)  return `${s}s ago`;
  if (s < 120) return '1m ago';
  return `${Math.floor(s / 60)}m ago`;
}
