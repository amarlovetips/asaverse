import { createClient } from "@/lib/supabase";

export type RawPixelData = {
  pixels?: Record<string, string>;
  base_pixels?: Record<string, string>;
  text_layers?: unknown[];
} | Record<string, string>;

export type AssetAnimationData = {
  enabled?: boolean;
  duration_ms?: number;
  loop?: boolean;
  frames: Record<string, string>[];
};

export type AssetRecord = {
  id: string;
  name: string;
  category: string;
  canvas_width: number;
  canvas_height: number;
  source_width?: number;
  source_height?: number;
  source_table?: "map_tiles" | "map_objects";
  pixel_data: Record<string, string>;
  palette?: string[];
  animation?: AssetAnimationData | null;
  updated_at: string;
  is_published: boolean;
};

export type AssetList = AssetRecord[];

export function extractAssetAnimation(raw: unknown): AssetAnimationData | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const source = raw as Record<string, unknown>;
  const animationCandidate = source.animation && typeof source.animation === "object" && !Array.isArray(source.animation)
    ? source.animation as Record<string, unknown>
    : source;

  if (!animationCandidate || typeof animationCandidate !== "object") return null;
  const frames = Array.isArray(animationCandidate.frames)
    ? animationCandidate.frames.map((frame) => normalizePixels(frame)).filter((frame) => !!frame && Object.keys(frame).length > 0)
    : [];

  if (!frames.length) return null;

  return {
    enabled: animationCandidate.enabled !== false,
    duration_ms: Number(animationCandidate.duration_ms ?? 250),
    loop: animationCandidate.loop !== false,
    frames,
  };
}

export function hasAssetAnimation(asset: AssetRecord | null | undefined): boolean {
  return !!asset && Array.isArray(asset.animation?.frames) && asset.animation.frames.length > 1;
}

export function getAssetAnimationSnapshot(
  asset: AssetRecord | null | undefined,
  timestampMs: number = Date.now(),
  enabledOverride?: boolean
): Record<string, string> {
  const fallback = asset?.pixel_data ?? {};
  const animation = asset?.animation;
  const enabled = typeof enabledOverride === "boolean" ? enabledOverride : animation?.enabled ?? false;

  if (!enabled || !animation || !Array.isArray(animation.frames) || animation.frames.length === 0) {
    return fallback;
  }

  const durationMs = Number(animation.duration_ms ?? 250) || 250;
  const frameIndex = animation.frames.length > 1 ? Math.floor((timestampMs / durationMs) % animation.frames.length) : 0;
  return animation.frames[frameIndex] ?? fallback;
}

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
 * Preserve the original artboard dimensions as stored in the source asset.
 * The animation editor must retain the full canvas size and transparent empty
 * pixels rather than trimming the artboard to occupied pixels.
 */
export function computeTrimmedAsset(asset: AssetRecord): AssetRecord {
  return {
    ...asset,
    source_width: asset.canvas_width,
    source_height: asset.canvas_height,
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

        const rawPixels = normalizePixels(row.pixel_data);
        const animation = extractAssetAnimation(row.pixel_data);
        const rawAsset: AssetRecord = {
          id: row.id,
          name: row.name || "Untitled Tile",
          category: row.category || "tiles",
          canvas_width: Number(row.canvas_width) || 16,
          canvas_height: Number(row.canvas_height) || 16,
          source_table: "map_tiles",
          pixel_data: rawPixels,
          palette: Array.isArray(row.palette) ? row.palette : [],
          animation: animation ? { ...animation, frames: animation.frames.map((frame) => ({ ...frame })) } : null,
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

        const rawPixels = normalizePixels(row.pixel_data);
        const animation = extractAssetAnimation(row.pixel_data);
        const rawAsset: AssetRecord = {
          id: row.id,
          name: row.name || "Untitled Object",
          category: row.category || "object",
          canvas_width: Number(row.canvas_width) || 32,
          canvas_height: Number(row.canvas_height) || 32,
          source_table: "map_objects",
          pixel_data: rawPixels,
          palette: Array.isArray(row.palette) ? row.palette : [],
          animation: animation ? { ...animation, frames: animation.frames.map((frame) => ({ ...frame })) } : null,
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

export async function saveTileObjectAnimation(
  asset: AssetRecord,
  frames: Record<string, string>[],
  durationMs: number = 250
): Promise<AssetRecord> {
  const table = asset.source_table === "map_objects" ? "map_objects" : "map_tiles";
  const normalizedFrames = frames.length > 0 ? frames.map((frame) => ({ ...frame })) : [{ ...asset.pixel_data }];
  const payload = {
    pixel_data: {
      pixels: normalizedFrames[0] ?? {},
      animation: {
        enabled: true,
        loop: true,
        duration_ms: Math.max(80, Math.round(Number(durationMs) || 250)),
        frames: normalizedFrames,
      },
    },
  };

  const db = createClient();
  const { data, error } = await db
    .from(table)
    .update({ pixel_data: payload.pixel_data, updated_at: new Date().toISOString() })
    .eq("id", asset.id)
    .select("id, name, category, canvas_width, canvas_height, pixel_data, palette, updated_at, is_published")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Animation save failed: no record returned.");

  const savedAsset: AssetRecord = {
    id: data.id,
    name: data.name || asset.name,
    category: data.category || asset.category,
    canvas_width: Number(data.canvas_width) || asset.canvas_width,
    canvas_height: Number(data.canvas_height) || asset.canvas_height,
    source_table: table,
    pixel_data: normalizePixels(data.pixel_data),
    palette: Array.isArray(data.palette) ? data.palette : asset.palette,
    animation: extractAssetAnimation(data.pixel_data) ?? { enabled: true, duration_ms: Math.max(80, Math.round(Number(durationMs) || 250)), frames: normalizedFrames },
    updated_at: data.updated_at || new Date().toISOString(),
    is_published: data.is_published ?? asset.is_published,
  };

  return savedAsset;
}
