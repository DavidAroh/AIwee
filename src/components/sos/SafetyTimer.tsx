/**
 * SafetyTimer — dead-man's-switch for "I feel unsafe but nothing happened yet".
 *
 * User sets a duration (+optional note); if they don't tap "I'm Safe" before it
 * expires, an SOS fires automatically (handled in SosSystem/checkSafetyTimer).
 * The deadline persists to localStorage, so a reload doesn't lose it.
 */
import { useEffect, useState } from "react";
import { Timer, ShieldCheck, X } from "lucide-react";
import { useEmergencyStore } from "../../store/useEmergencyStore";
import { cn } from "../../lib/utils";

const PRESETS = [10, 20, 30];

export function SafetyTimerButton() {
  const timer = useEmergencyStore((s) => s.safetyTimer);
  const activeId = useEmergencyStore((s) => s.activeId);
  const startTimer = useEmergencyStore((s) => s.startSafetyTimer);
  const cancelTimer = useEmergencyStore((s) => s.cancelSafetyTimer);

  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(10);
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!timer) return;
    const tick = () => setRemaining(Math.max(0, timer.deadline - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timer]);

  if (activeId) return null;

  const mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
  const urgent = timer !== null && remaining < 120_000;

  const begin = () => {
    const custMin = parseInt(custom, 10);
    const dur = custom && !Number.isNaN(custMin) && custMin > 0 ? custMin : minutes;
    startTimer(dur, note.trim() || undefined);
    setOpen(false);
    setNote("");
    setCustom("");
  };

  return (
    <>
      {/* Map chip: idle = start button, running = countdown */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "absolute bottom-[240px] lg:bottom-[256px] left-4 z-[450] flex items-center gap-2 h-10 px-3.5 rounded-full border shadow-lg transition-all active:scale-95",
          timer
            ? urgent
              ? "bg-red-600 border-red-500 text-white animate-pulse"
              : "bg-amber-500 border-amber-400 text-white"
            : "bg-white/95 backdrop-blur border-slate-200 text-slate-700",
        )}
      >
        <Timer className="w-4 h-4" strokeWidth={2.5} />
        <span className="text-xs font-bold tabular-nums">
          {timer ? `${mm}:${ss}` : "Safety Timer"}
        </span>
      </button>

      {/* Config / status sheet */}
      {open && (
        <div className="fixed inset-0 z-[9998] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white border-t border-slate-200 rounded-t-[28px] p-5 pb-8 max-w-md w-full mx-auto space-y-4 animate-slide-up shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900">Safety Timer</h3>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-full bg-slate-100 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            {timer ? (
              <>
                <div className="text-center py-3">
                  <p className={cn("text-5xl font-black tabular-nums", urgent ? "text-red-600" : "text-slate-900")}>
                    {mm}:{ss}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    SOS fires automatically if you don't check in.
                  </p>
                  {timer.note && (
                    <p className="text-xs text-slate-600 mt-1 italic">“{timer.note}”</p>
                  )}
                </div>
                <button
                  onClick={() => { cancelTimer(); setOpen(false); }}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <ShieldCheck className="w-5 h-5" /> I'M SAFE — STOP TIMER
                </button>
              </>
            ) : (
              <>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Entering an unfamiliar area? If you don't tap <b>I'm Safe</b> before
                  the timer runs out, an SOS is triggered automatically.
                </p>
                <div className="flex gap-2">
                  {PRESETS.map((m) => (
                    <button
                      key={m}
                      onClick={() => { setMinutes(m); setCustom(""); }}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all",
                        minutes === m && !custom
                          ? "bg-amber-500 text-white border-amber-400"
                          : "bg-slate-100 text-slate-600 border-slate-200",
                      )}
                    >
                      {m} min
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    placeholder="Custom"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    className="w-20 py-2.5 px-2 rounded-xl text-sm font-bold border border-slate-200 bg-slate-100 text-slate-700 text-center placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Optional note — e.g. “Visiting client at Woji”"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full py-3 px-4 rounded-xl text-sm border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={begin}
                  className="w-full py-3.5 rounded-2xl bg-amber-500 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <Timer className="w-5 h-5" /> START SAFETY TIMER
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
