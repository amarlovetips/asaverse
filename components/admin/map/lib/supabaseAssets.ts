import { createClient } from "@/lib/supabase";
import { getLocalJsonTileObjects } from "./tileObjectStorage";

export type RawPixelData = {
  pixels?: Record<string, string>;
  base_pixels?: Record<string, string>;
  text_layers?: unknown[];
} | Record<string, string>;

export type AssetRecord = {
  id: string;
  name: string;
  category: string;
  canvas_width: number;
  canvas_height: number;
  pixel_data: Record<string, string>;
  palette?: string[];
  updated_at: string;
  is_published: boolean;
};

export type AssetList = AssetRecord[];

/**
 * Normalizes pixel data stored in Supabase into a flat Record<string, string> (e.g. { "0,0": "#ffffff" }).
 */
export function normalizePixels(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  if ("pixels" in (raw as Record<string, unknown>)) {
    const p = (raw as { pixels?: unknown }).pixels;
    if (p && typeof p === "object") return p as Record<string, string>;
  }
  return raw as Record<string, string>;
}

/**
 * Retrieves saved tiles and objects.
 * When `onlyPublished` is true (the default for the Map Generator browser),
 * it returns ONLY designs with is_published === true.
 * Unpublished designs are strictly excluded.
 */
export async function fetchAllMapAssets(onlyPublished: boolean = true): Promise<AssetRecord[]> {
  const map = new Map<string, AssetRecord>();

  // 1. Load from local JSON storage
  const localList = getLocalJsonTileObjects();
  for (const item of localList) {
    if (onlyPublished && !item.is_published) continue;
    map.set(item.id, {
      id: item.id,
      name: item.name,
      category: item.category,
      canvas_width: item.canvas_width,
      canvas_height: item.canvas_height,
      pixel_data: item.pixel_data,
      palette: item.palette,
      updated_at: item.updated_at,
      is_published: item.is_published,
    });
  }

  // 2. Fetch from Supabase map_tiles & map_objects
  try {
    const db = createClient();

    // Query map_tiles
    const { data: tiles, error: tilesError } = await db
      .from("map_tiles")
      .select("id, name, category, canvas_width, canvas_height, pixel_data, palette, updated_at, is_published")
      .order("updated_at", { ascending: false });

    if (!tilesError && Array.isArray(tiles)) {
      for (const row of tiles) {
        if (row.category === "map") continue;
        const isPublished = row.is_published === true;
        if (onlyPublished && !isPublished) continue;

        map.set(row.id, {
          id: row.id,
          name: row.name || "Untitled Tile",
          category: row.category || "tiles",
          canvas_width: Number(row.canvas_width) || 16,
          canvas_height: Number(row.canvas_height) || 16,
          pixel_data: normalizePixels(row.pixel_data),
          palette: Array.isArray(row.palette) ? row.palette : [],
          updated_at: row.updated_at || new Date().toISOString(),
          is_published: isPublished,
        });
      }
    }
  } catch (err) {
    console.warn("fetch map_tiles warning:", err);
  }

  try {
    const db = createClient();

    // Query map_objects
    const { data: objects, error: objectsError } = await db
      .from("map_objects")
      .select("id, name, category, canvas_width, canvas_height, pixel_data, palette, updated_at, is_published")
      .order("updated_at", { ascending: false });

    if (!objectsError && Array.isArray(objects)) {
      for (const row of objects) {
        if (row.category === "map") continue;
        const isPublished = row.is_published === true;
        if (onlyPublished && !isPublished) continue;

        map.set(row.id, {
          id: row.id,
          name: row.name || "Untitled Object",
          category: row.category || "object",
          canvas_width: Number(row.canvas_width) || 32,
          canvas_height: Number(row.canvas_height) || 32,
          pixel_data: normalizePixels(row.pixel_data),
          palette: Array.isArray(row.palette) ? row.palette : [],
          updated_at: row.updated_at || new Date().toISOString(),
          is_published: isPublished,
        });
      }
    }
  } catch (err) {
    console.warn("fetch map_objects warning:", err);
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export async function fetchAssets(onlyPublished: boolean = true) {
  return fetchAllMapAssets(onlyPublished);
}

export async function fetchAssetsByCategory(
  category: string,
  onlyPublished: boolean = true
): Promise<AssetRecord[]> {
  const all = await fetchAllMapAssets(onlyPublished);
  return all.filter((a) => a.category.toLowerCase() === category.toLowerCase());
}
