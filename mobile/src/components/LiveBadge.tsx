import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { font, theme } from "../theme";
import { PulseDot } from "./anim";

export default function LiveBadge({
  count,
  onRefresh,
}: {
  count: number;
  onRefresh?: () => void;
}) {
  return (
    <View style={styles.row}>
      <PulseDot size={8} color={theme.blue} />
      <Text style={styles.live}>LIVE</Text>
      <Text style={styles.meta}>· {count} active</Text>
      {onRefresh && (
        <Pressable onPress={onRefresh} hitSlop={10} style={styles.refresh}>
          <Feather name="refresh-cw" size={12} color={theme.muted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 7 },
  live: { fontSize: 10, fontFamily: font.extra, color: theme.blue, letterSpacing: 2 },
  meta: { fontSize: 9, fontFamily: font.medium, color: theme.muted },
  refresh: { marginLeft: 4, padding: 2 },
});
