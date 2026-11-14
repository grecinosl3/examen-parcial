import { supabase } from "@/database/supabase";
import { Session } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface PerfilUsuario {
  id: string;
  email: string;
  rol: "estudiante" | "admin";
  nombre_completo: string;
  carnet?: string | null;
  carrera?: string | null;
  foto_url?: string | null;
}

interface AuthContextType {
  session: Session | null;
  perfil: PerfilUsuario | null;
  cargando: boolean;
  recargarPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  perfil: null,
  cargando: true,
  recargarPerfil: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargarPerfil = async (userId: string) => {
    const { data, error } = await supabase
      .from("perfiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setPerfil(data as PerfilUsuario);
    } else {
      setPerfil(null);
    }
  };

  const recargarPerfil = async () => {
    if (session?.user?.id) {
      await cargarPerfil(session.user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        await cargarPerfil(session.user.id);
      }
      setCargando(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await cargarPerfil(session.user.id);
      } else {
        setPerfil(null);
      }
      setCargando(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, perfil, cargando, recargarPerfil }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);