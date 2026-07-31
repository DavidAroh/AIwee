/**
 * SosButton — the one-touch emergency button (Citizen map).
 *
 * Safeguards per spec:
 *  1. Press-and-hold 2 s to arm (accidental-press protection)
 *  2. 3-second cancel countdown before broadcasting (false-activation window)
 *
 * During the countdown the user can pick an emergency level (or Silent SOS);
 * if they pick nothing it fires as Personal Threat.
 */
import { useEffect, useRef, useState } from "react";
import { AlertOctagon, X } from "lucide-react";
import {
  useEmergencyStore,
  LEVEL_META,
  type EmergencyLevel,
} from "../../store/useEmergencyStore";
import { cn } from "../../lib/utils";

const HOLD_MS = 2000;
const COUNTDOWN_S = 3;

const PICKABLE: EmergencyLevel[] = [
  "THREAT",
  "MEDICAL",
  "KIDNAP",
  "VIOLENCE",
  "SILENT",
];

export function SosButton() {
  const activateSos = useEmergencyStore((s) => s.activateSos);
  const activeId = useEmergencyStore((s) => s.activeId);

  const [holdProgress, setHoldProgress] = useState(0); // 0..1
  const [showHint, setShowHint] = useState(false);
  const [arming, setArming] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_S);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStart = useRef(0);

  const clearHold = () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    setHoldProgress(0);
  };

  const onPressStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activeId || arming) return;
    // Capture the pointer so a small thumb drift off the button doesn't
    // cancel an emergency hold (pointerleave never fires while captured).
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture unsupported — hold still works if the pointer stays on */
    }
    setShowHint(false);
    holdStart.current = Date.now();
    holdTimer.current = setInterval(() => {
      const p = (Date.now() - holdStart.current) / HOLD_MS;
      if (p >= 1) {
        clearHold();
        setCountdown(COUNTDOWN_S);
        setArming(true);
      } else {
        setHoldProgress(p);
      }
    }, 50);
  };

  const onPressEnd = () => {
    if (holdTimer.current && Date.now() - holdStart.current < HOLD_MS) {
      setShowHint(true);
      setTimeout(() => setShowHint(false), 2000);
    }
    clearHold();
  };

  // 3-second broadcast countdown
  useEffect(() => {
    if (!arming) return;
    if (countdown <= 0) {
      setArming(false);
      activateSos("THREAT");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [arming, countdown, activateSos]);

  const fireWithLevel = (level: EmergencyLevel) => {
    setArming(false);
    activateSos(level);
  };

  if (activeId) return null; // overlay owns the screen while active

  return (
    <>
      {/* The button */}
      <div className="absolute bottom-40 lg:bottom-44 left-4 z-[450] flex flex-col items-start gap-2">
        {showHint && (
          <div className="bg-slate-900/90 text-white text-[10px] font-bold rounded-lg px-3 py-1.5 animate-fade-in">
            Hold for 2s to activate SOS
          </div>
        )}
        <button
          id="sos-button"
          aria-label="Emergency SOS — hold for 2 seconds"
          onPointerDown={onPressStart}
          onPointerUp={onPressEnd}
          onPointerCancel={onPressEnd}
          className="relative w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/40 flex items-center justify-center select-none touch-none active:scale-95 transition-transform"
        >
          {/* Hold progress ring */}
          {holdProgress > 0 && (
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32" cy="32" r="29"
                fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="4"
                strokeDasharray={`${holdProgress * 182} 182`}
                strokeLinecap="round"
              />
            </svg>
          )}
          <div className="flex flex-col items-center pointer-events-none">
            <AlertOctagon className="w-6 h-6 text-white" strokeWidth={2.5} />
            <span className="text-[9px] font-black text-white tracking-widest mt-0.5">SOS</span>
          </div>
        </button>
      </div>

      {/* Arming overlay: 3-second cancel window + level picker */}
      {arming && (
        <div className="fixed inset-0 z-[9998] bg-red-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 gap-5 animate-fade-in">
          <p className="text-red-200 text-xs font-bold uppercase tracking-widest">
            Activating SOS
          </p>
          <div className="relative w-28 h-28 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-red-500/40 animate-ping-slow" />
            <span className="text-6xl font-black text-white tabular-nums">{countdown}</span>
          </div>
          <p className="text-red-100 text-sm text-center max-w-xs">
            Broadcasting in {countdown}s as <b>Personal Threat</b> — or choose:
          </p>

          <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
            {PICKABLE.map((lvl) => {
              const meta = LEVEL_META[lvl];
              return (
                <button
                  key={lvl}
                  onClick={() => fireWithLevel(lvl)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all active:scale-[0.98]",
                    lvl === "SILENT"
                      ? "bg-slate-800/80 border-slate-600 hover:bg-slate-700"
                      : "bg-red-600/30 border-red-500/50 hover:bg-red-600/50",
                  )}
                >
                  <span className="text-xl">{meta.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{meta.label}</p>
                    <p className="text-[10px] text-red-200/80">{meta.phrase}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setArming(false)}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-red-700 font-black text-sm active:scale-95 transition-transform"
          >
            <X className="w-4 h-4" strokeWidth={3} /> CANCEL
          </button>
        </div>
      )}
    </>
  );
}
