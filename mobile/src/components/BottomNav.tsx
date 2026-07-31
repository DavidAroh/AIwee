import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { font, theme } from "../theme";

export type Screen = "home" | "alerts" | "profile";

const ITEMS: { key: Screen; icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { key: "home", icon: "home", label: "Home" },
  { key: "alerts", icon: "bell", label: "Alerts" },
  { key: "profile", icon: "user", label: "Profile" },
];

export default function BottomNav({
  screen,
  onChange,
  unread = 0,
}: {
  screen: Screen;
  onChange: (s: Screen) => void;
  unread?: number;
}) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.island}>
        {ITEMS.map(({ key, icon, label }) => {
          const active = screen === key;
          return (
            <Pressable
              key={key}
              onPress={() => onChange(key)}
              style={[styles.item, active ? styles.itemActive : styles.itemInactive]}
            >
              <View>
                <Feather
                  name={icon}
                  size={20}
                  color={active ? theme.blue : theme.muted}
                  strokeWidth={active ? 2.5 : 2}
                />
                {!active && key === "alerts" && unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
                  </View>
                )}
              </View>
              {active && <Text style={styles.label}>{label}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  island: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(241,245,249,0.92)",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 999,
    padding: 6,
    shadowColor: "#0f172a",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  item: {
    height: 48,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  itemActive: { paddingHorizontal: 18, backgroundColor: "rgba(226,232,240,0.85)" },
  itemInactive: { width: 48 },
  label: { fontSize: 14, fontFamily: font.bold, color: theme.text },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 8.5, fontFamily: font.black },
});
