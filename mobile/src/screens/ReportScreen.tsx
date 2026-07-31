import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import type { Incident } from "../lib/types";
import { submitReport } from "../services/backend";
import { ensureLocationPermission, getCurrentPoint } from "../services/sos";
import { FadeIn, PulseDot } from "../components/anim";
import { cardShadow, confColor, font, theme, TYPE_CFG } from "../theme";

const QUICK_TYPES = [
  { label: "Fire", emoji: "🔥" },
  { label: "Accident", emoji: "🚗" },
  { label: "Crime", emoji: "🚨" },
  { label: "Medical", emoji: "🏥" },
  { label: "Natural Disaster", emoji: "🌪️" },
  { label: "Other", emoji: "❓" },
];

export default function ReportScreen({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [type, setType] = useState<string>("");
  const [desc, setDesc] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [stage, setStage] = useState<"form" | "analyzing" | "done">("form");
  const [result, setResult] = useState<Incident | null>(null);

  const reset = () => {
    setType("");
    setDesc("");
    setPhoto(null);
    setResult(null);
    setStage("form");
  };

  const close = () => {
    reset();
    onClose();
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
    });
    if (!res.canceled && res.assets[0]) setPhoto(res.assets[0].uri);
  };

  const submit = async () => {
    if (!desc.trim()) return;
    setStage("analyzing");
    await ensureLocationPermission();
    const point = await getCurrentPoint();
    try {
      const incident = await submitReport({
        description: desc.trim(),
        quickType: type || undefined,
        latitude: point.lat,
        longitude: point.lng,
      });
      setResult(incident);
    } catch {
      setResult(null);
    }
    setStage("done");
  };

  const sevColor = (s: number) => (s >= 8 ? "#ef4444" : s >= 5 ? "#f59e0b" : "#10b981");

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient colors={["#fb923c", "#ef4444"]} style={styles.logo}>
            <Feather name="upload-cloud" size={18} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Report Incident</Text>
            <Text style={styles.sub}>ANONYMOUS · GPS AUTO-ATTACHED · AI-ANALYSIS</Text>
          </View>
          <Pressable style={styles.close} onPress={close}>
            <Feather name="x" size={18} color={theme.muted} />
          </Pressable>
        </View>

        {stage === "analyzing" ? (
          /* ── AI Analyzing ─────────────────────────────────── */
          <View style={styles.center}>
            <View style={styles.analyzeIcon}>
              <PulseDot size={16} color={theme.blue} />
              <Feather name="zap" size={38} color={theme.blue} style={{ position: "absolute" }} />
            </View>
            <Text style={styles.analyzeTitle}>AI Analyzing…</Text>
            <Text style={styles.analyzeSub}>
              Classifying incident type, extracting severity cues, and scoring confidence.
            </Text>
          </View>
        ) : stage === "done" ? (
          /* ── Submitted + analysis results ─────────────────── */
          <ScrollView contentContainerStyle={styles.doneWrap} showsVerticalScrollIndicator={false}>
            <FadeIn style={{ alignItems: "center", gap: 10 }}>
              <View style={styles.successIcon}>
                <Feather name="check-circle" size={44} color={theme.blue} />
              </View>
              <Text style={styles.successTitle}>Report Submitted</Text>
              <Text style={styles.successSub}>
                Anonymous · GPS attached · Sent for crowd verification
              </Text>
            </FadeIn>

            {result && (
              <FadeIn delay={120} style={styles.resultCard}>
                <View style={styles.resultHead}>
                  <Feather name="zap" size={14} color={theme.blue} />
                  <Text style={styles.resultHeadText}>AI ANALYSIS RESULTS</Text>
                </View>

                <View style={styles.resultBadges}>
                  <View
                    style={[
                      styles.resultBadge,
                      { backgroundColor: (TYPE_CFG[result.type] ?? TYPE_CFG.Other).bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.resultBadgeText,
                        { color: (TYPE_CFG[result.type] ?? TYPE_CFG.Other).dot },
                      ]}
                    >
                      ● {result.type}
                    </Text>
                  </View>
                  <View
                    style={[styles.resultBadge, { backgroundColor: `${sevColor(result.severity)}20` }]}
                  >
                    <Text style={[styles.resultBadgeText, { color: sevColor(result.severity) }]}>
                      Severity {result.severity}/10
                    </Text>
                  </View>
                </View>

                <View style={{ gap: 6 }}>
                  <View style={styles.confRow}>
                    <Text style={styles.confLabel}>AI CONFIDENCE</Text>
                    <Text style={[styles.confLabel, { color: confColor(result.confidence) }]}>
                      {result.confidence}%
                    </Text>
                  </View>
                  <View style={styles.confTrack}>
                    <View
                      style={[
                        styles.confFill,
                        { width: `${result.confidence}%`, backgroundColor: confColor(result.confidence) },
                      ]}
                    />
                  </View>
                </View>

                {result.cues.length > 0 && (
                  <View style={styles.cues}>
                    {result.cues.slice(0, 5).map((c) => (
                      <View key={c} style={styles.cue}>
                        <Text style={styles.cueText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </FadeIn>
            )}

            <FadeIn delay={200} style={{ width: "100%", gap: 10 }}>
              <Pressable style={styles.primaryBtn} onPress={close}>
                <Text style={styles.primaryText}>View on Map</Text>
                <Feather name="chevron-right" size={16} color="#fff" />
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={reset}>
                <Text style={styles.secondaryText}>Report Another Incident</Text>
              </Pressable>
            </FadeIn>
          </ScrollView>
        ) : (
          /* ── Form ─────────────────────────────────────────── */
          <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }} keyboardShouldPersistTaps="handled">
            <View>
              <Text style={styles.fieldLabel}>INCIDENT TYPE</Text>
              <View style={styles.grid}>
                {QUICK_TYPES.map((t) => {
                  const sel = type === t.label;
                  const cfg = TYPE_CFG[t.label] ?? TYPE_CFG.Other;
                  return (
                    <Pressable
                      key={t.label}
                      onPress={() => setType(sel ? "" : t.label)}
                      style={[styles.typeCell, sel && { backgroundColor: cfg.bg, borderColor: cfg.dot }]}
                    >
                      <Text style={{ fontSize: 22 }}>{t.emoji}</Text>
                      <Text
                        style={[styles.typeCellText, sel && { color: cfg.dot }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.gpsRow}>
              <Feather name="map-pin" size={16} color={theme.blue} />
              <View style={{ flex: 1 }}>
                <Text style={styles.gpsTitle}>GPS Location Auto-Attached</Text>
                <Text style={styles.gpsSub}>Coordinates shared anonymously for verification only.</Text>
              </View>
            </View>

            <View>
              <Text style={styles.fieldLabel}>WHAT HAPPENED? *</Text>
              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder="Describe the incident — vehicle type, number of people, visible hazards, time it started…"
                placeholderTextColor={theme.muted2}
                multiline
                style={styles.textarea}
              />
              <Text style={styles.charCount}>{desc.length} chars</Text>
            </View>

            {/* Evidence photo */}
            <View>
              <Text style={styles.fieldLabel}>EVIDENCE (OPTIONAL)</Text>
              {photo ? (
                <View style={styles.photoWrap}>
                  <Image source={{ uri: photo }} style={styles.photo} />
                  <Pressable style={styles.photoRemove} onPress={() => setPhoto(null)}>
                    <Feather name="x" size={14} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.photoPick} onPress={pickPhoto}>
                  <Feather name="camera" size={26} color={theme.muted} />
                  <Text style={styles.photoPickText}>Tap to attach a photo</Text>
                </Pressable>
              )}
            </View>

            <Pressable
              disabled={!desc.trim()}
              onPress={submit}
              style={[styles.submitBtn, !desc.trim() && styles.submitDisabled]}
            >
              <Feather name="upload-cloud" size={16} color="#fff" />
              <Text style={styles.submitText}>Submit Report</Text>
              <Feather name="chevron-right" size={16} color="#fff" />
            </Pressable>
            <Text style={styles.disclaimer}>
              Anonymous report · No personal data stored · Location cannot be edited
            </Text>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: {
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  logo: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontFamily: font.extra, color: theme.text },
  sub: { fontSize: 8.5, fontFamily: font.medium, color: theme.muted, letterSpacing: 1, marginTop: 2 },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },

  fieldLabel: { fontSize: 10, fontFamily: font.extra, color: theme.muted, letterSpacing: 1.5, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeCell: {
    width: "31.5%",
    aspectRatio: 1.4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  typeCellText: { fontSize: 11.5, fontFamily: font.bold, color: theme.muted },

  gpsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(37,99,235,0.08)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.2)",
    borderRadius: 18,
    padding: 14,
  },
  gpsTitle: { fontSize: 12, fontFamily: font.bold, color: theme.blue },
  gpsSub: { fontSize: 10, fontFamily: font.regular, color: theme.muted, marginTop: 2 },

  textarea: {
    height: 130,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 18,
    padding: 14,
    fontSize: 14,
    fontFamily: font.regular,
    color: theme.text,
    textAlignVertical: "top",
  },
  charCount: { fontSize: 10, fontFamily: font.regular, color: theme.muted2, textAlign: "right", marginTop: 6 },

  photoWrap: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: theme.border },
  photo: { width: "100%", height: 170 },
  photoRemove: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoPick: {
    height: 110,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoPickText: { fontSize: 12, fontFamily: font.semibold, color: theme.muted },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.blue,
    borderRadius: 16,
    paddingVertical: 16,
    ...cardShadow,
  },
  submitDisabled: { backgroundColor: theme.border },
  submitText: { color: "#fff", fontFamily: font.bold, fontSize: 14 },
  disclaimer: { fontSize: 10, fontFamily: font.regular, color: theme.muted2, textAlign: "center" },

  // Analyzing
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  analyzeIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(37,99,235,0.1)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  analyzeTitle: { fontSize: 20, fontFamily: font.extra, color: theme.text },
  analyzeSub: { fontSize: 12.5, fontFamily: font.regular, color: theme.muted, textAlign: "center", maxWidth: 280, lineHeight: 19 },

  // Done
  doneWrap: { padding: 20, gap: 18, alignItems: "center" },
  successIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(37,99,235,0.12)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 20, fontFamily: font.extra, color: theme.text },
  successSub: { fontSize: 12, fontFamily: font.regular, color: theme.muted, textAlign: "center" },

  resultCard: {
    width: "100%",
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    ...cardShadow,
  },
  resultHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultHeadText: { fontSize: 11, fontFamily: font.extra, color: theme.text2, letterSpacing: 1 },
  resultBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  resultBadge: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 10 },
  resultBadgeText: { fontSize: 11, fontFamily: font.extra, textTransform: "uppercase", letterSpacing: 0.5 },
  confRow: { flexDirection: "row", justifyContent: "space-between" },
  confLabel: { fontSize: 9, fontFamily: font.extra, color: theme.muted, letterSpacing: 1 },
  confTrack: { height: 7, borderRadius: 4, backgroundColor: theme.border, overflow: "hidden" },
  confFill: { height: 7, borderRadius: 4 },
  cues: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cue: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  cueText: { fontSize: 9, fontFamily: font.semibold, color: theme.muted },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: theme.blue,
    borderRadius: 16,
    paddingVertical: 15,
  },
  primaryText: { color: "#fff", fontFamily: font.bold, fontSize: 14 },
  secondaryBtn: {
    alignItems: "center",
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    paddingVertical: 14,
  },
  secondaryText: { color: theme.text2, fontFamily: font.bold, fontSize: 13 },
});
