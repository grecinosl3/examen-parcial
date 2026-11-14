import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { supabase } from "@/database/supabase";
import { useTheme } from "@/hooks/use-theme";
import { subirImagenSupabase } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

export default function AuthScreen() {


useEffect(() => {
    if (Platform.OS !== "web") return;
    const style = document.createElement("style");
    style.textContent = `
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 1000px #09090B inset !important;
        -webkit-text-fill-color: #FFFFFF !important;
        caret-color: #FFFFFF !important;
        transition: background-color 5000s ease-in-out 0s;
      }
      input:focus {
        outline: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [esRegistro, setEsRegistro] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [campoActivo, setCampoActivo] = useState<string | null>(null);

  // Campos de auto-registro para Estudiante
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [carnet, setCarnet] = useState("");
  const [carrera, setCarrera] = useState("");
  const [fotoUri, setFotoUri] = useState<string | null>(null);

  const seleccionarFoto = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert("Permiso requerido", "Debes permitir acceso a tus fotos.");
      return;
    }

    

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!resultado.canceled && resultado.assets.length > 0) {
      setFotoUri(resultado.assets[0].uri);
    }
  };

  const manejarAutenticacion = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Campos requeridos", "Ingresa tu correo y contraseña.");
      return;
    }

    setCargando(true);
    try {
      if (esRegistro) {
        if (!nombreCompleto.trim() || !carnet.trim() || !carrera.trim()) {
          Alert.alert(
            "Datos incompletos",
            "Completa nombre completo, carnet y carrera."
          );
          setCargando(false);
          return;
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        if (!authData.user) {
          throw new Error("No se pudo obtener el usuario registrado.");
        }

        let fotoUrl: string | null = null;
        if (fotoUri) {
          fotoUrl = await subirImagenSupabase(fotoUri, "avatares");
        }

        const { error: profileError } = await supabase.from("perfiles").insert({
          id: authData.user.id,
          email: email.trim(),
          rol: "estudiante",
          nombre_completo: nombreCompleto.trim(),
          carnet: carnet.trim(),
          carrera: carrera.trim(),
          foto_url: fotoUrl,
        });
        if (profileError) throw profileError;

        Alert.alert(
          "¡Registro exitoso!",
          "Tu cuenta de estudiante ya está lista."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      Alert.alert(
        "Error de autenticación",
        err instanceof Error ? err.message : "Ocurrió un error inesperado"
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Círculos decorativos de fondo */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Marca / Encabezado superior */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Ionicons name="hardware-chip-outline" size={30} color="#818CF8" />
            </View>
            <ThemedText type="subtitle" style={styles.brandTitle}>
              Préstamo de Equipos
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.brandSubtitle}
            >
              Laboratorio y Recursos Tecnológicos
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.card}>
            {/* Selector de pestañas Iniciar Sesión / Registrarse */}
            <View
              style={[
                styles.segmentedControl,
                { backgroundColor: theme.background },
              ]}
            >
              <Pressable
                style={[
                  styles.segmentBtn,
                  !esRegistro && styles.segmentBtnActive,
                ]}
                onPress={() => setEsRegistro(false)}
              >
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.segmentText,
                    !esRegistro && styles.segmentTextActive,
                  ]}
                >
                  Iniciar Sesión
                </ThemedText>
              </Pressable>

              <Pressable
                style={[
                  styles.segmentBtn,
                  esRegistro && styles.segmentBtnActive,
                ]}
                onPress={() => setEsRegistro(true)}
              >
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.segmentText,
                    esRegistro && styles.segmentTextActive,
                  ]}
                >
                  Soy Estudiante
                </ThemedText>
              </Pressable>
            </View>

            {esRegistro && (
              <>
                {/* Selector de avatar mejorado */}
                <Pressable style={styles.photoWrapper} onPress={seleccionarFoto}>
                  {fotoUri ? (
                    <Image
                      source={{ uri: fotoUri }}
                      style={styles.photoPreview}
                    />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons
                        name="person-outline"
                        size={32}
                        color="#818CF8"
                      />
                    </View>
                  )}
                  <View style={styles.cameraBadge}>
                    <Ionicons name="camera" size={14} color="#FFFFFF" />
                  </View>
                </Pressable>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.photoHint}
                >
                  {fotoUri ? "Toca para cambiar foto" : "Sube tu foto de perfil"}
                </ThemedText>

                {/* Nombre completo */}
                <View style={styles.field}>
                  <ThemedText type="smallBold" style={styles.label}>
                    Nombre completo
                  </ThemedText>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: theme.background },
                      campoActivo === "nombre" && styles.inputFocused,
                    ]}
                  >
                    <Ionicons
                      name="person-circle-outline"
                      size={20}
                      color={campoActivo === "nombre" ? "#818CF8" : "#64748B"}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      value={nombreCompleto}
                      onChangeText={setNombreCompleto}
                      onFocus={() => setCampoActivo("nombre")}
                      onBlur={() => setCampoActivo(null)}
                      placeholder="Ej. Ana María López"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                </View>

                {/* Carnet y Carrera en fila */}
                <View style={styles.rowFields}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <ThemedText type="smallBold" style={styles.label}>
                      Carnet
                    </ThemedText>
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: theme.background },
                        campoActivo === "carnet" && styles.inputFocused,
                      ]}
                    >
                      <Ionicons
                        name="card-outline"
                        size={18}
                        color={campoActivo === "carnet" ? "#818CF8" : "#64748B"}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.text }]}
                        value={carnet}
                        onChangeText={setCarnet}
                        onFocus={() => setCampoActivo("carnet")}
                        onBlur={() => setCampoActivo(null)}
                        placeholder="0907-24-123"
                        placeholderTextColor={theme.textSecondary}
                      />
                    </View>
                  </View>

                  <View style={[styles.field, { flex: 1.2 }]}>
                    <ThemedText type="smallBold" style={styles.label}>
                      Carrera
                    </ThemedText>
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: theme.background },
                        campoActivo === "carrera" && styles.inputFocused,
                      ]}
                    >
                      <Ionicons
                        name="school-outline"
                        size={18}
                        color={campoActivo === "carrera" ? "#818CF8" : "#64748B"}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.text }]}
                        value={carrera}
                        onChangeText={setCarrera}
                        onFocus={() => setCampoActivo("carrera")}
                        onBlur={() => setCampoActivo(null)}
                        placeholder="Sistemas"
                        placeholderTextColor={theme.textSecondary}
                      />
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* Correo electrónico */}
            <View style={styles.field}>
              <ThemedText type="smallBold" style={styles.label}>
                Correo electrónico
              </ThemedText>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.background },
                  campoActivo === "email" && styles.inputFocused,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={campoActivo === "email" ? "#818CF8" : "#64748B"}
                />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setCampoActivo("email")}
                  onBlur={() => setCampoActivo(null)}
                  placeholder="correo@universidad.edu"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Contraseña */}
            <View style={styles.field}>
              <ThemedText type="smallBold" style={styles.label}>
                Contraseña
              </ThemedText>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.background },
                  campoActivo === "password" && styles.inputFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={campoActivo === "password" ? "#818CF8" : "#64748B"}
                />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setCampoActivo("password")}
                  onBlur={() => setCampoActivo(null)}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!verPassword}
                />
                <Pressable onPress={() => setVerPassword(!verPassword)}>
                  <Ionicons
                    name={verPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#64748B"
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                cargando && styles.disabled,
              ]}
              onPress={manejarAutenticacion}
              disabled={cargando}
            >
              {cargando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.buttonContent}>
                  <ThemedText style={styles.primaryButtonText}>
                    {esRegistro ? "Crear Cuenta Estudiantil" : "Ingresar al Sistema"}
                  </ThemedText>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              )}
            </Pressable>

            <View style={styles.footerNote}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color="#64748B"
              />
              <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
                {esRegistro
                  ? "Acceso inmediato al catálogo de equipos"
                  : "Estudiantes y Administradores usan este acceso"}
              </ThemedText>
            </View>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  flex: {
    flex: 1,
  },
  glowTop: {
    position: "absolute",
    top: -120,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(79, 70, 229, 0.14)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -140,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  brandHeader: {
    alignItems: "center",
    marginBottom: 20,
    gap: 6,
  },
  logoBadge: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "rgba(79, 70, 229, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(129, 140, 248, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  brandSubtitle: {
    textAlign: "center",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    gap: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  segmentedControl: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: "#4F46E5",
  },
  segmentText: {
    color: "#94A3B8",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  photoWrapper: {
    alignSelf: "center",
    marginTop: 4,
  },
  photoPreview: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    borderColor: "#4F46E5",
  },
  photoPlaceholder: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "rgba(79, 70, 229, 0.12)",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#4F46E5",
    borderWidth: 2,
    borderColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
  photoHint: {
    textAlign: "center",
    fontSize: 12,
    marginTop: -6,
  },
  rowFields: {
    flexDirection: "row",
    gap: 10,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
  },
inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    borderRadius: 13,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
    overflow: "hidden", 
  },

inputFocused: {
    borderColor: "#6366F1",
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: "100%",
    backgroundColor: "transparent", 
  },
  primaryButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  disabled: {
    opacity: 0.6,
  },
  footerNote: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  footerText: {
    fontSize: 12,
  },
});