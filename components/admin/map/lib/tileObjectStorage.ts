import { createClient } from "@/lib/supabase";
import { normalizePixels } from "./supabaseAssets";

export type TileObjectRecord = {
  id: string;
  name: string;
  category: string;
  canvas_width: number;
  canvas_height: number;
  pixel_data: Record<string, string>;
  palette: string[];
  is_published: boolean;
  updated_at: string;
  created_at?: string;
  user_id?: string;
};

const JSON_STORAGE_INDEX_KEY = "asaverse_tile_objects_json_index";
const JSON_STORAGE_ITEM_PREFIX = "asaverse_tile_object_";

/**
 * Returns locally synced JSON designs from storage.
 */
export function getLocalJsonTileObjects(): TileObjectRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const rawIndex = localStorage.getItem(JSON_STORAGE_INDEX_KEY);
    if (!rawIndex) return [];
    const ids: string[] = JSON.parse(rawIndex);
    const results: TileObjectRecord[] = [];
    for (const id of ids) {
      const itemRaw = localStorage.getItem(JSON_STORAGE_ITEM_PREFIX + id);
      if (itemRaw) {
        results.push(JSON.parse(itemRaw) as TileObjectRecord);
      }
    }
    return results;
  } catch (err) {
    console.warn("getLocalJsonTileObjects error:", err);
    return [];
  }
}

/**
 * Synchronizes a tile/object design to local JSON storage.
 */
export function syncTileObjectJson(design: TileObjectRecord) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(JSON_STORAGE_ITEM_PREFIX + design.id, JSON.stringify(design));
    const rawIndex = localStorage.getItem(JSON_STORAGE_INDEX_KEY);
    const ids: string[] = rawIndex ? JSON.parse(rawIndex) : [];
    if (!ids.includes(design.id)) {
      ids.unshift(design.id);
      localStorage.setItem(JSON_STORAGE_INDEX_KEY, JSON.stringify(ids));
    }
  } catch (err) {
    console.warn("syncTileObjectJson error:", err);
  }
}

/**
 * Removes a tile/object design from local JSON storage.
 */
export function removeLocalJsonTileObject(id: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(JSON_STORAGE_ITEM_PREFIX + id);
    const rawIndex = localStorage.getItem(JSON_STORAGE_INDEX_KEY);
    if (rawIndex) {
      const ids: string[] = JSON.parse(rawIndex);
      const next = ids.filter((i) => i !== id);
      localStorage.setItem(JSON_STORAGE_INDEX_KEY, JSON.stringify(next));
    }
  } catch (err) {
    console.warn("removeLocalJsonTileObject error:", err);
  }
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
export async function fetchAdminTileObjects(): Promise<TileObjectRecord[]> {
  const map = new Map<string, TileObjectRecord>();

  // 1. First, load from local JSON storage
  const localList = getLocalJsonTileObjects();
  for (const item of localList) {
    if (item.category === "body") continue;
    map.set(item.id, item);
  }

  // 2. Fetch from Supabase map_tiles & map_objects
  try {
    const db = createClient();

    // Query map_tiles
    const { data: tiles } = await db
      .from("map_tiles")
      .select("id, name, category, canvas_width, canvas_height, pixel_data, palette, is_published, updated_at, created_at, user_id")
      .order("updated_at", { ascending: false });

    if (Array.isArray(tiles)) {
      for (const t of tiles) {
        if (t.category === "map" || t.category === "body") continue;
        const rec: TileObjectRecord = {
          id: t.id,
          name: t.name || "Untitled Tile",
          category: t.category || "tiles",
          canvas_width: Number(t.canvas_width) || 16,
          canvas_height: Number(t.canvas_height) || 16,
          pixel_data: normalizePixels(t.pixel_data),
          palette: Array.isArray(t.palette) ? t.palette : [],
          is_published: t.is_published ?? false,
          updated_at: t.updated_at || new Date().toISOString(),
          created_at: t.created_at,
          user_id: t.user_id,
        };
        map.set(rec.id, rec);
        syncTileObjectJson(rec);
      }
    }

    // Query map_objects
    const { data: objects } = await db
      .from("map_objects")
      .select("id, name, category, canvas_width, canvas_height, pixel_data, palette, is_published, updated_at, created_at, user_id")
      .order("updated_at", { ascending: false });

    if (Array.isArray(objects)) {
      for (const o of objects) {
        if (o.category === "map" || o.category === "body") continue;
        const rec: TileObjectRecord = {
          id: o.id,
          name: o.name || "Untitled Object",
          category: o.category || "object",
          canvas_width: Number(o.canvas_width) || 32,
          canvas_height: Number(o.canvas_height) || 32,
          pixel_data: normalizePixels(o.pixel_data),
          palette: Array.isArray(o.palette) ? o.palette : [],
          is_published: o.is_published ?? false,
          updated_at: o.updated_at || new Date().toISOString(),
          created_at: o.created_at,
          user_id: o.user_id,
        };
        map.set(rec.id, rec);
        syncTileObjectJson(rec);
      }
    }
  } catch (err) {
    console.warn("fetchAdminTileObjects Supabase query warning:", err);
  }

  // Convert map to array sorted by updated_at descending
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

/**
 * Retrieves a single design by its ID.
 */
export async function fetchTileObjectById(id: string): Promise<TileObjectRecord | null> {
  // Check local JSON storage first for fast lookup
  const localList = getLocalJsonTileObjects();
  const foundLocal = localList.find((item) => item.id === id);

  try {
    const db = createClient();

    // Check map_tiles
    const { data: tile } = await db
      .from("map_tiles")
      .select("id, name, category, canvas_width, canvas_height, pixel_data, palette, is_published, updated_at, created_at, user_id")
      .eq("id", id)
      .maybeSingle();

    if (tile) {
      const rec: TileObjectRecord = {
        id: tile.id,
        name: tile.name,
        category: tile.category || "tiles",
        canvas_width: tile.canvas_width,
        canvas_height: tile.canvas_height,
        pixel_data: normalizePixels(tile.pixel_data),
        palette: tile.palette || [],
        is_published: tile.is_published ?? false,
        updated_at: tile.updated_at,
        created_at: tile.created_at,
        user_id: tile.user_id,
      };
      syncTileObjectJson(rec);
      return rec;
    }

    // Check map_objects
    const { data: obj } = await db
      .from("map_objects")
      .select("id, name, category, canvas_width, canvas_height, pixel_data, palette, is_published, updated_at, created_at, user_id")
      .eq("id", id)
      .maybeSingle();

    if (obj) {
      const rec: TileObjectRecord = {
        id: obj.id,
        name: obj.name,
        category: obj.category || "object",
        canvas_width: obj.canvas_width,
        canvas_height: obj.canvas_height,
        pixel_data: normalizePixels(obj.pixel_data),
        palette: obj.palette || [],
        is_published: obj.is_published ?? false,
        updated_at: obj.updated_at,
        created_at: obj.created_at,
        user_id: obj.user_id,
      };
      syncTileObjectJson(rec);
      return rec;
    }
  } catch (err) {
    console.warn("fetchTileObjectById database error:", err);
  }

  return foundLocal || null;
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
      // Try alternate table if category was mismatched
      const altTable = table === "map_tiles" ? "map_objects" : "map_tiles";
      await db
        .from(altTable)
        .update({ is_published: nextPublished, updated_at: timestamp })
        .eq("id", id);
    }
  } catch (err) {
    console.warn("updateTileObjectPublishStatus Supabase warning:", err);
  }

  // Update local JSON cache
  const local = await fetchTileObjectById(id);
  if (local) {
    local.is_published = nextPublished;
    local.updated_at = timestamp;
    syncTileObjectJson(local);
  }

  return { success: true, is_published: nextPublished };
}

/**
 * Deletes a tile or object design.
 */
export async function deleteTileObjectDesign(id: string, category: string): Promise<boolean> {
  try {
    const { db } = await getAuthClient();
    const table = category.toLowerCase() === "tiles" ? "map_tiles" : "map_objects";
    await db.from(table).delete().eq("id", id);
    const altTable = table === "map_tiles" ? "map_objects" : "map_tiles";
    await db.from(altTable).delete().eq("id", id);
  } catch (err) {
    console.warn("deleteTileObjectDesign database error:", err);
  }

  removeLocalJsonTileObject(id);
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

