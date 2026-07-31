import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Incident } from "../lib/types";
import { confirmIncident } from "../services/backend";
import { cardShadow, confColor, font, radius, theme, TYPE_CFG } from "../theme";

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function IncidentDrawer({
  incident,
  onClose,
}: {
  incident: Incident | null;
  onClose: () => void;
}) {
  const [voted, setVoted] = useState<"yes" | "no" | null>(null);

  // reset the vote each time a new incident is opened
  useEffect(() => {
    setVoted(null);
  }, [incident?.id]);

  if (!incident) return null;
  const cfg = TYPE_CFG[incident.type] ?? TYPE_CFG.Other;
  const isLive = incident.sourceKind !== "citizen";
  const cc = confColor(incident.confidence);
  const sevColor =
    incident.severity >= 8 ? "#ef4444" : incident.severity >= 5 ? "#f59e0b" : theme.blue;

  const vote = (choice: "yes" | "no") => {
    setVoted(choice);
    confirmIncident(incident.id, choice === "yes").catch(() => {});
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Header badges + close */}
          <View style={styles.headerRow}>
            <View style={styles.badges}>
              <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: theme.border }]}>
                <Text style={[styles.badgeText, { color: cfg.text }]}>{incident.type}</Text>
              </View>
              {incident.status === "VERIFIED" && (
                <View style={[styles.badge, styles.verifiedBadge]}>
                  <Text style={[styles.badgeText, { color: theme.blue }]}>✓ VERIFIED</Text>
                </View>
              )}
              {isLive && (
                <View style={[styles.badge, styles.liveBadge]}>
                  <Text style={[styles.badgeText, { color: theme.teal }]}>⚡ LIVE AI</Text>
                </View>
              )}
            </View>
            <Pressable style={styles.close} onPress={onClose}>
              <Feather name="chevron-down" size={20} color={theme.muted} />
            </Pressable>
          </View>

          {/* Summary */}
          <Text style={styles.summary}>{incident.summary || incident.description}</Text>

          {/* Confidence */}
          <View style={{ gap: 6 }}>
            <View style={styles.confRow}>
              <Text style={styles.confLabel}>AI CONFIDENCE</Text>
              <Text style={[styles.confVal, { color: cc }]}>{incident.confidence}%</Text>
            </View>
            <View style={styles.confTrack}>
              <View style={[styles.confFill, { width: `${incident.confidence}%`, backgroundColor: cc }]} />
            </View>
          </View>

          {/* Meta grid */}
          <View style={styles.metaGrid}>
            <MetaCell value={`${incident.severity}/10`} label="Severity" color={sevColor} />
            <MetaCell value={String(incident.reportersCount)} label="Reports" color={theme.blue} />
            <MetaCell
              value={incident.status}
              label="Status"
              color={incident.status === "VERIFIED" ? theme.blue : theme.amber}
            />
          </View>

          {/* Location + time */}
          <View style={styles.locRow}>
            <View style={styles.locItem}>
              <Feather name="map-pin" size={12} color={theme.muted} />
              <Text style={styles.locText}>{incident.cues[0] ?? incident.locationName}</Text>
            </View>
            <View style={styles.locItem}>
              <Feather name="clock" size={12} color={theme.muted} />
              <Text style={styles.locText}>{timeAgo(incident.eventTime)}</Text>
            </View>
          </View>

          {/* Cues */}
          {incident.cues.length > 1 && (
            <View style={styles.cues}>
              {incident.cues.slice(1, 6).map((c) => (
                <View key={c} style={styles.cue}>
                  <Text style={styles.cueText}>{c}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Source link */}
          {incident.outlet && (
            <View style={styles.sourceBox}>
              <Feather name="external-link" size={13} color={theme.blue} />
              <Text style={styles.sourceText} numberOfLines={1}>
                Source: {incident.outlet}
              </Text>
            </View>
          )}

          {/* Crowd confirm */}
          {incident.status === "UNVERIFIED" && (
            <View style={{ gap: 10, paddingTop: 2 }}>
              <Text style={styles.confirmPrompt}>Can you confirm this incident?</Text>
              {voted ? (
                <View style={[styles.votedBox, voted === "yes" ? styles.votedYes : styles.votedNo]}>
                  <Feather
                    name={voted === "yes" ? "check" : "x"}
                    size={14}
                    color={voted === "yes" ? theme.blue : theme.muted}
                  />
                  <Text style={[styles.votedText, { color: voted === "yes" ? theme.blue : theme.muted }]}>
                    {voted === "yes" ? "Confirmed — helps verify this report" : "Marked as unconfirmed"}
                  </Text>
                </View>
              ) : (
                <View style={styles.voteRow}>
                  <Pressable style={[styles.voteBtn, styles.voteYes]} onPress={() => vote("yes")}>
                    <Feather name="check" size={16} color={theme.blue} />
                    <Text style={[styles.voteText, { color: theme.blue }]}>YES, I see it</Text>
                  </Pressable>
                  <Pressable style={[styles.voteBtn, styles.voteNo]} onPress={() => vote("no")}>
                    <Feather name="x" size={16} color={theme.muted} />
                    <Text style={[styles.voteText, { color: theme.muted }]}>NO</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function MetaCell({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.metaCell}>
      <Text style={[styles.metaValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.metaLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.4)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: "82%",
    ...cardShadow,
  },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: theme.border, marginTop: 12 },
  body: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 36, gap: 18 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, flexShrink: 1 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  badgeText: { fontSize: 11, fontFamily: font.black, letterSpacing: 1, textTransform: "uppercase" },
  verifiedBadge: { backgroundColor: "rgba(37,99,235,0.1)", borderColor: "rgba(37,99,235,0.3)" },
  liveBadge: { backgroundColor: "rgba(13,148,136,0.1)", borderColor: "rgba(13,148,136,0.3)" },
  close: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: theme.surfaceAlt,
    marginLeft: 8,
  },

  summary: { fontSize: 15, fontFamily: font.medium, color: theme.text2, lineHeight: 22 },

  confRow: { flexDirection: "row", justifyContent: "space-between" },
  confLabel: { fontSize: 9, fontFamily: font.bold, color: theme.muted, letterSpacing: 1 },
  confVal: { fontSize: 9, fontFamily: font.extra },
  confTrack: { height: 6, borderRadius: 3, backgroundColor: theme.border, overflow: "hidden" },
  confFill: { height: 6, borderRadius: 3 },

  metaGrid: { flexDirection: "row", gap: 10 },
  metaCell: {
    flex: 1,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    gap: 6,
  },
  metaValue: { fontSize: 14, fontFamily: font.black },
  metaLabel: { fontSize: 9, fontFamily: font.bold, color: theme.muted, letterSpacing: 1, textTransform: "uppercase" },

  locRow: { flexDirection: "row", gap: 18 },
  locItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  locText: { fontSize: 11, fontFamily: font.medium, color: theme.muted },

  cues: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cue: { backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  cueText: { fontSize: 9, fontFamily: font.semibold, color: theme.muted },

  sourceBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(37,99,235,0.06)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.15)",
    borderRadius: 12,
    padding: 11,
  },
  sourceText: { fontSize: 11, fontFamily: font.semibold, color: theme.blue, flex: 1 },

  confirmPrompt: { fontSize: 12, fontFamily: font.medium, color: theme.muted, textAlign: "center" },
  voteRow: { flexDirection: "row", gap: 10 },
  voteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  voteYes: { backgroundColor: "rgba(37,99,235,0.12)", borderColor: "rgba(37,99,235,0.3)" },
  voteNo: { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
  voteText: { fontSize: 12, fontFamily: font.bold },
  votedBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  votedYes: { backgroundColor: "rgba(37,99,235,0.1)", borderColor: "rgba(37,99,235,0.25)" },
  votedNo: { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
  votedText: { fontSize: 12, fontFamily: font.bold },
});
