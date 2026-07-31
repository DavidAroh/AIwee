import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { cardShadow, font, theme } from "../theme";

const PRESETS = [10, 20, 30];

/**
 * Safety Timer (dead-man's switch): if the user doesn't tap "I'm Safe" before it
 * expires, `onExpire` fires (App raises an SOS). In-memory only — background
 * timers aren't reliable in Expo Go, so it runs while the app is open.
 */
export default function SafetyTimer({ onExpire }: { onExpire: () => void }) {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(10);
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const expired = useRef(false);

  useEffect(() => {
    if (deadline === null) return;
    expired.current = false;
    const tick = () => {
      const left = deadline - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0 && !expired.current) {
        expired.current = true;
        setDeadline(null);
        onExpire();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, onExpire]);

  const running = deadline !== null;
  const mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
  const urgent = running && remaining < 120_000;

  const begin = () => {
    const c = parseInt(custom, 10);
    const dur = custom && !Number.isNaN(c) && c > 0 ? c : minutes;
    setDeadline(Date.now() + dur * 60_000);
    setOpen(false);
    setCustom("");
    setNote("");
  };

  return (
    <>
      <Pressable
        style={[styles.pill, running && (urgent ? styles.pillUrgent : styles.pillActive)]}
        onPress={() => setOpen(true)}
      >
        <Feather name="clock" size={14} color={running ? "#fff" : theme.text2} />
        <Text style={[styles.pillText, running && { color: "#fff" }]}>
          {running ? `${mm}:${ss}` : "Safety Timer"}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <View style={styles.sheetTitleRow}>
              <Feather name="clock" size={16} color={theme.amber} />
              <Text style={styles.sheetTitle}>Safety Timer</Text>
            </View>
            <Pressable onPress={() => setOpen(false)} style={styles.close}>
              <Feather name="x" size={16} color={theme.muted} />
            </Pressable>
          </View>

          {running ? (
            <>
              <Text style={[styles.bigCount, urgent && { color: theme.red }]}>
                {mm}:{ss}
              </Text>
              <Text style={styles.hint}>SOS fires automatically if you don't check in.</Text>
              <Pressable style={styles.safeBtn} onPress={() => { setDeadline(null); setOpen(false); }}>
                <Feather name="shield" size={18} color="#fff" />
                <Text style={styles.safeBtnText}>I'M SAFE — STOP TIMER</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.hint}>
                Entering an unfamiliar area? If you don't tap I'm Safe before the timer
                runs out, an SOS is triggered automatically.
              </Text>
              <View style={styles.presetRow}>
                {PRESETS.map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => { setMinutes(m); setCustom(""); }}
                    style={[styles.preset, minutes === m && !custom && styles.presetActive]}
                  >
                    <Text style={[styles.presetText, minutes === m && !custom && { color: "#fff" }]}>
                      {m} min
                    </Text>
                  </Pressable>
                ))}
                <TextInput
                  value={custom}
                  onChangeText={setCustom}
                  placeholder="Custom"
                  placeholderTextColor={theme.muted2}
                  keyboardType="number-pad"
                  style={styles.customInput}
                />
              </View>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Optional note — e.g. Visiting client at Woji"
                placeholderTextColor={theme.muted2}
                style={styles.noteInput}
              />
              <Pressable style={styles.startBtn} onPress={begin}>
                <Feather name="clock" size={18} color="#fff" />
                <Text style={styles.startBtnText}>START SAFETY TIMER</Text>
              </Pressable>
            </>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: theme.border,
    ...cardShadow,
  },
  pillActive: { backgroundColor: theme.amber, borderColor: theme.amber },
  pillUrgent: { backgroundColor: theme.red, borderColor: theme.red },
  pillText: { fontSize: 12, fontFamily: font.bold, color: theme.text2 },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.4)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 34,
    gap: 14,
    ...cardShadow,
  },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sheetTitle: { fontSize: 15, fontFamily: font.black, color: theme.text },
  close: { padding: 6, borderRadius: 999, backgroundColor: theme.surfaceAlt },
  hint: { fontSize: 11.5, fontFamily: font.regular, color: theme.muted, lineHeight: 18 },
  bigCount: { fontSize: 46, fontFamily: font.black, color: theme.text, textAlign: "center" },

  presetRow: { flexDirection: "row", gap: 8 },
  preset: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceAlt,
    alignItems: "center",
  },
  presetActive: { backgroundColor: theme.amber, borderColor: theme.amber },
  presetText: { fontSize: 13, fontFamily: font.bold, color: theme.muted },
  customInput: {
    width: 76,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceAlt,
    textAlign: "center",
    fontFamily: font.bold,
    color: theme.text,
  },
  noteInput: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceAlt,
    fontFamily: font.regular,
    fontSize: 13,
    color: theme.text,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.amber,
    borderRadius: 14,
    paddingVertical: 15,
  },
  startBtnText: { color: "#fff", fontFamily: font.black, fontSize: 13, letterSpacing: 0.5 },
  safeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.teal,
    borderRadius: 14,
    paddingVertical: 15,
  },
  safeBtnText: { color: "#fff", fontFamily: font.black, fontSize: 13, letterSpacing: 0.5 },
});
