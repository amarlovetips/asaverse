import { createClient } from "../../../../lib/supabase";
import type { PixelTextLayer } from "../../../../lib/character-design-json";
import { syncTileObjectJson, type TileObjectRecord } from "../lib/tileObjectStorage";

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
 * Computes tight bounding box of non-transparent artwork pixels, excluding unused transparent margins.
 * Artwork occupying e.g. 15x10 on a 16x16 artboard will be trimmed to width 15, height 10,
 * with pixel coordinates normalized to (0, 0).
 */
function computeTrimmedArtwork(
  pixels: Record<string, string>,
  origWidth: number,
  origHeight: number
): { width: number; height: number; pixels: Record<string, string>; hasVisiblePixels: boolean } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  let hasPixel = false;
  for (const [key, color] of Object.entries(pixels)) {
    if (!color) continue;
    const [x, y] = key.split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    hasPixel = true;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  // If no pixels drawn, report that no visible pixels exist
  if (!hasPixel) {
    return { width: origWidth, height: origHeight, pixels: {}, hasVisiblePixels: false };
  }

  const contentWidth = Math.max(1, maxX - minX + 1);
  const contentHeight = Math.max(1, maxY - minY + 1);

  // Shift coordinates so content starts at (0, 0)
  const trimmedPixels: Record<string, string> = {};
  for (const [key, color] of Object.entries(pixels)) {
    if (!color) continue;
    const [x, y] = key.split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const nx = x - minX;
    const ny = y - minY;
    trimmedPixels[`${nx},${ny}`] = color;
  }

  return {
    width: contentWidth,
    height: contentHeight,
    pixels: trimmedPixels,
    hasVisiblePixels: true,
  };
}

export async function persistCharacterDesign(p: Input) {
  if (!p.name.trim()) throw Error("Enter a tile or object name.");

  // Automatic content bounds detection:
  // Detect actual non-transparent artwork bounds and exclude unused transparent margins
  const trimmed = computeTrimmedArtwork(p.pixels, p.width, p.height);
  if (!trimmed.hasVisiblePixels) {
    throw Error("Cannot save an empty or completely transparent design. Please draw at least one pixel.");
  }
  const effectiveWidth = trimmed.width;
  const effectiveHeight = trimmed.height;
  const effectivePixels = trimmed.pixels;

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
    } catch {
      // Continue with false fallback
    }

    const payload = {
      ...(userId ? { user_id: userId } : {}),
      name: p.name.trim(),
      category,
      canvas_width: effectiveWidth,
      canvas_height: effectiveHeight,
      pixel_data: { pixels: effectivePixels, base_pixels: p.basePixels, text_layers: p.textLayers },
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
        console.warn("Supabase upsert warning:", error);
      }
    } catch (dbErr) {
      console.warn("Supabase upsert error:", dbErr);
    }

    // Always sync to local JSON storage
    const record: TileObjectRecord = {
      id: savedId,
      name: p.name.trim(),
      category,
      canvas_width: effectiveWidth,
      canvas_height: effectiveHeight,
      pixel_data: effectivePixels,
      palette: p.palette,
      is_published: existingPublished,
      updated_at: now,
      user_id: userId,
    };
    syncTileObjectJson(record);

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
    canvas_width: effectiveWidth,
    canvas_height: effectiveHeight,
    pixel_data: { pixels: effectivePixels, base_pixels: p.basePixels, text_layers: p.textLayers },
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
      console.warn("Supabase insert warning:", error);
    }
  } catch (dbErr) {
    console.warn("Supabase insert error:", dbErr);
  }

  // Always sync to local JSON storage
  const newRecord: TileObjectRecord = {
    id: newId,
    name: p.name.trim(),
    category,
    canvas_width: effectiveWidth,
    canvas_height: effectiveHeight,
    pixel_data: effectivePixels,
    palette: p.palette,
    is_published: false,
    updated_at: now,
    user_id: userId,
  };
  syncTileObjectJson(newRecord);

  return {
    id: newId,
    message: `${category} saved: ${p.name.trim()} (Unpublished${savedToDb ? "" : ", saved to local storage"})`,
  };
}
