import { supabase } from "@/database/supabase";

export async function subirImagenSupabase(
  uri: string,
  bucket: "avatares" | "equipos"
): Promise<string | null> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const extension = uri.split(".").pop()?.split("?")[0] || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, arrayBuffer, {
        contentType: blob.type || "image/jpeg",
        upsert: false,
      });

    if (error) {
      console.error("Error subiendo imagen:", error.message);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.error("Error procesando imagen:", err);
    return null;
  }
}