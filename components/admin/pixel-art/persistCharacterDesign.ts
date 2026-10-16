import { createClient } from "../../../lib/supabase";
import { mergeDesignSidePixels, type PixelTextLayer } from "../../../lib/character-design-json";
type Input = { name: string; part: string; side: "front" | "back"; width: number; height: number; pixels: Record<string, string>; basePixels: Record<string, string>; textLayers: PixelTextLayer[]; palette: string[]; designId: string | null };
export async function persistCharacterDesign(p: Input) {
  const db = createClient(), { data: { user } } = await db.auth.getUser();
  if (!user) throw Error("Please sign in first.");
  const basePart = p.part.replace(/-back$/, ""), timestamp = new Date().toISOString();
  const payload = { canvas_width: p.width, canvas_height: p.height, pixel_data: mergeDesignSidePixels(null, p.side, p.basePixels, p.width, p.textLayers, p.pixels), palette: p.palette, updated_at: timestamp };
  if (!p.designId) {
    if (p.side === "back") throw Error("Choose a published front design first.");
    if (!p.name.trim()) throw Error("Enter a design name.");
    const { data, error } = await db.from("character_designs").insert({ ...payload, design_name: p.name.trim(), design_type: basePart, user_id: user.id }).select("id").single();
    if (error) throw error;
    return { id: data.id, message: `Design saved: ${p.name.trim()}` };
  }
  const { data: admin, error: adminError } = await db.from("admin_users").select("role,is_active").eq("user_id", user.id).maybeSingle();
  if (adminError || admin?.role !== "admin" || !admin.is_active) throw Error("Admin permission denied.");
  const { data: existing, error: loadError } = await db.from("character_designs").select("pixel_data,design_name,design_type").eq("id", p.designId).maybeSingle();
  if (loadError) throw loadError;
  if (!existing) throw Error("Design not found.");
  if (p.side === "back" && existing.design_type.toLowerCase().endsWith("-back")) throw Error("Choose the published front design.");
  const update = { ...payload, ...(p.side === "front" ? { design_name: p.name.trim(), design_type: basePart } : {}), pixel_data: mergeDesignSidePixels(existing.pixel_data, p.side, p.basePixels, p.width, p.textLayers, p.pixels) };
  const { data, error } = await db.from("character_designs").update(update).eq("id", p.designId).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw Error("Unable to update this design. Check the database update policy.");
  return { id: data.id, message: `Design ${p.side} updated: ${existing.design_name}` };
}
