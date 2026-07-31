import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { Emergency, Incident } from "../lib/types";
import { LEVEL_META } from "../lib/types";
import { FadeIn } from "../components/anim";
import IncidentDrawer from "../components/IncidentDrawer";
import { cardShadow, font, radius, theme, TYPE_CFG } from "../theme";

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

type Row = { kind: "sos"; e: Emergency } | { kind: "incident"; i: Incident };

export default function AlertsScreen({
  incidents,
  emergencies,
}: {
  incidents: Incident[];
  emergencies: Emergency[];
}) {
  const [tab, setTab] = useState<"live" | "alerts">("live");
  const [selected, setSelected] = useState<Incident | null>(null);

  const activeSos = emergencies.filter((e) => e.status === "ACTIVE");
  const openIncidents = incidents.filter((i) => i.status !== "CLOSED");

  // Live = SOS + AI/news/social feed. Alerts = crowd-verified incidents.
  const liveRows: Row[] = [
    ...activeSos.map((e) => ({ kind: "sos" as const, e })),
    ...openIncidents.filter((i) => i.sourceKind !== "citizen").map((i) => ({ kind: "incident" as const, i })),
  ];
  const alertRows: Row[] = openIncidents
    .filter((i) => i.status === "VERIFIED")
    .map((i) => ({ kind: "incident" as const, i }));
  const rows = tab === "live" ? liveRows : alertRows;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient colors={["#f87171", "#dc2626"]} style={styles.logo}>
          <Feather name="bell" size={18} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Alerts</Text>
          <Text style={styles.sub}>LIVE AI + CROWD · PORT HARCOURT</Text>
        </View>
        {activeSos.length > 0 && (
          <View style={styles.headBadge}>
            <Text style={styles.headBadgeText}>{activeSos.length}</Text>
          </View>
        )}
      </View>

      {/* Sub-tabs */}
      <View style={styles.tabs}>
        {(["live", "alerts"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "live" ? `Live (${liveRows.length})` : `Alerts (${alertRows.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => (r.kind === "sos" ? r.e.id : r.i.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bell-off" size={40} color={theme.border} />
            <Text style={styles.emptyText}>
              {tab === "live" ? "No live activity right now." : "No verified alerts yet."}
            </Text>
            <Text style={styles.emptySub}>Updates appear here automatically.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const delay = Math.min(index, 8) * 45;
          if (item.kind === "sos") {
            const meta = LEVEL_META[item.e.level];
            return (
              <FadeIn delay={delay} style={[styles.card, styles.sosCard]}>
                <View style={styles.sosIcon}>
                  <Feather name="alert-octagon" size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sosTitle}>
                    {meta.emoji} SOS — {meta.label}
                  </Text>
                  <Text style={styles.sosSub}>Someone nearby needs help · {timeAgo(item.e.startedAt)}</Text>
                </View>
              </FadeIn>
            );
          }
          const inc = item.i;
          const cfg = TYPE_CFG[inc.type] ?? TYPE_CFG.Other;
          return (
            <FadeIn delay={delay}>
              <Pressable style={styles.card} onPress={() => setSelected(inc)}>
                <View style={styles.cardTop}>
                  <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.typeText, { color: cfg.text }]}>{inc.type}</Text>
                  </View>
                  <Text style={styles.time}>{timeAgo(inc.eventTime)}</Text>
                </View>
                <Text style={styles.msg} numberOfLines={2}>
                  {inc.summary || inc.description}
                </Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Feather name="map-pin" size={11} color={theme.muted2} />
                    <Text style={styles.metaText}>{inc.cues[0] ?? inc.locationName}</Text>
                  </View>
                  <View style={styles.viewMap}>
                    <Text style={styles.viewMapText}>View details</Text>
                    <Feather name="chevron-right" size={12} color={theme.blue} />
                  </View>
                </View>
              </Pressable>
            </FadeIn>
          );
        }}
      />

      <IncidentDrawer incident={selected} onClose={() => setSelected(null)} />
    </View>
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
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.red,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  title: { fontSize: 17, fontFamily: font.extra, color: theme.text },
  sub: { fontSize: 9, fontFamily: font.medium, color: theme.muted, letterSpacing: 1.2, marginTop: 2 },
  headBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  headBadgeText: { color: "#fff", fontSize: 11, fontFamily: font.black },

  tabs: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.surfaceAlt,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  tabActive: { backgroundColor: theme.blue, borderColor: theme.blue },
  tabText: { fontSize: 12, fontFamily: font.bold, color: theme.muted },
  tabTextActive: { color: "#fff" },

  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 70, gap: 10 },
  emptyText: { color: theme.text2, fontFamily: font.semibold, fontSize: 14 },
  emptySub: { color: theme.muted, fontFamily: font.regular, fontSize: 12 },

  card: {
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    gap: 10,
    ...cardShadow,
  },
  sosCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderColor: "rgba(220,38,38,0.3)",
    backgroundColor: "rgba(254,242,242,0.9)",
  },
  sosIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.red,
    alignItems: "center",
    justifyContent: "center",
  },
  sosTitle: { fontSize: 13, fontFamily: font.extra, color: theme.red },
  sosSub: { fontSize: 11, fontFamily: font.medium, color: theme.muted, marginTop: 2 },

  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  typeText: { fontSize: 10, fontFamily: font.black, letterSpacing: 0.8, textTransform: "uppercase" },
  time: { fontSize: 10, fontFamily: font.bold, color: theme.muted2 },
  msg: { fontSize: 13.5, fontFamily: font.medium, color: theme.text2, lineHeight: 20 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 },
  metaText: { fontSize: 10.5, fontFamily: font.bold, color: theme.muted },
  viewMap: { flexDirection: "row", alignItems: "center", gap: 3 },
  viewMapText: { fontSize: 10.5, fontFamily: font.bold, color: theme.blue },
});
