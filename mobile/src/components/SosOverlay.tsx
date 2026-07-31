/**
 * SosOverlay — active-emergency screen, ported from the web:
 * strobing background (flashlight substitute; skipped in Silent mode), elapsed
 * timer, live broadcast info, alarm mute/unmute, and a hold-1.5s "I'M SAFE"
 * button so a pocket tap (or an attacker) can't trivially end the emergency.
 */
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Emergency } from "../lib/types";
import { LEVEL_META } from "../lib/types";
import { startAlarm, stopAlarm } from "../services/sos";
import { font, theme } from "../theme";

const SAFE_HOLD_MS = 1500;

function Strobe() {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 300, easing: Easing.step0, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, easing: Easing.step0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { backgroundColor: "#7f1d1d", opacity }]}
    />
  );
}

export default function SosOverlay({
  emergency,
  onEnd,
}: {
  emergency: Emergency;
  onEnd: () => void;
}) {
  const silent = emergency.level === "SILENT";
  const [elapsed, setElapsed] = useState(0);
  const [alarmOn, setAlarmOn] = useState(!silent);
  const [safeProgress, setSafeProgress] = useState(0);
  const safeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const safeStart = useRef(0);

  useEffect(() => {
    const started = new Date(emergency.startedAt).getTime();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [emergency.startedAt]);

  const clearSafeHold = () => {
    if (safeTimer.current) clearInterval(safeTimer.current);
    safeTimer.current = null;
    setSafeProgress(0);
  };

  const onSafeStart = () => {
    safeStart.current = Date.now();
    safeTimer.current = setInterval(() => {
      const p = (Date.now() - safeStart.current) / SAFE_HOLD_MS;
      if (p >= 1) {
        clearSafeHold();
        onEnd();
      } else {
        setSafeProgress(p);
      }
    }, 50);
  };

  const toggleAlarm = () => {
    if (alarmOn) {
      stopAlarm();
      setAlarmOn(false);
    } else {
      startAlarm(false);
      setAlarmOn(true);
    }
  };

  const meta = LEVEL_META[emergency.level];
  const last = emergency.track[emergency.track.length - 1];
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <View style={[styles.overlay, silent && { backgroundColor: "#020617" }]}>
      {!silent && <Strobe />}

      <View style={styles.badge}>
        <Feather name="radio" size={13} color="#fff" />
        <Text style={styles.badgeText}>SOS ACTIVE</Text>
      </View>

      <Text style={styles.emoji}>{meta.emoji}</Text>
      <Text style={styles.title}>{meta.label}</Text>
      <Text style={styles.timer}>
        {mm}:{ss}
      </Text>

      <View style={styles.info}>
        <Text style={styles.infoText}>
          Broadcasting live location · {emergency.track.length} point
          {emergency.track.length !== 1 ? "s" : ""}
        </Text>
        {last && (
          <Text style={styles.coord}>
            {last.lat.toFixed(5)}, {last.lng.toFixed(5)}
          </Text>
        )}
        <Text style={styles.infoText}>Nearby users + control room alerted</Text>
        {silent && <Text style={styles.silentNote}>Silent mode — location only, no alarm</Text>}
      </View>

      {!silent && (
        <Pressable style={styles.alarmBtn} onPress={toggleAlarm}>
          <Feather name={alarmOn ? "volume-x" : "volume-2"} size={15} color="#fff" />
          <Text style={styles.alarmText}>{alarmOn ? "Mute alarm" : "Sound alarm"}</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.safeBtn}
        onPressIn={onSafeStart}
        onPressOut={clearSafeHold}
      >
        <View style={[styles.safeFill, { width: `${safeProgress * 100}%` }]} />
        <Feather name="shield" size={18} color={theme.red} />
        <Text style={styles.safeBtnText}>
          {safeProgress > 0 ? "KEEP HOLDING…" : "HOLD — I'M SAFE"}
        </Text>
      </Pressable>
      <Text style={styles.safeHint}>Hold 1.5s to end the emergency</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.red,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    zIndex: 1000,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 4,
  },
  badgeText: { color: "#fff", fontSize: 11, fontFamily: font.extra, letterSpacing: 2 },
  emoji: { fontSize: 64 },
  title: { fontSize: 24, fontFamily: font.black, color: "#fff" },
  timer: { fontSize: 52, fontFamily: font.black, color: "#fff", letterSpacing: 2 },
  info: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 5,
  },
  infoText: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontFamily: font.medium },
  coord: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "monospace" },
  silentNote: { color: "#fcd34d", fontSize: 11, fontFamily: font.bold },
  alarmBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
  },
  alarmText: { color: "#fff", fontSize: 12, fontFamily: font.bold },
  safeBtn: {
    marginTop: 14,
    width: "100%",
    maxWidth: 340,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingVertical: 17,
    borderRadius: 18,
    overflow: "hidden",
  },
  safeFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(167,243,208,0.9)",
  },
  safeBtnText: { color: theme.red, fontFamily: font.black, fontSize: 14, letterSpacing: 0.5 },
  safeHint: { color: "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: font.regular },
});
