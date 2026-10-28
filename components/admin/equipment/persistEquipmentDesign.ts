import { createClient } from "../../../lib/supabase";
import { mergeDesignSidePixels, type PixelTextLayer } from "../../../lib/character-design-json";

type Input = {
  name: string;
  category: string;
  side: "front" | "back";
  width: number;
  height: number;
  pixels: Record<string, string>;
  textLayers: PixelTextLayer[];
  palette: string[];
  designId: string | null;
};

export async function persistEquipmentDesign(p: Input) {
  const db = createClient(), { data: { user } } = await db.auth.getUser();
  if (!user) throw Error("Please sign in first.");
  if (!["head", "clothing", "relic"].includes(p.category))
    throw Error("Choose an equipment category: Headgear, Suits, or Relic.");
  const timestamp = new Date().toISOString();
  const payload = {
    canvas_width: p.width,
    canvas_height: p.height,
    pixel_data: mergeDesignSidePixels(null, p.side, p.pixels, p.width, p.textLayers, p.pixels),
    palette: p.palette,
    updated_at: timestamp,
  };
  if (!p.designId) {
    if (p.side === "back") throw Error("Save the front view before adding its back view.");
    if (!p.name.trim()) throw Error("Enter a design name.");
    const { data, error } = await db.from("equipment_designs").insert({
      ...payload, design_name: p.name.trim(), category: p.category, user_id: user.id,
    }).select("id").single();
    if (error) throw error;
    return { id: data.id, message: `Equipment saved: ${p.name.trim()}` };
  }
  const { data: admin, error: adminError } = await db.from("admin_users")
    .select("role,is_active").eq("user_id", user.id).maybeSingle();
  if (adminError || admin?.role !== "admin" || !admin.is_active) throw Error("Admin permission denied.");
  const { data: existing, error: loadError } = await db.from("equipment_designs")
    .select("pixel_data,design_name,category").eq("id", p.designId).maybeSingle();
  if (loadError) throw loadError;
  if (!existing) throw Error("Equipment design not found.");
  const update = {
    ...payload,
    ...(p.side === "front" ? { design_name: p.name.trim(), category: p.category } : {}),
    pixel_data: mergeDesignSidePixels(existing.pixel_data, p.side, p.pixels, p.width, p.textLayers, p.pixels),
  };
  const { data, error } = await db.from("equipment_designs")
    .update(update).eq("id", p.designId).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw Error("Unable to update this equipment design. Check the database update policy.");
  return { id: data.id, message: `Equipment ${p.side} updated: ${existing.design_name}` };
}
