import { createClient } from "@/lib/supabase";
import { normalizePixels } from "./supabaseAssets";

export type TileObjectRecord = {
  id: string;
  name: string;
  category: string;
  canvas_width: number;
  canvas_height: number;
  pixel_data: Record<string, string>;
  base_pixels: Record<string, string>;
  text_layers: import("../../../../lib/character-design-json").PixelTextLayer[];
  palette: string[];
  is_published: boolean;
  updated_at: string;
  created_at?: string;
  user_id?: string;
};

type StoredPixelData = {
  pixels?: Record<string, string>;
  base_pixels?: Record<string, string>;
  text_layers?: TileObjectRecord["text_layers"];
};

function readStoredPixelData(raw: unknown) {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "pixels" in raw) {
    const data = raw as StoredPixelData;
    return {
      pixel_data: normalizePixels(data.pixels),
      base_pixels: normalizePixels(data.base_pixels),
      text_layers: Array.isArray(data.text_layers) ? data.text_layers : [],
    };
  }
  return { pixel_data: normalizePixels(raw), base_pixels: {}, text_layers: [] };
}

/**
 * Verifies admin or authenticated user session in Supabase.
 */
export async function getAuthClient() {
  const db = createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) throw new Error("Please sign in first.");
  return { db, user };
}

/**
 * Fetches all saved tiles and objects for the Tiles & Object List.
 * Merges Supabase records with local JSON storage, ordered by updated_at descending.
 */
/**
 * Fetches all saved tiles and objects for the Tiles & Object List.
 * Supabase is the permanent source of truth. Throws an error if the database
 * is unreachable or returns no data, instead of silently falling back to
 * localStorage. Local JSON storage is used ONLY to fill gaps for a short time
 * after the remote state becomes available again.
 */
export async function fetchAdminTileObjects(): Promise<TileObjectRecord[]> {
  const db = createClient();
  const map = new Map<string, TileObjectRecord>();

  // 1. Fetch from Supabase map_tiles & map_objects
  try {
    // Query map_tiles
    const { data: tiles, error: tilesError } = await db
      .from("map_tiles")
      .select("id, name, category, canvas_width, canvas_height, pixel_data, palette, is_published, updated_at, created_at, user_id")
      .order("updated_at", { ascending: false });

    if (tilesError) {
      const message = tilesError instanceof Error ? tilesError.message : String(tilesError);
      throw new Error(`failed to fetch map_tiles: ${message}`);
    }

    if (Array.isArray(tiles)) {
      for (const t of tiles) {
        if (t.category === "map" || t.category === "body") continue;
        const rec: TileObjectRecord = {
          id: t.id,
          name: t.name || "Untitled Tile",
          category: t.category || "tiles",
          canvas_width: Number(t.canvas_width) || 16,
          canvas_height: Number(t.canvas_height) || 16,
          ...readStoredPixelData(t.pixel_data),
          palette: Array.isArray(t.palette) ? t.palette : [],
          is_published: t.is_published ?? false,
          updated_at: t.updated_at || new Date().toISOString(),
          created_at: t.created_at,
          user_id: t.user_id,
        };
        map.set(rec.id, rec);

      }
    }

    // Query map_objects
    const { data: objects, error: objectsError } = await db
      .from("map_objects")
      .select("id, name, category, canvas_width, canvas_height, pixel_data, palette, is_published, updated_at, created_at, user_id")
      .order("updated_at", { ascending: false });

    if (objectsError) {
      const message = objectsError instanceof Error ? objectsError.message : String(objectsError);
      throw new Error(`failed to fetch map_objects: ${message}`);
    }

    if (Array.isArray(objects)) {
      for (const o of objects) {
        if (o.category === "map" || o.category === "body") continue;
        const rec: TileObjectRecord = {
          id: o.id,
          name: o.name || "Untitled Object",
          category: o.category || "object",
          canvas_width: Number(o.canvas_width) || 32,
          canvas_height: Number(o.canvas_height) || 32,
          ...readStoredPixelData(o.pixel_data),
          palette: Array.isArray(o.palette) ? o.palette : [],
          is_published: o.is_published ?? false,
          updated_at: o.updated_at || new Date().toISOString(),
          created_at: o.created_at,
          user_id: o.user_id,
        };
        map.set(rec.id, rec);

      }
    }
  } catch (err) {
    // Re-throw Supabase errors so the UI can surface them.
    if (err instanceof Error && (err.message.startsWith("failed to fetch map_tiles") || err.message.startsWith("failed to fetch map_objects"))) {
      throw err;
    }
    throw err;
  }

  // 2. If Supabase returned nothing, throw rather than silently showing empty.
  if (map.size === 0) {
    throw new Error("No tiles or objects found in the database. Nothing has been saved yet.");
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

/**
 * Retrieves a single design by its ID.
 * Supabase is the permanent source of truth. Throws an error if the design is not found,
 * instead of silently falling back to local storage.
 */
export async function fetchTileObjectById(id: string): Promise<TileObjectRecord | null> {
  try {
    const db = createClient();

    // Check map_tiles
    const { data: tile, error: tileError } = await db
      .from("map_tiles")
      .select("id, name, category, canvas_width, canvas_height, pixel_data, palette, is_published, updated_at, created_at, user_id")
      .eq("id", id)
      .maybeSingle();

    if (tileError) {
      const message = tileError instanceof Error ? tileError.message : String(tileError);
      throw new Error(`Failed to fetch tile object ${id} from map_tiles: ${message}`);
    }

    if (tile) {
      const rec: TileObjectRecord = {
        id: tile.id,
        name: tile.name,
        category: tile.category || "tiles",
        canvas_width: tile.canvas_width,
        canvas_height: tile.canvas_height,
        ...readStoredPixelData(tile.pixel_data),
        palette: tile.palette || [],
        is_published: tile.is_published ?? false,
        updated_at: tile.updated_at,
        created_at: tile.created_at,
        user_id: tile.user_id,
      };
      return rec;
    }

    // Check map_objects
    const { data: obj, error: objError } = await db
      .from("map_objects")
      .select("id, name, category, canvas_width, canvas_height, pixel_data, palette, is_published, updated_at, created_at, user_id")
      .eq("id", id)
      .maybeSingle();

    if (objError) {
      const message = objError instanceof Error ? objError.message : String(objError);
      throw new Error(`Failed to fetch tile object ${id} from map_objects: ${message}`);
    }

    if (obj) {
      const rec: TileObjectRecord = {
        id: obj.id,
        name: obj.name,
        category: obj.category || "object",
        canvas_width: obj.canvas_width,
        canvas_height: obj.canvas_height,
        ...readStoredPixelData(obj.pixel_data),
        palette: obj.palette || [],
        is_published: obj.is_published ?? false,
        updated_at: obj.updated_at,
        created_at: obj.created_at,
        user_id: obj.user_id,
      };
      return rec;
    }

    // Design not found in the database. No silent local fallback.
    throw new Error(`Tile or object design with id "${id}" was not found in the database. It may have been deleted.`);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to fetch tile object ${id}: ${String(err)}`);
  }
}

/**
 * Toggles or updates the publication status of a tile or object design.
 * Persists immediately in Supabase and in local JSON storage.
 */
export async function updateTileObjectPublishStatus(
  id: string,
  category: string,
  nextPublished: boolean
): Promise<{ success: boolean; is_published: boolean }> {
  const timestamp = new Date().toISOString();

  try {
    const { db } = await getAuthClient();
    const table = category.toLowerCase() === "tiles" ? "map_tiles" : "map_objects";

    const { error } = await db
      .from(table)
      .update({ is_published: nextPublished, updated_at: timestamp })
      .eq("id", id);

    if (error) {
      const altTable = table === "map_tiles" ? "map_objects" : "map_tiles";
      const { error: altError } = await db
        .from(altTable)
        .update({ is_published: nextPublished, updated_at: timestamp })
        .eq("id", id);
      if (altError) throw new Error(`Failed to update publication status: ${altError.message}`);
    }
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }

  return { success: true, is_published: nextPublished };
}

/**
 * Deletes a tile or object design.
 */
export async function deleteTileObjectDesign(id: string, category: string): Promise<boolean> {
  const { db } = await getAuthClient();
  const table = category.toLowerCase() === "tiles" ? "map_tiles" : "map_objects";
  const { error } = await db.from(table).delete().eq("id", id);
  if (error) throw error;
  return true;
}

/**
 * Triggers a browser download of the design's standard JSON format.
 */
export function exportTileObjectJson(design: TileObjectRecord) {
  const payload = {
    format: "asaverse-map-asset",
    version: 1,
    exported_at: new Date().toISOString(),
    asset: {
      id: design.id,
      name: design.name,
      category: design.category,
      canvas_width: design.canvas_width,
      canvas_height: design.canvas_height,
      pixel_data: design.pixel_data,
      palette: design.palette,
      is_published: design.is_published,
      updated_at: design.updated_at,
    },
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${design.name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "asset"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
