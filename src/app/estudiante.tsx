import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/database/supabase";
import { useTheme } from "@/hooks/use-theme";
import { subirImagenSupabase } from "@/utils/storage";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface PrestamoDetalle {
  id: number;
  fecha_prestamo: string;
  fecha_devolucion: string;
  estado: "pendiente" | "aprobado" | "rechazado" | "devuelto";
  equipo_id: number;
  equipos?: { nombre: string; imagen_url?: string | null };
  perfiles?: { nombre_completo: string; carnet?: string | null };
}

export default function GestionPrestamosScreen() {
  const theme = useTheme();
  const { perfil } = useAuth();
  const esAdmin = perfil?.rol === "admin";

  const [prestamos, setPrestamos] = useState<PrestamoDetalle[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal para agregar equipo (solo Admin)
  const [modalEquipo, setModalEquipo] = useState(false);
  const [nombreEquipo, setNombreEquipo] = useState("");
  const [descEquipo, setDescEquipo] = useState("");
  const [fotoEquipoUri, setFotoEquipoUri] = useState<string | null>(null);
  const [guardandoEquipo, setGuardandoEquipo] = useState(false);

  const cargarPrestamos = async () => {
    if (!perfil) return;
    setCargando(true);

    let query = supabase
      .from("prestamos")
      .select(
        `
        id,
        fecha_prestamo,
        fecha_devolucion,
        estado,
        equipo_id,
        equipos ( nombre, imagen_url ),
        perfiles ( nombre_completo, carnet )
      `
      )
      .order("id", { ascending: false });

    // Si es estudiante, filtra solo sus propios préstamos
    if (!esAdmin) {
      query = query.eq("estudiante_id", perfil.id);
    }

    const { data, error } = await query;
    if (!error && data) {
      setPrestamos(data as unknown as PrestamoDetalle[]);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarPrestamos();
  }, [perfil]);

  const actualizarEstadoPrestamo = async (
    prestamo: PrestamoDetalle,
    nuevoEstado: "aprobado" | "rechazado" | "devuelto"
  ) => {
    const { error } = await supabase
      .from("prestamos")
      .update({ estado: nuevoEstado })
      .eq("id", prestamo.id);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    // Actualizar disponibilidad del equipo según corresponda
    if (nuevoEstado === "aprobado") {
      await supabase
        .from("equipos")
        .update({ disponible: false })
        .eq("id", prestamo.equipo_id);
    } else if (nuevoEstado === "devuelto") {
      await supabase
        .from("equipos")
        .update({ disponible: true })
        .eq("id", prestamo.equipo_id);
    }

    cargarPrestamos();
  };

  const seleccionarFotoEquipo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!res.canceled && res.assets.length > 0) {
      setFotoEquipoUri(res.assets[0].uri);
    }
  };

  const guardarNuevoEquipo = async () => {
    if (!nombreEquipo.trim()) {
      Alert.alert("Campo requerido", "Ingresa el nombre del equipo.");
      return;
    }
    setGuardandoEquipo(true);

    let imagenUrl: string | null = null;
    if (fotoEquipoUri) {
      imagenUrl = await subirImagenSupabase(fotoEquipoUri, "equipos");
    }

    const { error } = await supabase.from("equipos").insert({
      nombre: nombreEquipo.trim(),
      descripcion: descEquipo.trim() || null,
      imagen_url: imagenUrl,
      disponible: true,
    });

    setGuardandoEquipo(false);
    if (error) {
      Alert.alert("Error al crear equipo", error.message);
      return;
    }

    setNombreEquipo("");
    setDescEquipo("");
    setFotoEquipoUri(null);
    setModalEquipo(false);
    Alert.alert("Equipo agregado", "Ya está disponible en el catálogo.");
  };

  // Cálculo del reporte rápido para Administrador
  const totalSolicitudes = prestamos.length;
  const pendientes = prestamos.filter((p) => p.estado === "pendiente").length;
  const activos = prestamos.filter((p) => p.estado === "aprobado").length;
  const devueltos = prestamos.filter((p) => p.estado === "devuelto").length;

  const conteoPorEquipo = prestamos.reduce<Record<string, number>>((acc, p) => {
    const nombre = p.equipos?.nombre ?? "Equipo";
    acc[nombre] = (acc[nombre] || 0) + 1;
    return acc;
  }, {});

const generarAlertaReporte = () => {
    const desglose = Object.entries(conteoPorEquipo)
      .map(([eq, cant]) => `• ${eq}: ${cant} solicitud(es)`)
      .join("\n");

    const mensaje = `RESUMEN DE PRÉSTAMOS\n\nTotal solicitudes: ${totalSolicitudes}\nPendientes: ${pendientes}\nActivos: ${activos}\nDevueltos: ${devueltos}\n\nEquipos solicitados:\n${desglose || "Sin registros aún"}`;

    if (Platform.OS === "web") {
      window.alert(mensaje);
    } else {
      Alert.alert("Reporte de Equipos Solicitados", mensaje);
    }
  };

  const getBadgeStyle = (estado: PrestamoDetalle["estado"]) => {
    switch (estado) {
      case "aprobado":
        return { bg: "rgba(16, 185, 129, 0.15)", color: "#34D399" };
      case "pendiente":
        return { bg: "rgba(245, 158, 11, 0.15)", color: "#FBBF24" };
      case "devuelto":
        return { bg: "rgba(99, 102, 241, 0.15)", color: "#818CF8" };
      case "rechazado":
        return { bg: "rgba(239, 68, 68, 0.15)", color: "#F87171" };
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <ThemedText type="subtitle">
              {esAdmin ? "Panel de Administrador" : "Mis Préstamos"}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {esAdmin
                ? "Control de solicitudes, devoluciones y reportes"
                : "Historial y estado de tus equipos solicitados"}
            </ThemedText>
          </View>

          <Pressable style={styles.refreshBtn} onPress={cargarPrestamos}>
            <ThemedText style={styles.refreshText}>Actualizar</ThemedText>
          </Pressable>
        </View>

        {esAdmin && (
          <View style={styles.adminToolbar}>
            <View style={styles.statsRow}>
              <ThemedView type="backgroundElement" style={styles.statBox}>
                <ThemedText style={styles.statVal}>{pendientes}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Pendientes
                </ThemedText>
              </ThemedView>
              <ThemedView type="backgroundElement" style={styles.statBox}>
                <ThemedText style={[styles.statVal, { color: "#34D399" }]}>
                  {activos}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Activos
                </ThemedText>
              </ThemedView>
              <ThemedView type="backgroundElement" style={styles.statBox}>
                <ThemedText style={[styles.statVal, { color: "#818CF8" }]}>
                  {devueltos}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Devueltos
                </ThemedText>
              </ThemedView>
            </View>

            <View style={styles.adminButtonsRow}>
              <Pressable
                style={styles.primaryAction}
                onPress={() => setModalEquipo(true)}
              >
                <ThemedText style={styles.actionText}>+ Nuevo Equipo</ThemedText>
              </Pressable>
              <Pressable
                style={styles.reportAction}
                onPress={generarAlertaReporte}
              >
                <ThemedText style={styles.reportText}>
                  Generar Reporte
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {cargando ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : (
          <FlatList
            data={prestamos}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                No hay registros de préstamos todavía.
              </ThemedText>
            }
            renderItem={({ item }) => {
              const badge = getBadgeStyle(item.estado);
              return (
                <ThemedView type="backgroundElement" style={styles.card}>
                  <View style={styles.cardHeader}>
                    <ThemedText type="smallBold" style={styles.equipoName}>
                      {item.equipos?.nombre ?? `Equipo #${item.equipo_id}`}
                    </ThemedText>
                    <View
                      style={[styles.badge, { backgroundColor: badge.bg }]}
                    >
                      <ThemedText
                        style={[styles.badgeText, { color: badge.color }]}
                      >
                        {item.estado.toUpperCase()}
                      </ThemedText>
                    </View>
                  </View>

                  {esAdmin && item.perfiles && (
                    <ThemedText type="small" style={styles.studentInfo}>
                      Estudiante: {item.perfiles.nombre_completo}{" "}
                      {item.perfiles.carnet ? `(${item.perfiles.carnet})` : ""}
                    </ThemedText>
                  )}

                  <ThemedText type="small" themeColor="textSecondary">
                    Préstamo: {item.fecha_prestamo} | Devolución:{" "}
                    {item.fecha_devolucion}
                  </ThemedText>

                  {esAdmin && item.estado === "pendiente" && (
                    <View style={styles.decisionRow}>
                      <Pressable
                        style={styles.approveBtn}
                        onPress={() =>
                          actualizarEstadoPrestamo(item, "aprobado")
                        }
                      >
                        <ThemedText style={styles.btnText}>Aprobar</ThemedText>
                      </Pressable>
                      <Pressable
                        style={styles.rejectBtn}
                        onPress={() =>
                          actualizarEstadoPrestamo(item, "rechazado")
                        }
                      >
                        <ThemedText style={styles.btnText}>Rechazar</ThemedText>
                      </Pressable>
                    </View>
                  )}

                  {esAdmin && item.estado === "aprobado" && (
                    <Pressable
                      style={styles.returnBtn}
                      onPress={() => actualizarEstadoPrestamo(item, "devuelto")}
                    >
                      <ThemedText style={styles.btnText}>
                        Marcar como Devuelto
                      </ThemedText>
                    </Pressable>
                  )}
                </ThemedView>
              );
            }}
          />
        )}

        {/* Modal para que el Admin agregue equipos al catálogo */}
        <Modal
          visible={modalEquipo}
          transparent
          animationType="fade"
          onRequestClose={() => setModalEquipo(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={styles.modalCard}>
              <ScrollView contentContainerStyle={{ gap: 12 }}>
                <ThemedText type="subtitle">Agregar Equipo</ThemedText>

                <Pressable
                  style={styles.photoPicker}
                  onPress={seleccionarFotoEquipo}
                >
                  {fotoEquipoUri ? (
                    <Image
                      source={{ uri: fotoEquipoUri }}
                      style={styles.photoPreview}
                    />
                  ) : (
                    <ThemedText style={styles.photoPickerText}>
                      + Seleccionar Imagen del Equipo
                    </ThemedText>
                  )}
                </Pressable>

                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.background, color: theme.text },
                  ]}
                  placeholder="Nombre del equipo"
                  placeholderTextColor={theme.textSecondary}
                  value={nombreEquipo}
                  onChangeText={setNombreEquipo}
                />

                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.background, color: theme.text },
                  ]}
                  placeholder="Descripción breve"
                  placeholderTextColor={theme.textSecondary}
                  value={descEquipo}
                  onChangeText={setDescEquipo}
                />

                <View style={styles.modalActions}>
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() => setModalEquipo(false)}
                  >
                    <ThemedText>Cancelar</ThemedText>
                  </Pressable>
                  <Pressable
                    style={styles.primaryAction}
                    onPress={guardarNuevoEquipo}
                    disabled={guardandoEquipo}
                  >
                    {guardandoEquipo ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <ThemedText style={styles.actionText}>Guardar</ThemedText>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.15)",
    marginBottom: Spacing.three,
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(79, 70, 229, 0.15)",
  },
  refreshText: { color: "#818CF8", fontSize: 12, fontWeight: "700" },
  adminToolbar: { gap: 10, marginBottom: Spacing.three },
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    alignItems: "center",
  },
  statVal: { fontSize: 22, fontWeight: "800", color: "#FBBF24" },
  adminButtonsRow: { flexDirection: "row", gap: 10 },
  primaryAction: {
    flex: 1,
    backgroundColor: "#4F46E5",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  actionText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  reportAction: {
    flex: 1,
    backgroundColor: "rgba(16, 185, 129, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  reportText: { color: "#34D399", fontWeight: "700", fontSize: 13 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { gap: 12, paddingBottom: 24 },
  emptyText: { textAlign: "center", marginTop: 32 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  equipoName: { fontSize: 16, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  studentInfo: { color: "#93C5FD", fontWeight: "600" },
  decisionRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  approveBtn: {
    flex: 1,
    backgroundColor: "#059669",
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#DC2626",
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  returnBtn: {
    backgroundColor: "#4F46E5",
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  btnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
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
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  photoPicker: {
    height: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  photoPreview: { width: "100%", height: "100%" },
  photoPickerText: { color: "#818CF8", fontWeight: "600", fontSize: 13 },
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
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
  },
});