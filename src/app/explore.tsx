import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { supabase } from "@/database/supabase";
import { useTheme } from "@/hooks/use-theme";
import { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const theme = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
  }, []);

  const cerrarSesion = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Error al salir", error.message);
    }
  };

  const inicialCorreo = user?.email ? user.email[0].toUpperCase() : "U";

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Mi Perfil</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Información de tu cuenta activa
          </ThemedText>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : (
          <ThemedView type="backgroundElement" style={styles.profileCard}>
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarText}>{inicialCorreo}</ThemedText>
            </View>

            <ThemedText type="subtitle" style={styles.emailText}>
              {user?.email ?? "Usuario autenticado"}
            </ThemedText>

            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>Sesión verificada</ThemedText>
            </View>

            <View
              style={[
                styles.infoBox,
                { backgroundColor: theme.background },
              ]}
            >
              <View style={styles.infoRow}>
                <ThemedText type="smallBold">ID de Usuario:</ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={1}
                  style={styles.idValue}
                >
                  {user?.id ?? "—"}
                </ThemedText>
              </View>

              <View style={styles.infoRow}>
                <ThemedText type="smallBold">Último acceso:</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {user?.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString()
                    : "Hoy"}
                </ThemedText>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.pressed,
              ]}
              onPress={cerrarSesion}
            >
              <ThemedText style={styles.logoutButtonText}>
                Cerrar Sesión
              </ThemedText>
            </Pressable>
          </ThemedView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === "web" ? 80 : 16,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  header: {
    gap: 2,
    paddingVertical: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.15)",
    marginBottom: Spacing.four,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(79, 70, 229, 0.18)",
    borderWidth: 2,
    borderColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#818CF8",
    fontSize: 28,
    fontWeight: "700",
  },
  emailText: {
    textAlign: "center",
  },
  badge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.35)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "700",
  },
  infoBox: {
    width: "100%",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
    gap: 12,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  idValue: {
    flex: 1,
    textAlign: "right",
  },
  logoutButton: {
    width: "100%",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  logoutButtonText: {
    color: "#F87171",
    fontWeight: "700",
    fontSize: 15,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});