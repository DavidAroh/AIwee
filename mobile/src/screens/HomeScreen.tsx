import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { Emergency, EmergencyLevel, Incident } from "../lib/types";
import IncidentMap from "../components/IncidentMap";
import IncidentDrawer from "../components/IncidentDrawer";
import SafetyTimer from "../components/SafetyTimer";
import SosArming from "../components/SosArming";
import LiveBadge from "../components/LiveBadge";
import { Breathe, Crossfade, FadeIn, PulseDot } from "../components/anim";
import { cardShadow, confColor, font, radius, theme, TYPE_CFG } from "../theme";

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function HomeScreen({
  incidents,
  emergencies,
  loading,
  refreshing,
  onRefresh,
  onActivateSos,
  onSafetyExpire,
  onReport,
}: {
  incidents: Incident[];
  emergencies: Emergency[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onActivateSos: (level: EmergencyLevel) => void;
  onSafetyExpire: () => void;
  onReport: () => void;
}) {
  const [tab, setTab] = useState<"map" | "feed">("map");
  const [selected, setSelected] = useState<Incident | null>(null);

  // ── SOS hold-to-arm (2s), then a 3s cancel countdown (SosArming) ──────────
  const HOLD_MS = 2000;
  const [holdProgress, setHoldProgress] = useState(0);
  const [holdHint, setHoldHint] = useState(false);
  const [arming, setArming] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStart = useRef(0);

  const clearHold = () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    setHoldProgress(0);
  };
  const onSosPressIn = () => {
    holdStart.current = Date.now();
    holdTimer.current = setInterval(() => {
      const p = (Date.now() - holdStart.current) / HOLD_MS;
      if (p >= 1) {
        clearHold();
        setArming(true);
      } else {
        setHoldProgress(p);
      }
    }, 50);
  };
  const onSosPressOut = () => {
    if (holdTimer.current && Date.now() - holdStart.current < HOLD_MS) {
      setHoldHint(true);
      setTimeout(() => setHoldHint(false), 2000);
    }
    clearHold();
  };
  const active = incidents.filter((i) => i.status !== "CLOSED");
  const verified = active.filter((i) => i.status === "VERIFIED").length;
  const liveCount = active.filter((i) => i.sourceKind !== "citizen").length;

  // Keep the open drawer in sync as the store updates (e.g. a vote verifies it).
  useEffect(() => {
    if (selected) {
      const updated = incidents.find((i) => i.id === selected.id) ?? null;
      if (updated !== selected) setSelected(updated);
    }
  }, [incidents]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.root}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headRow}>
          <View style={styles.brandRow}>
            <LinearGradient colors={["#3b82f6", "#1d4ed8"]} style={styles.logo}>
              <Feather name="shield" size={18} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={styles.brand}>AiWee</Text>
              <Text style={styles.region}>PORT HARCOURT</Text>
            </View>
          </View>

          <View style={styles.toggle}>
            {(["map", "feed"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[styles.toggleBtn, tab === t && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, tab === t && styles.toggleTextActive]}>
                  {t === "map" ? "Map" : "Feed"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.statusBar}>
          <LiveBadge count={active.length} onRefresh={onRefresh} />
          {liveCount > 0 && (
            <View style={styles.aiChip}>
              <Feather name="zap" size={9} color={theme.blue} />
              <Text style={styles.aiChipText}>{liveCount} AI-sourced</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Content (map stays mounted; feed crossfades over it) ─────── */}
      <View style={styles.content}>
        <View style={styles.mapWrap}>
          <IncidentMap incidents={active} emergencies={emergencies} onSelectIncident={setSelected} />

          {tab === "map" && (
            <>
              {/* Stat overlays */}
              <FadeIn style={styles.stats} from={-10}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>ACTIVE</Text>
                  <Text style={styles.statValue}>{active.length}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>VERIFIED</Text>
                  <Text style={[styles.statValue, { color: theme.blue }]}>{verified}</Text>
                </View>
              </FadeIn>

              {/* SOS — hold 2s to arm (progress ring fill) */}
              <View style={styles.sosBtn}>
                {holdHint && (
                  <View style={styles.holdHint}>
                    <Text style={styles.holdHintText}>Hold for 2s to activate SOS</Text>
                  </View>
                )}
                <Breathe max={1.05}>
                  <Pressable onPressIn={onSosPressIn} onPressOut={onSosPressOut}>
                    <LinearGradient colors={["#ef4444", "#b91c1c"]} style={styles.sosGrad}>
                      {holdProgress > 0 && (
                        <View
                          style={[
                            styles.holdFill,
                            { height: `${holdProgress * 100}%` },
                          ]}
                        />
                      )}
                      <Feather name="alert-octagon" size={20} color="#fff" />
                      <Text style={styles.sosLabel}>SOS</Text>
                    </LinearGradient>
                  </Pressable>
                </Breathe>
              </View>

              {/* Safety timer (dead-man's switch) */}
              <FadeIn style={styles.safetyWrap} delay={60}>
                <SafetyTimer onExpire={onSafetyExpire} />
              </FadeIn>

              {/* Report FAB */}
              <FadeIn style={styles.fab} delay={80}>
                <Pressable onPress={onReport}>
                  <LinearGradient colors={["#2563eb", "#3b82f6"]} style={styles.fabGrad}>
                    <Feather name="plus" size={26} color="#fff" />
                  </LinearGradient>
                </Pressable>
              </FadeIn>

              {/* Incident ticker */}
              {active.length > 0 && (
                <FadeIn style={styles.ticker} from={20} delay={120}>
                  <Pressable style={styles.tickerInner} onPress={() => setSelected(active[0])}>
                    <View style={styles.tickerIcon}>
                      <Feather name="alert-triangle" size={16} color={theme.blue} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tickerTitle} numberOfLines={1}>
                        {active[0].summary || active[0].description}
                      </Text>
                      <View style={styles.tickerMetaRow}>
                        <PulseDot size={6} color={theme.blue} />
                        <Text style={styles.tickerMeta}>{active[0].type} · VIEW DETAILS</Text>
                      </View>
                    </View>
                    <Feather name="chevron-right" size={20} color="rgba(37,99,235,0.5)" />
                  </Pressable>
                </FadeIn>
              )}
            </>
          )}
        </View>

        {tab === "feed" && (
          <Crossfade trigger="feed" style={styles.feedOverlay}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={theme.blue} />
              </View>
            ) : (
              <FlatList
                data={active}
                keyExtractor={(i) => i.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.blue} />
                }
                ListEmptyComponent={
                  <FadeIn style={styles.empty}>
                    <Feather name="shield" size={44} color={theme.border} />
                    <Text style={styles.emptyText}>All clear — no active incidents.</Text>
                    <Text style={styles.emptySub}>Live feed updates automatically.</Text>
                  </FadeIn>
                }
                renderItem={({ item, index }) => {
                  const cfg = TYPE_CFG[item.type] ?? TYPE_CFG.Other;
                  const isLive = item.sourceKind !== "citizen";
                  return (
                    <FadeIn delay={Math.min(index, 8) * 45}>
                      <Pressable style={styles.card} onPress={() => setSelected(item)}>
                        <View style={styles.cardRow1}>
                          <View style={styles.badges}>
                            <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                              <Text style={[styles.typeBadgeText, { color: cfg.text }]}>{item.type}</Text>
                            </View>
                            {item.status === "VERIFIED" && (
                              <View style={styles.verifiedBadge}>
                                <Text style={styles.verifiedText}>✓ VERIFIED</Text>
                              </View>
                            )}
                            {isLive && (
                              <View style={styles.liveBadge}>
                                <Text style={styles.liveBadgeText}>⚡ LIVE</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.timeChip}>
                            <Feather name="clock" size={11} color={theme.muted2} />
                            <Text style={styles.timeText}>{timeAgo(item.eventTime)}</Text>
                          </View>
                        </View>

                        <Text style={styles.summary} numberOfLines={2}>
                          {item.summary || item.description}
                        </Text>

                        <View style={styles.confBox}>
                          <View style={styles.confRow}>
                            <Text style={styles.confLabel}>AI CONFIDENCE</Text>
                            <Text style={[styles.confVal, { color: confColor(item.confidence) }]}>
                              {item.confidence}%
                            </Text>
                          </View>
                          <View style={styles.confTrack}>
                            <View
                              style={[
                                styles.confFill,
                                { width: `${item.confidence}%`, backgroundColor: confColor(item.confidence) },
                              ]}
                            />
                          </View>
                        </View>

                        <View style={styles.cardFooter}>
                          <View style={styles.footItem}>
                            <Feather name="map-pin" size={12} color={theme.muted} />
                            <Text style={styles.footText} numberOfLines={1}>
                              {item.cues[0] ?? item.locationName}
                            </Text>
                          </View>
                          <View style={styles.footItem}>
                            <Feather name="users" size={12} color={theme.muted} />
                            <Text style={styles.footText}>
                              {item.reportersCount} report{item.reportersCount !== 1 ? "s" : ""}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    </FadeIn>
                  );
                }}
              />
            )}
          </Crossfade>
        )}
      </View>

      {/* Incident detail + crowd verification */}
      <IncidentDrawer incident={selected} onClose={() => setSelected(null)} />

      {/* SOS arming — 3s cancel window + level picker */}
      <SosArming
        visible={arming}
        onFire={(level) => {
          setArming(false);
          onActivateSos(level);
        }}
        onCancel={() => setArming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },

  // Header
  header: {
    paddingTop: 52,
    backgroundColor: theme.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.blue,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  brand: { fontSize: 15, fontFamily: font.extra, color: theme.text, letterSpacing: -0.3 },
  region: { fontSize: 9, fontFamily: font.medium, color: theme.muted, letterSpacing: 1.4, marginTop: 2 },
  toggle: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "rgba(226,232,240,0.7)",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 999,
    padding: 4,
  },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999 },
  toggleBtnActive: {
    backgroundColor: theme.blue,
    shadowColor: theme.blue,
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  toggleText: { fontSize: 12, fontFamily: font.bold, color: theme.muted, textTransform: "capitalize" },
  toggleTextActive: { color: "#fff" },
  statusBar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  aiChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(37,99,235,0.1)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.2)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  aiChipText: { fontSize: 9, fontFamily: font.bold, color: theme.blue },

  // Content
  content: { flex: 1 },
  mapWrap: { ...StyleSheet.absoluteFillObject },
  feedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.bg },

  stats: { position: "absolute", top: 12, right: 12, gap: 8, zIndex: 20 },
  statCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 76,
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: theme.border,
    ...cardShadow,
  },
  statLabel: { fontSize: 8, fontFamily: font.extra, color: theme.muted, letterSpacing: 1.5 },
  statValue: { fontSize: 24, fontFamily: font.black, color: theme.text, lineHeight: 28 },

  safetyWrap: { position: "absolute", bottom: 256, left: 16, zIndex: 20 },
  sosBtn: { position: "absolute", bottom: 178, left: 16, zIndex: 20 },
  holdHint: {
    position: "absolute",
    bottom: 74,
    left: 0,
    backgroundColor: "rgba(15,23,42,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    width: 190,
  },
  holdHintText: { color: "#fff", fontSize: 10.5, fontFamily: font.bold },
  holdFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  sosGrad: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    shadowColor: theme.red,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  sosLabel: { color: "#fff", fontFamily: font.black, fontSize: 11, letterSpacing: 1.5 },

  fab: { position: "absolute", bottom: 178, right: 16, zIndex: 20 },
  fabGrad: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.blue,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },

  ticker: {
    position: "absolute",
    bottom: 104,
    left: 16,
    right: 16,
    zIndex: 30,
    elevation: 14,
  },
  tickerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(241,245,249,0.97)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  tickerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(37,99,235,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  tickerTitle: { fontSize: 12.5, fontFamily: font.bold, color: theme.text2 },
  tickerMetaRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 3 },
  tickerMeta: { fontSize: 10, fontFamily: font.semibold, color: theme.muted, letterSpacing: 0.5 },

  // Feed
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 80, gap: 10 },
  emptyText: { color: theme.text2, fontFamily: font.semibold, fontSize: 14 },
  emptySub: { color: theme.muted, fontFamily: font.regular, fontSize: 12 },

  card: {
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.xl,
    padding: 18,
    marginBottom: 12,
    gap: 12,
    ...cardShadow,
  },
  cardRow1: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  badges: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1, flexWrap: "wrap" },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  typeBadgeText: { fontSize: 10, fontFamily: font.black, letterSpacing: 1, textTransform: "uppercase" },
  verifiedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.2)",
    backgroundColor: "rgba(37,99,235,0.1)",
  },
  verifiedText: { fontSize: 10, fontFamily: font.black, letterSpacing: 0.8, color: theme.blue },
  liveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(13,148,136,0.2)",
    backgroundColor: "rgba(13,148,136,0.1)",
  },
  liveBadgeText: { fontSize: 10, fontFamily: font.black, letterSpacing: 0.8, color: theme.teal },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  timeText: { fontSize: 10, fontFamily: font.bold, color: theme.muted },
  summary: { fontSize: 14, fontFamily: font.medium, color: theme.text2, lineHeight: 21 },
  confBox: {
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  confRow: { flexDirection: "row", justifyContent: "space-between" },
  confLabel: { fontSize: 9, fontFamily: font.extra, color: theme.muted, letterSpacing: 1 },
  confVal: { fontSize: 9, fontFamily: font.extra },
  confTrack: { height: 6, borderRadius: 3, backgroundColor: theme.border, overflow: "hidden" },
  confFill: { height: 6, borderRadius: 3 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
  },
  footItem: { flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 },
  footText: { fontSize: 10.5, fontFamily: font.bold, color: theme.muted },
});
