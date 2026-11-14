import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { supabase } from "@/database/supabase";
import { subirImagenSupabase } from "@/utils/storage";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
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
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  // Campos comunes
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Campos de auto-registro estudiante
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

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Campos requeridos", "Ingresa correo y contraseña.");
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        if (!nombreCompleto.trim() || !carnet.trim() || !carrera.trim()) {
          Alert.alert(
            "Datos incompletos",
            "Completa nombre completo, carnet y carrera."
          );
          setLoading(false);
          return;
        }

        // 1. Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        if (authError) throw authError;
        if (!authData.user) {
          throw new Error("No se pudo obtener el usuario registrado.");
        }

        // 2. Subir foto si seleccionó una
        let fotoUrl: string | null = null;
        if (fotoUri) {
          fotoUrl = await subirImagenSupabase(fotoUri, "avatares");
        }

        // 3. Crear registro en la tabla public.perfiles con rol 'estudiante'
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

        Alert.alert("¡Bienvenido!", "Tu cuenta de estudiante ha sido creada.");
      } else {
        // Inicio de sesión (Estudiante o Admin)
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) throw error;
      }
    } catch (error: any) {
      Alert.alert("Error de autenticación", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="subtitle" style={styles.title}>
              {isRegistering ? "Registro de Estudiante" : "Préstamo de Equipos"}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
              {isRegistering
                ? "Crea tu cuenta estudiantil para solicitar equipos"
                : "Ingresa como Estudiante o Administrador"}
            </ThemedText>

            {isRegistering && (
              <>
                <Pressable style={styles.photoPicker} onPress={seleccionarFoto}>
                  {fotoUri ? (
                    <Image source={{ uri: fotoUri }} style={styles.photoPreview} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <ThemedText style={styles.photoPlaceholderText}>
                        + Subir Foto
                      </ThemedText>
                    </View>
                  )}
                </Pressable>

                <TextInput
                  style={styles.input}
                  placeholder="Nombre completo"
                  placeholderTextColor="#94A3B8"
                  value={nombreCompleto}
                  onChangeText={setNombreCompleto}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Carnet (ej. 0907-24-12345)"
                  placeholderTextColor="#94A3B8"
                  value={carnet}
                  onChangeText={setCarnet}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Carrera"
                  placeholderTextColor="#94A3B8"
                  value={carrera}
                  onChangeText={setCarrera}
                />
              </>
            )}

            <TextInput
              style={styles.input}
              placeholder="Correo institucional o personal"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Pressable
              style={[styles.primaryButton, loading && styles.disabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.primaryButtonText}>
                  {isRegistering ? "Registrarme como Estudiante" : "Iniciar Sesión"}
                </ThemedText>
              )}
            </Pressable>

            <Pressable
              style={styles.switchButton}
              onPress={() => setIsRegistering(!isRegistering)}
            >
              <ThemedText type="small" style={styles.switchText}>
                {isRegistering
                  ? "¿Ya tienes cuenta? Inicia sesión aquí"
                  : "¿Eres estudiante nuevo? Regístrate aquí"}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    gap: 12,
  },
  title: { textAlign: "center" },
  subtitle: { textAlign: "center", marginBottom: 8 },
  photoPicker: { alignSelf: "center", marginBottom: 4 },
  photoPreview: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: "#4F46E5",
  },
  photoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(79, 70, 229, 0.15)",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
  },
  photoPlaceholderText: {
    color: "#818CF8",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  input: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    color: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  disabled: { opacity: 0.6 },
  switchButton: { paddingVertical: 8, alignItems: "center" },
  switchText: { color: "#818CF8", fontWeight: "600" },
});