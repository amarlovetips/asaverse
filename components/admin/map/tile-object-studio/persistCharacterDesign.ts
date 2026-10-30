import { createClient } from "../../../../lib/supabase";
import type { PixelTextLayer } from "../../../../lib/character-design-json";

type Input = {
  name: string;
  part: string;
  width: number;
  height: number;
  pixels: Record<string, string>;
  basePixels: Record<string, string>;
  textLayers: PixelTextLayer[];
  palette: string[];
  designId: string | null;
};

/**
 * Artwork is persisted with its complete artboard dimensions and coordinates.
 */
export async function persistCharacterDesign(p: Input) {
  if (!p.name.trim()) throw Error("Enter a tile or object name.");

  if (!Object.values(p.pixels).some(Boolean)) {
    throw Error("Cannot save an empty or completely transparent design. Please draw at least one pixel.");
  }

  const db = createClient();
  let userId: string | undefined;
  try {
    const { data: { user } } = await db.auth.getUser();
    userId = user?.id;
  } catch {
    // Auth session check warning
  }

  const category = p.part || "tiles";
  const table = category === "tiles" ? "map_tiles" : "map_objects";
  const now = new Date().toISOString();

  // If updating an existing design
  if (p.designId) {
    // Preserve existing publication status
    let existingPublished = false;
    try {
      const { data: existing } = await db
        .from(table)
        .select("is_published")
        .eq("id", p.designId)
        .maybeSingle();

      if (existing) {
        existingPublished = existing.is_published ?? false;
      } else {
        // Try other table in case category switched
        const altTable = table === "map_tiles" ? "map_objects" : "map_tiles";
        const { data: altExisting } = await db
          .from(altTable)
          .select("is_published")
          .eq("id", p.designId)
          .maybeSingle();
        if (altExisting) {
          existingPublished = altExisting.is_published ?? false;
          // Delete from old table since category switched
          await db.from(altTable).delete().eq("id", p.designId);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Surface real errors when we cannot determine the existing publication state.
      throw new Error(`Failed to preserve publication status for design ${p.designId}: ${message}`);
    }

    const payload = {
      ...(userId ? { user_id: userId } : {}),
      name: p.name.trim(),
      category,
      canvas_width: p.width,
      canvas_height: p.height,
      pixel_data: { pixels: p.pixels, base_pixels: p.basePixels, text_layers: p.textLayers },
      palette: p.palette,
      is_published: existingPublished,
      updated_at: now,
    };

    let savedId = p.designId;
    let savedToDb = false;

    try {
      const { data, error } = await db
        .from(table)
        .upsert({ id: p.designId, ...payload })
        .select("id")
        .maybeSingle();

      if (!error && data?.id) {
        savedId = data.id;
        savedToDb = true;
      } else if (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Surface real errors instead of silently falling back to local storage.
        throw new Error(`Failed to update design in the database: ${message}`);
      }
    } catch (dbErr) {
      const message = dbErr instanceof Error ? dbErr.message : String(dbErr);
      throw new Error(`Failed to update design in the database: ${message}`);
    }

    // Always sync to local JSON storage
    return {
      id: savedId,
      message: `${category} updated: ${p.name.trim()}${savedToDb ? "" : " (saved to local storage)"}`,
    };
  }

  // Inserting a new design: MUST default to Unpublished (Task 3 Rule 1)
  const newPayload = {
    ...(userId ? { user_id: userId } : {}),
    name: p.name.trim(),
    category,
    canvas_width: p.width,
    canvas_height: p.height,
    pixel_data: { pixels: p.pixels, base_pixels: p.basePixels, text_layers: p.textLayers },
    palette: p.palette,
    is_published: false, // Default to unpublished
    updated_at: now,
  };

  let newId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `tile-${Date.now()}`;
  let savedToDb = false;

  try {
    const { data, error } = await db.from(table).insert(newPayload).select("id").single();
    if (!error && data?.id) {
      newId = data.id;
      savedToDb = true;
    } else if (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Surface real errors instead of silently falling back to local storage.
      throw new Error(`Failed to save new design to the database: ${message}`);
    }
  } catch (dbErr) {
    const message = dbErr instanceof Error ? dbErr.message : String(dbErr);
    throw new Error(`Failed to save new design to the database: ${message}`);
  }

  return {
    id: newId,
    message: `${category} saved: ${p.name.trim()} (Unpublished${savedToDb ? "" : ", saved to local storage"})`,
  };
}
