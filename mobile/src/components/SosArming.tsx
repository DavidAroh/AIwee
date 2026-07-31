/**
 * SosArming — the web app's arming stage, ported: after the 2s hold completes,
 * a full-screen red overlay counts down 3s (cancel window). Picking a level
 * fires immediately; letting it expire fires as Personal Threat.
 */
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { EmergencyLevel } from "../lib/types";
import { LEVEL_META } from "../lib/types";
import { font } from "../theme";

const COUNTDOWN_S = 3;
const PICKABLE: EmergencyLevel[] = ["THREAT", "MEDICAL", "KIDNAP", "VIOLENCE", "SILENT"];

export default function SosArming({
  visible,
  onFire,
  onCancel,
}: {
  visible: boolean;
  onFire: (level: EmergencyLevel) => void;
  onCancel: () => void;
}) {
  const [countdown, setCountdown] = useState(COUNTDOWN_S);

  useEffect(() => {
    if (!visible) return;
    setCountdown(COUNTDOWN_S);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          onFire("THREAT");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Text style={styles.kicker}>ACTIVATING SOS</Text>

        <View style={styles.countWrap}>
          <Text style={styles.count}>{countdown}</Text>
        </View>

        <Text style={styles.hint}>
          Broadcasting in {countdown}s as <Text style={{ fontFamily: font.black }}>Personal Threat</Text> — or choose:
        </Text>

        <View style={styles.levels}>
          {PICKABLE.map((lvl) => {
            const meta = LEVEL_META[lvl];
            const silent = lvl === "SILENT";
            return (
              <Pressable
                key={lvl}
                onPress={() => onFire(lvl)}
                style={[styles.level, silent ? styles.levelSilent : styles.levelRed]}
              >
                <Text style={{ fontSize: 20 }}>{meta.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.levelTitle}>{meta.label}</Text>
                  <Text style={styles.levelSub}>{meta.phrase}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.cancel} onPress={onCancel}>
          <Feather name="x" size={16} color="#b91c1c" />
          <Text style={styles.cancelText}>CANCEL</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(69,10,10,0.97)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  kicker: { color: "#fecaca", fontSize: 11, fontFamily: font.extra, letterSpacing: 3 },
  countWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 4,
    borderColor: "rgba(239,68,68,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  count: { color: "#fff", fontSize: 56, fontFamily: font.black },
  hint: { color: "#fee2e2", fontSize: 13, fontFamily: font.regular, textAlign: "center", maxWidth: 300 },
  levels: { width: "100%", maxWidth: 340, gap: 8 },
  level: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
  },
  levelRed: { backgroundColor: "rgba(220,38,38,0.3)", borderColor: "rgba(239,68,68,0.5)" },
  levelSilent: { backgroundColor: "rgba(30,41,59,0.8)", borderColor: "#475569" },
  levelTitle: { color: "#fff", fontSize: 14, fontFamily: font.bold },
  levelSub: { color: "rgba(254,202,202,0.8)", fontSize: 10, fontFamily: font.regular, marginTop: 1 },
  cancel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingVertical: 13,
    paddingHorizontal: 30,
    borderRadius: 999,
    marginTop: 4,
  },
  cancelText: { color: "#b91c1c", fontSize: 13, fontFamily: font.black, letterSpacing: 0.5 },
});
