import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import { isBackendConfigured } from "./src/lib/supabase";
import { useLiveData } from "./src/hooks/useLiveData";
import { useSos } from "./src/hooks/useSos";
import HomeScreen from "./src/screens/HomeScreen";
import AlertsScreen from "./src/screens/AlertsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import ReportScreen from "./src/screens/ReportScreen";
import SosOverlay from "./src/components/SosOverlay";
import BottomNav, { type Screen } from "./src/components/BottomNav";
import { Crossfade } from "./src/components/anim";
import { theme } from "./src/theme";

function Main() {
  const { incidents, emergencies, loading, refreshing, refresh } = useLiveData();
  const { active, activate, endSos } = useSos();
  const [screen, setScreen] = useState<Screen>("home");
  const [reportOpen, setReportOpen] = useState(false);

  const activeEmergencies = emergencies.filter((e) => e.status === "ACTIVE").length;

  if (active) return <SosOverlay emergency={active} onEnd={endSos} />;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <Crossfade trigger={screen}>
        {screen === "home" ? (
          <HomeScreen
            incidents={incidents}
            emergencies={emergencies}
            loading={loading}
            refreshing={refreshing}
            onRefresh={refresh}
            onActivateSos={activate}
            onSafetyExpire={() => activate("THREAT")}
            onReport={() => setReportOpen(true)}
          />
        ) : screen === "alerts" ? (
          <AlertsScreen incidents={incidents} emergencies={emergencies} />
        ) : (
          <ProfileScreen incidents={incidents} />
        )}
      </Crossfade>

      <BottomNav screen={screen} onChange={setScreen} unread={activeEmergencies} />

      <ReportScreen visible={reportOpen} onClose={() => setReportOpen(false)} />
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  if (!isBackendConfigured()) {
    return (
      <View style={styles.setup}>
        <StatusBar style="dark" />
        <Text style={styles.setupTitle}>AiWee</Text>
        <Text style={styles.setupBody}>
          Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in
          mobile/.env, then restart Expo. See ../SUPABASE.md.
        </Text>
      </View>
    );
  }
  return <Main />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  setup: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
    backgroundColor: theme.bg,
  },
  setupTitle: { fontSize: 28, fontFamily: "Inter_900Black", color: theme.blue },
  setupBody: {
    textAlign: "center",
    color: theme.muted,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Inter_400Regular",
  },
});
