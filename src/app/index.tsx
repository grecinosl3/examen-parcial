import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/database/supabase";
import { useTheme } from "@/hooks/use-theme";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Equipo {
  id: number;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  disponible: boolean;
}

export default function CatalogoScreen() {
  const theme = useTheme();
  const { perfil } = useAuth();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estados para el modal de solicitud de préstamo
  const [modalVisible, setModalVisible] = useState(false);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<Equipo | null>(null);
  const [fechaPrestamo, setFechaPrestamo] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [fechaDevolucion, setFechaDevolucion] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargarEquipos = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from("equipos")
      .select("*")
      .order("id", { ascending: true });

    if (!error && data) {
      setEquipos(data as Equipo[]);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarEquipos();
  }, []);

  const abrirSolicitud = (equipo: Equipo) => {
    if (!equipo.disponible) {
      Alert.alert("No disponible", "Este equipo está actualmente prestado.");
      return;
    }
    setEquipoSeleccionado(equipo);
    setFechaPrestamo(new Date().toISOString().split("T")[0]);
    setFechaDevolucion("");
    setModalVisible(true);
  };

  const confirmarSolicitud = async () => {
    if (!perfil || !equipoSeleccionado) return;
    if (!fechaPrestamo.trim() || !fechaDevolucion.trim()) {
      Alert.alert(
        "Fechas requeridas",
        "Ingresa la fecha de préstamo y devolución (AAAA-MM-DD)."
      );
      return;
    }

    setEnviando(true);
    const { error } = await supabase.from("prestamos").insert({
      estudiante_id: perfil.id,
      equipo_id: equipoSeleccionado.id,
      fecha_prestamo: fechaPrestamo.trim(),
      fecha_devolucion: fechaDevolucion.trim(),
      estado: "pendiente",
    });

    setEnviando(false);

    if (error) {
      Alert.alert("Error al solicitar", error.message);
      return;
    }

    setModalVisible(false);
    Alert.alert(
      "Solicitud enviada",
      "Tu solicitud quedó en estado PENDIENTE de aprobación por un administrador."
    );
  };

  const eliminarEquipo = async (equipo: Equipo) => {
    const ejecutarBorrado = async () => {
      const { error } = await supabase
        .from("equipos")
        .delete()
        .eq("id", equipo.id);

      if (error) {
        const msg =
          error.code === "23503"
            ? "No se puede eliminar porque tiene préstamos asociados en el historial."
            : error.message;
        Platform.OS === "web" ? window.alert(msg) : Alert.alert("Error", msg);
        return;
      }

      cargarEquipos();
    };

    if (Platform.OS === "web") {
      if (window.confirm(`¿Seguro que deseas eliminar "${equipo.nombre}"?`)) {
        ejecutarBorrado();
      }
    } else {
      Alert.alert(
        "Eliminar equipo",
        `¿Seguro que deseas eliminar "${equipo.nombre}"?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Eliminar", style: "destructive", onPress: ejecutarBorrado },
        ]
      );
    }
  };
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Catálogo de Equipos</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Hola, {perfil?.nombre_completo ?? "Usuario"} ({perfil?.rol ?? "..."})
          </ThemedText>
        </View>

        {cargando ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : (
          <FlatList
            data={equipos}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                No hay equipos registrados en el catálogo.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <ThemedView type="backgroundElement" style={styles.card}>
                {item.imagen_url ? (
                  <Image
                    source={{ uri: item.imagen_url }}
                    style={styles.equipoImage}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <ThemedText style={styles.placeholderText}>EQ</ThemedText>
                  </View>
                )}

                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <ThemedText type="smallBold" style={styles.equipoTitle}>
                      {item.nombre}
                    </ThemedText>
                    <View
                      style={[
                        styles.statusBadge,
                        item.disponible ? styles.badgeAvailable : styles.badgeBusy,
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.statusText,
                          item.disponible ? styles.textAvailable : styles.textBusy,
                        ]}
                      >
                        {item.disponible ? "Disponible" : "Ocupado"}
                      </ThemedText>
                    </View>
                  </View>

                  <ThemedText type="small" themeColor="textSecondary">
                    {item.descripcion || "Sin descripción detallada"}
                  </ThemedText>

                  {perfil?.rol === "estudiante" && (
                    <Pressable
                      style={[
                        styles.requestButton,
                        !item.disponible && styles.requestButtonDisabled,
                      ]}
                      onPress={() => abrirSolicitud(item)}
                      disabled={!item.disponible}
                    >
                      <ThemedText style={styles.requestButtonText}>
                        {item.disponible ? "Solicitar Préstamo" : "No disponible"}
                      </ThemedText>
                    </Pressable>
                  )}

                  {perfil?.rol === "admin" && (
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => eliminarEquipo(item)}
                    >
                      <ThemedText style={styles.deleteButtonText}>
                        Eliminar equipo
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              </ThemedView>
            )}
          />
        )}

        {/* Modal para registrar préstamo */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={styles.modalCard}>
              <ThemedText type="subtitle">Solicitar Préstamo</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Equipo: {equipoSeleccionado?.nombre}
              </ThemedText>

              <View style={styles.field}>
                <ThemedText type="smallBold">
                  Fecha de préstamo (AAAA-MM-DD)
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.background, color: theme.text },
                  ]}
                  value={fechaPrestamo}
                  onChangeText={setFechaPrestamo}
                  placeholder="2026-11-15"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.field}>
                <ThemedText type="smallBold">
                  Fecha de devolución (AAAA-MM-DD)
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.background, color: theme.text },
                  ]}
                  value={fechaDevolucion}
                  onChangeText={setFechaDevolucion}
                  placeholder="2026-11-18"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
                </Pressable>

                <Pressable
                  style={styles.confirmButton}
                  onPress={confirmarSolicitud}
                  disabled={enviando}
                >
                  {enviando ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <ThemedText style={styles.confirmButtonText}>
                      Confirmar
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </ThemedView>
          </View>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", justifyContent: "center" },
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
    marginBottom: Spacing.three,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { gap: 12, paddingBottom: 24 },
  emptyText: { textAlign: "center", marginTop: 32 },
  card: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    gap: 14,
    alignItems: "center",
  },
  equipoImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#1E293B",
  },
  imagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "rgba(79, 70, 229, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { color: "#818CF8", fontWeight: "700", fontSize: 18 },
  cardBody: { flex: 1, gap: 6 },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  equipoTitle: { fontSize: 16, flex: 1 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeAvailable: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  badgeBusy: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  textAvailable: { color: "#34D399" },
  textBusy: { color: "#F87171" },
  requestButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  requestButtonDisabled: {
    backgroundColor: "rgba(148, 163, 184, 0.25)",
  },
  requestButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    gap: 14,
  },
  field: { gap: 6 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
  },
  cancelButtonText: { fontWeight: "600" },
  confirmButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  confirmButtonText: { color: "#FFFFFF", fontWeight: "700" },
  deleteButton: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  deleteButtonText: {
    color: "#F87171",
    fontWeight: "700",
    fontSize: 12,
  },
});