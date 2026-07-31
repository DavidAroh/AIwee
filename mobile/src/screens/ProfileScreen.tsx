import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import type { Incident } from "../lib/types";
import { FadeIn } from "../components/anim";
import { cardShadow, font, radius, theme } from "../theme";

const SESSION_ID = "AW-" + Math.random().toString(36).slice(2, 8).toUpperCase();

const TRUST_LEVELS = [
  { min: 0, max: 25, label: "Observer", color: theme.muted },
  { min: 25, max: 50, label: "Contributor", color: "#3b82f6" },
  { min: 50, max: 75, label: "Verifier", color: theme.blue },
  { min: 75, max: 101, label: "Civic Guardian", color: theme.amber },
];

const MENU: { icon: keyof typeof Feather.glyphMap; label: string; sub: string; settings?: boolean }[] = [
  { icon: "bell", label: "Notifications", sub: "Alerts within your radius", settings: true },
  { icon: "map-pin", label: "Coverage Area", sub: "Port Harcourt · 3 km radius", settings: true },
  { icon: "bar-chart-2", label: "Impact Report", sub: "Your contributions" },
  { icon: "shield", label: "Privacy & Data", sub: "Anonymous by default · No ID required" },
  { icon: "star", label: "Rate AiWee", sub: "Help us improve" },
  { icon: "info", label: "About AiWee", sub: "v1.0 · Civic incident platform" },
];

const RADII = [1, 3, 5, 10];
const NOTIFS = [
  { key: "verify", label: "Verification Requests", sub: "Help verify nearby reports" },
  { key: "urgent", label: "Urgent Alerts", sub: "Critical incidents in your area" },
  { key: "caution", label: "Cautionary Alerts", sub: "Verified incidents nearby" },
  { key: "info", label: "Informational", sub: "General area updates" },
] as const;

export default function ProfileScreen({ incidents }: { incidents: Incident[] }) {
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState(false);
  const [radiusKm, setRadiusKm] = useState(3);
  const [notif, setNotif] = useState<Record<string, boolean>>({
    verify: true,
    urgent: true,
    caution: true,
    info: false,
  });

  const reports = incidents.filter((i) => i.sourceKind === "citizen").length;
  const active = incidents.filter((i) => i.status !== "CLOSED").length;
  const verified = incidents.filter((i) => i.status === "VERIFIED").length;
  const trust = Math.min(100, reports * 5 + 10);
  const level = TRUST_LEVELS.find((l) => trust >= l.min && trust < l.max) ?? TRUST_LEVELS[0];

  const copyId = async () => {
    await Clipboard.setStringAsync(SESSION_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.sub}>Anonymous citizen account</Text>
        </View>
        <Pressable style={styles.gear} onPress={() => setSettings(true)}>
          <Feather name="settings" size={16} color={theme.muted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Avatar card */}
        <FadeIn style={styles.avatarCard}>
          <LinearGradient colors={["rgba(37,99,235,0.25)", "rgba(59,130,246,0.25)"]} style={styles.avatar}>
            <Text style={{ fontSize: 34 }}>🎭</Text>
          </LinearGradient>
          <Text style={styles.name}>Anonymous Citizen</Text>
          <Pressable style={styles.idRow} onPress={copyId}>
            <Text style={styles.id}>ID: {SESSION_ID}</Text>
            <Feather name={copied ? "check" : "copy"} size={12} color={copied ? theme.teal : theme.muted} />
          </Pressable>

          <View style={styles.stats}>
            <Stat value={reports} label="Reports" color={theme.blue} />
            <View style={styles.statDivider} />
            <Stat value={verified} label="Verified" color={theme.teal} />
            <View style={styles.statDivider} />
            <Stat value={active} label="Active" color={theme.amber} />
          </View>

          <View style={styles.trustRow}>
            <Text style={styles.trustLabel}>Civic Trust Score</Text>
            <Text style={[styles.trustVal, { color: level.color }]}>
              {level.label} · {trust}/100
            </Text>
          </View>
          <View style={styles.trustTrack}>
            <View style={[styles.trustFill, { width: `${trust}%`, backgroundColor: level.color }]} />
          </View>
        </FadeIn>

        {/* Menu */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <FadeIn style={styles.menu} delay={90}>
          {MENU.map((m, i) => (
            <Pressable
              key={m.label}
              onPress={() => m.settings && setSettings(true)}
              style={[styles.menuItem, i < MENU.length - 1 && styles.menuBorder]}
            >
              <View style={styles.menuIcon}>
                <Feather name={m.icon} size={16} color={theme.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>{m.label}</Text>
                <Text style={styles.menuSub}>{m.sub}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.muted2} />
            </Pressable>
          ))}
        </FadeIn>
      </ScrollView>

      {/* Settings sheet */}
      <Modal visible={settings} transparent animationType="slide" onRequestClose={() => setSettings(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSettings(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <View style={styles.sheetTitleRow}>
              <Feather name="sliders" size={16} color={theme.blue} />
              <Text style={styles.sheetTitle}>App Settings</Text>
            </View>
            <Pressable onPress={() => setSettings(false)} style={styles.close}>
              <Feather name="x" size={16} color={theme.muted} />
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.settingLabel}>ALERT RADIUS</Text>
            <View style={styles.radiusRow}>
              {RADII.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRadiusKm(r)}
                  style={[styles.radiusChip, radiusKm === r && styles.radiusChipActive]}
                >
                  <Text style={[styles.radiusText, radiusKm === r && { color: "#fff" }]}>{r} km</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.settingLabel}>NOTIFICATION TYPES</Text>
            <View style={styles.notifBox}>
              {NOTIFS.map((n, i) => (
                <View key={n.key} style={[styles.notifRow, i < NOTIFS.length - 1 && styles.menuBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifTitle}>{n.label}</Text>
                    <Text style={styles.notifSub}>{n.sub}</Text>
                  </View>
                  <Switch
                    value={notif[n.key]}
                    onValueChange={(v) => setNotif((s) => ({ ...s, [n.key]: v }))}
                    trackColor={{ true: theme.blue, false: theme.border }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          </View>

          <Pressable style={styles.saveBtn} onPress={() => setSettings(false)}>
            <Text style={styles.saveText}>Save Settings</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  title: { fontSize: 18, fontFamily: font.extra, color: theme.text },
  sub: { fontSize: 11, fontFamily: font.regular, color: theme.muted, marginTop: 2 },
  gear: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarCard: {
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.xl,
    padding: 20,
    alignItems: "center",
    ...cardShadow,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: theme.muted2,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 17, fontFamily: font.extra, color: theme.text, marginTop: 12 },
  idRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  id: { fontSize: 12, fontFamily: "monospace", color: theme.muted },

  stats: { flexDirection: "row", alignItems: "center", marginTop: 18, width: "100%" },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontFamily: font.black },
  statLabel: { fontSize: 10, fontFamily: font.bold, color: theme.muted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: theme.border },

  trustRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 18 },
  trustLabel: { fontSize: 11, fontFamily: font.semibold, color: theme.muted },
  trustVal: { fontSize: 11, fontFamily: font.extra },
  trustTrack: { height: 6, borderRadius: 3, backgroundColor: theme.border, width: "100%", marginTop: 6, overflow: "hidden" },
  trustFill: { height: 6, borderRadius: 3 },

  sectionLabel: { fontSize: 10, fontFamily: font.extra, color: theme.muted, letterSpacing: 1.5, marginTop: 22, marginBottom: 10, marginLeft: 4 },
  menu: {
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...cardShadow,
  },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: { fontSize: 13.5, fontFamily: font.bold, color: theme.text },
  menuSub: { fontSize: 11, fontFamily: font.regular, color: theme.muted, marginTop: 1 },

  // Settings sheet
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
    gap: 18,
    ...cardShadow,
  },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sheetTitle: { fontSize: 15, fontFamily: font.black, color: theme.text },
  close: { padding: 6, borderRadius: 999, backgroundColor: theme.surfaceAlt },
  settingLabel: { fontSize: 10, fontFamily: font.extra, color: theme.muted, letterSpacing: 1.2 },
  radiusRow: { flexDirection: "row", gap: 8 },
  radiusChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceAlt,
    alignItems: "center",
  },
  radiusChipActive: { backgroundColor: theme.blue, borderColor: theme.blue },
  radiusText: { fontSize: 13, fontFamily: font.bold, color: theme.muted },
  notifBox: {
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    overflow: "hidden",
  },
  notifRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  notifTitle: { fontSize: 13, fontFamily: font.bold, color: theme.text },
  notifSub: { fontSize: 10.5, fontFamily: font.regular, color: theme.muted, marginTop: 1 },
  saveBtn: { backgroundColor: theme.blue, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  saveText: { color: "#fff", fontFamily: font.bold, fontSize: 14 },
});
