/**
 * SosOverlay — full-screen state while this device's SOS is active.
 *
 * Non-silent mode strobes the whole screen (web substitute for a flashlight)
 * and shows siren controls. "I'm Safe" requires a 1.5 s hold so an attacker
 * (or a pocket tap) can't trivially dismiss the emergency.
 */
import { useEffect, useRef, useState } from "react";
import { MapPin, Volume2, VolumeX, ShieldCheck, Radio } from "lucide-react";
import { useEmergencyStore, LEVEL_META } from "../../store/useEmergencyStore";
import { isSirenOn, startSiren, stopSiren } from "../../services/sosEffects";
import { cn } from "../../lib/utils";

const SAFE_HOLD_MS = 1500;

export function SosOverlay() {
  const activeId = useEmergencyStore((s) => s.activeId);
  const emergency = useEmergencyStore((s) =>
    s.emergencies.find((e) => e.id === s.activeId),
  );
  const markSafe = useEmergencyStore((s) => s.markSafe);

  const [elapsed, setElapsed] = useState(0);
  const [sirenOn, setSirenOn] = useState(isSirenOn());
  const [safeProgress, setSafeProgress] = useState(0);
  const safeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const safeStart = useRef(0);

  useEffect(() => {
    if (!emergency) return;
    const started = new Date(emergency.startedAt).getTime();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [emergency?.startedAt, emergency]);

  const clearSafeHold = () => {
    if (safeTimer.current) clearInterval(safeTimer.current);
    safeTimer.current = null;
    setSafeProgress(0);
  };

  const onSafeStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture unsupported */
    }
    safeStart.current = Date.now();
    safeTimer.current = setInterval(() => {
      const p = (Date.now() - safeStart.current) / SAFE_HOLD_MS;
      if (p >= 1) {
        clearSafeHold();
        markSafe();
      } else {
        setSafeProgress(p);
      }
    }, 50);
  };

  if (!activeId || !emergency) return null;

  const meta = LEVEL_META[emergency.level];
  const silent = emergency.level === "SILENT";
  const last = emergency.track[emergency.track.length - 1];
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const toggleSiren = () => {
    if (isSirenOn()) {
      stopSiren();
      setSirenOn(false);
    } else {
      setSirenOn(startSiren());
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 gap-5",
        silent ? "bg-slate-950/97" : "sos-strobe",
      )}
    >
      <div className="flex items-center gap-2 text-white/90">
        <Radio className="w-4 h-4 animate-pulse" />
        <span className="text-[11px] font-black uppercase tracking-[0.2em]">
          {emergency.auto ? "Auto SOS — timer expired" : "SOS Active"}
        </span>
      </div>

      <div className="text-center space-y-1">
        <p className="text-7xl">{meta.emoji}</p>
        <h1 className="text-2xl font-black text-white">{meta.label}</h1>
        <p className="text-white/70 text-xs">{emergency.note ?? meta.phrase}</p>
      </div>

      <p className="text-5xl font-black text-white tabular-nums tracking-wider">
        {mm}:{ss}
      </p>

      <div className="bg-black/40 rounded-2xl px-5 py-3 space-y-1.5 text-center backdrop-blur-sm">
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/85 font-semibold">
          <MapPin className="w-3.5 h-3.5" />
          Broadcasting live location · {emergency.track.length} point
          {emergency.track.length !== 1 ? "s" : ""}
        </p>
        {last && (
          <p className="text-[10px] text-white/60 font-mono">
            {last.lat.toFixed(5)}, {last.lng.toFixed(5)}
            {last.accuracy ? ` · ±${Math.round(last.accuracy)}m` : ""}
          </p>
        )}
        <p className="text-[10px] text-white/60">
          Nearby users alerted · Control room notified
          {emergency.acks > 0 && ` · ${emergency.acks} responding`}
        </p>
        {silent && (
          <p className="text-[10px] text-amber-300 font-bold">
            Silent mode — no siren, location only
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        {!silent && (
          <button
            onClick={toggleSiren}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/15 border border-white/30 text-white text-xs font-bold active:scale-95 transition-transform"
          >
            {sirenOn ? (
              <><VolumeX className="w-4 h-4" /> Mute siren</>
            ) : (
              <><Volume2 className="w-4 h-4" /> Sound siren</>
            )}
          </button>
        )}

        <button
          onPointerDown={onSafeStart}
          onPointerUp={clearSafeHold}
          onPointerCancel={clearSafeHold}
          className="relative w-full py-4 rounded-2xl bg-white text-red-700 font-black text-sm flex items-center justify-center gap-2 select-none touch-none overflow-hidden active:scale-[0.98] transition-transform"
        >
          <div
            className="absolute inset-y-0 left-0 bg-emerald-200/80 transition-none"
            style={{ width: `${safeProgress * 100}%` }}
          />
          <ShieldCheck className="w-5 h-5 relative" />
          <span className="relative">
            {safeProgress > 0 ? "Keep holding…" : "HOLD — I'M SAFE"}
          </span>
        </button>
        <p className="text-[10px] text-white/60 -mt-1">
          Hold 1.5s to end the emergency
        </p>
      </div>
    </div>
  );
}
