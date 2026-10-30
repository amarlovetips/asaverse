import { createClient } from "@/lib/supabase";

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
  source_width?: number;
  source_height?: number;
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
 * Calculates occupied pixel bounds and returns a trimmed AssetRecord representation
 * without empty margins, while retaining source dimensions.
 */
export function computeTrimmedAsset(asset: AssetRecord): AssetRecord {
  const pixels = asset.pixel_data || {};
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let count = 0;

  for (const [coord, color] of Object.entries(pixels)) {
    if (!color) continue;
    const [x, y] = coord.split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    count++;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  if (count === 0) {
    return {
      ...asset,
      source_width: asset.canvas_width,
      source_height: asset.canvas_height,
    };
  }

  const trimmedWidth = Math.max(1, maxX - minX + 1);
  const trimmedHeight = Math.max(1, maxY - minY + 1);
  const trimmedPixels: Record<string, string> = {};

  for (const [coord, color] of Object.entries(pixels)) {
    if (!color) continue;
    const [x, y] = coord.split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const nx = x - minX;
    const ny = y - minY;
    trimmedPixels[`${nx},${ny}`] = color;
  }

  return {
    ...asset,
    canvas_width: trimmedWidth,
    canvas_height: trimmedHeight,
    source_width: asset.canvas_width,
    source_height: asset.canvas_height,
    pixel_data: trimmedPixels,
  };
}

/**
 * Retrieves saved tiles and objects directly from Supabase.
 * Admin Map Generator loads all saved tiles and objects created in the studio.
 * `onlyPublished` defaults to false so newly saved designs appear immediately in the Map Generator library.
 */
export async function fetchAllMapAssets(onlyPublished: boolean = false): Promise<AssetRecord[]> {
  const map = new Map<string, AssetRecord>();

  // Fetch from Supabase map_tiles & map_objects.
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

        const rawAsset: AssetRecord = {
          id: row.id,
          name: row.name || "Untitled Tile",
          category: row.category || "tiles",
          canvas_width: Number(row.canvas_width) || 16,
          canvas_height: Number(row.canvas_height) || 16,
          pixel_data: normalizePixels(row.pixel_data),
          palette: Array.isArray(row.palette) ? row.palette : [],
          updated_at: row.updated_at || new Date().toISOString(),
          is_published: isPublished,
        };
        map.set(row.id, computeTrimmedAsset(rawAsset));
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

        const rawAsset: AssetRecord = {
          id: row.id,
          name: row.name || "Untitled Object",
          category: row.category || "object",
          canvas_width: Number(row.canvas_width) || 32,
          canvas_height: Number(row.canvas_height) || 32,
          pixel_data: normalizePixels(row.pixel_data),
          palette: Array.isArray(row.palette) ? row.palette : [],
          updated_at: row.updated_at || new Date().toISOString(),
          is_published: isPublished,
        };
        map.set(row.id, computeTrimmedAsset(rawAsset));
      }
    }
  } catch (err) {
    console.warn("fetch map_objects warning:", err);
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export async function fetchAssets(onlyPublished: boolean = false) {
  return fetchAllMapAssets(onlyPublished);
}

export async function fetchAssetsByCategory(
  category: string,
  onlyPublished: boolean = false
): Promise<AssetRecord[]> {
  const all = await fetchAllMapAssets(onlyPublished);
  return all.filter((a) => a.category.toLowerCase() === category.toLowerCase());
}
