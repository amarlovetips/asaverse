import { createClient } from "@/lib/supabase";

export type CollisionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayerGroupType = "ground" | "objects" | "blocked";

export type CollisionMode = "walkable" | "blocked" | "custom";

export type ShapePoint = {
  x: number;
  y: number;
};

export type BlockedShapeType = "rectangle" | "circle" | "polygon";

export type PlacedAsset = {
  id: string;
  assetId: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  opacity?: number; // 0 to 1, defaults to 1
  layerId: string;
  collision?: CollisionRect | null;
  collisionMode?: CollisionMode;
  occlusionDepth?: number; // Y offset from top for depth sorting, defaults to bottom (height)
};

export type MapLayer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  order: number;
  group?: LayerGroupType; // "ground" | "objects" | "blocked", default "ground"
  opacity?: number; // 0 to 1, defaults to 1
};

export type BlockedArea = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: BlockedShapeType; // "rectangle" | "circle" | "polygon", defaults to "rectangle"
  points?: ShapePoint[]; // For polygon: list of vertex coordinates
  label?: string;
  layerId?: string; // Optional reference to dedicated blocked layer
  opacity?: number; // Visual overlay opacity in editor (0 to 1, default ~0.4)
};

export type SavedMapData = {
  id: string;
  name: string;
  layers: MapLayer[];
  placements: PlacedAsset[];
  camera?: { x: number; y: number; zoom: number };
  bounds?: { width: number; height: number };
  blockedAreas?: BlockedArea[];
  enemySpawn?: { x: number; y: number; home_x?: number; home_y?: number };
  is_published?: boolean;
  is_default?: boolean;
  updated_at: string;
  created_at: string;
};

export type MapVersionRecord = {
  id: string;
  map_id: string;
  version_number: number;
  name: string;
  map_data: SavedMapData;
  created_at: string;
};

export type MapSummary = {
  id: string;
  name: string;
  is_published: boolean;
  is_default: boolean;
  updated_at: string;
  created_at?: string;
  placements_count?: number;
};

const MAX_SAVED_VERSIONS = 10;

function createUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * Saves a snapshot version to the map's version history (retaining at most 10 recent snapshots).
 */
export async function pushMapVersion(mapData: SavedMapData): Promise<void> {
  const versionId = createUuid();
  const now = new Date().toISOString();

  const db = createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError) throw authError;
  const { data: remoteVersions, error: versionsError } = await db
      .from("map_version_history")
      .select("id, version_number")
      .eq("map_id", mapData.id)
      .order("created_at", { ascending: false });
  if (versionsError) throw versionsError;
  const currentMax = remoteVersions?.[0]?.version_number || 0;
  const { error: insertError } = await db.from("map_version_history").insert({
      id: versionId,
      map_id: mapData.id,
      user_id: user?.id || null,
      version_number: currentMax + 1,
      name: mapData.name,
      map_data: mapData,
      created_at: now,
    });
  if (insertError) throw insertError;
  if (remoteVersions && remoteVersions.length >= MAX_SAVED_VERSIONS) {
    const toDelete = remoteVersions.slice(MAX_SAVED_VERSIONS - 1).map((v: { id: string }) => v.id);
    if (toDelete.length > 0) {
      const { error: deleteError } = await db.from("map_version_history").delete().in("id", toDelete);
      if (deleteError) throw deleteError;
    }
  }
}

/**
 * Fetches the version history for a map.
 */
export async function getMapVersionHistory(mapId: string): Promise<MapVersionRecord[]> {
  const db = createClient();
  const { data, error } = await db
      .from("map_version_history")
      .select("id, map_id, version_number, name, map_data, created_at")
      .eq("map_id", mapId)
      .order("created_at", { ascending: false })
      .limit(MAX_SAVED_VERSIONS);

  if (error) throw error;
  return (data || []) as MapVersionRecord[];
}

/**
 * Saves a map to Supabase (saved_maps) and synchronizes to localStorage.
 * Automatically saves a history version entry for successful saves.
 */
export async function saveMap(
  mapData: SavedMapData,
  createHistoryEntry = true
): Promise<{ id: string; success: boolean; message: string }> {
  const now = new Date().toISOString();
  mapData.updated_at = now;
  if (!mapData.created_at) mapData.created_at = now;

  const db = createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError) throw authError;

  const { data: savedRecord, error: savedError } = await db
      .from("saved_maps")
      .upsert(
        {
          id: mapData.id,
          user_id: user?.id || null,
          name: mapData.name,
          map_data: mapData,
          is_published: mapData.is_published ?? false,
          is_default: mapData.is_default ?? false,
          updated_at: now,
        },
        { onConflict: "id" }
      )
      .select("id")
      .maybeSingle();

  if (savedError || !savedRecord?.id) {
    throw new Error(`Map save failed: ${savedError?.message || "database did not return the saved record"}`);
  }
  if (createHistoryEntry) await pushMapVersion(mapData);
  return { id: savedRecord.id, success: true, message: `Map "${mapData.name}" saved to database.` };
}

/**
 * Loads a map by ID from Supabase.
 * Throws an error if the map is not found, so callers can surface the failure
 * instead of silently falling back to localStorage.
 */
export async function loadMap(mapId: string): Promise<SavedMapData> {
  // Try Supabase first
  try {
    const db = createClient();

    // Check saved_maps
    const { data: remoteData, error: remoteError } = await db
      .from("saved_maps")
      .select("id, name, map_data, is_published, is_default, updated_at, created_at")
      .eq("id", mapId)
      .maybeSingle();

    if (!remoteError && remoteData?.map_data) {
      const parsed = remoteData.map_data as SavedMapData;
      parsed.id = remoteData.id;
      parsed.name = remoteData.name || parsed.name;
      parsed.is_published = remoteData.is_published ?? parsed.is_published ?? false;
      parsed.is_default = remoteData.is_default ?? parsed.is_default ?? false;
      return parsed;
    }

    if (remoteError) throw remoteError;
  } catch (err) {
    // Re-throw Supabase errors so they reach the UI.
    if (err instanceof Error && err.message.startsWith("failed to load map")) {
      throw err;
    }
    throw err;
  }

  // Map was not found in any database table.
  throw new Error(`Map with id "${mapId}" was not found in the database. It has not been saved yet.`);
}

/**
 * Lists all available maps with publication and default-map metadata.
 */
export async function listMaps(): Promise<MapSummary[]> {
  const mapDict = new Map<string, MapSummary>();

  // From Supabase saved_maps
  try {
    const db = createClient();
    const { data, error } = await db
      .from("saved_maps")
      .select("id, name, is_published, is_default, updated_at, created_at, map_data")
      .order("updated_at", { ascending: false });

    if (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`failed to list maps from saved_maps: ${message}`);
    }

    if (Array.isArray(data)) {
      for (const item of data) {
        const placementsCount = Array.isArray(item.map_data?.placements)
          ? item.map_data.placements.length
          : undefined;
        mapDict.set(item.id, {
          id: item.id,
          name: item.name || "Untitled Map",
          is_published: item.is_published === true,
          is_default: item.is_default === true,
          updated_at: item.updated_at,
          created_at: item.created_at,
          placements_count: placementsCount,
        });
      }
    }
  } catch (err) {
    // Re-throw Supabase errors so the UI can surface them.
    if (err instanceof Error && err.message.startsWith("failed to list maps")) {
      throw err;
    }
    throw err;
  }

  return Array.from(mapDict.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

/**
 * Updates the publication status of a map.
 */
export async function updateMapPublishStatus(mapId: string, isPublished: boolean): Promise<boolean> {
  const timestamp = new Date().toISOString();
  const { error } = await createClient().from("saved_maps").update({ is_published: isPublished, updated_at: timestamp }).eq("id", mapId);
  if (error) throw error;
  return true;
}

/**
 * Sets a map as the default active map (unsetting all other maps).
 */
export async function setDefaultMap(mapId: string): Promise<boolean> {
  const timestamp = new Date().toISOString();
  const db = createClient();
  const { error: clearError } = await db.from("saved_maps").update({ is_default: false }).neq("id", mapId);
  if (clearError) throw clearError;
  const { error } = await db.from("saved_maps").update({ is_default: true, is_published: true, updated_at: timestamp }).eq("id", mapId);
  if (error) throw error;
  return true;
}

/**
 * Retrieves the currently active default map.
 */
export async function getDefaultMap(): Promise<SavedMapData | null> {
  // Check Supabase
  try {
    const db = createClient();
    const { data, error } = await db
      .from("saved_maps")
      .select("id, name, map_data, is_published, is_default, updated_at")
      .eq("is_default", true)
      .maybeSingle();

    if (error) throw error;
    if (data?.map_data) {
      const parsed = data.map_data as SavedMapData;
      parsed.id = data.id;
      parsed.is_default = true;
      parsed.is_published = true;
      return parsed;
    }
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
  return null;
}

/**
 * Deletes an unpublished map.
 * Fails / rejects if map is published.
 */
export async function deleteMap(mapId: string): Promise<boolean> {
  // Check if published
  const map = await loadMap(mapId);
  if (map?.is_published) {
    throw new Error("Cannot delete a published map. Unpublish it first.");
  }

  const db = createClient();
  const { error: versionError } = await db.from("map_version_history").delete().eq("map_id", mapId);
  if (versionError) throw versionError;
  const { error } = await db.from("saved_maps").delete().eq("id", mapId);
  if (error) throw error;
  return true;
}

/**
 * Validates map JSON object structure, reporting errors or missing required fields.
 */
export function validateMapJson(data: unknown): { valid: boolean; errors: string[]; map?: SavedMapData } {
  const errors: string[] = [];
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Data is not a valid JSON object."] };
  }

  // Support both direct SavedMapData and wrapped export formats ({ format: "asaverse-map", map: ... })
  const mapObj = (data as { map?: SavedMapData }).map && typeof (data as { map?: SavedMapData }).map === "object"
    ? (data as { map: SavedMapData }).map
    : (data as SavedMapData);

  if (!mapObj.id || typeof mapObj.id !== "string") {
    errors.push("Missing or invalid map ID.");
  }
  if (!mapObj.name || typeof mapObj.name !== "string") {
    errors.push("Missing or invalid map name.");
  }
  if (!Array.isArray(mapObj.layers)) {
    errors.push("Map layers must be an array.");
  }
  if (!Array.isArray(mapObj.placements)) {
    errors.push("Map placements must be an array.");
  }

  // Validate layers
  if (Array.isArray(mapObj.layers)) {
    const layerIds = new Set<string>();
    mapObj.layers.forEach((l, idx) => {
      if (!l.id || typeof l.id !== "string") {
        errors.push(`Layer at index ${idx} missing valid ID.`);
      } else if (layerIds.has(l.id)) {
        errors.push(`Duplicate layer ID: ${l.id}.`);
      } else {
        layerIds.add(l.id);
      }
    });
  }

  // Validate placements
  if (Array.isArray(mapObj.placements)) {
    const placementIds = new Set<string>();
    mapObj.placements.forEach((p, idx) => {
      if (!p.id || typeof p.id !== "string") {
        errors.push(`Placement at index ${idx} missing valid ID.`);
      } else if (placementIds.has(p.id)) {
        errors.push(`Duplicate placement ID: ${p.id}.`);
      } else {
        placementIds.add(p.id);
      }
      if (!p.assetId || typeof p.assetId !== "string") {
        errors.push(`Placement ${p.id || idx} missing asset ID reference.`);
      }
      if (typeof p.x !== "number" || typeof p.y !== "number") {
        errors.push(`Placement ${p.id || idx} has non-numeric coordinates.`);
      }
      if (typeof p.width !== "number" || typeof p.height !== "number" || p.width <= 0 || p.height <= 0) {
        errors.push(`Placement ${p.id || idx} has invalid dimensions (${p.width}x${p.height}).`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    map: errors.length === 0 ? mapObj : undefined,
  };
}

/**
 * Exports map JSON file for download.
 */
export function exportMapJson(mapData: SavedMapData) {
  const validation = validateMapJson(mapData);
  if (!validation.valid) {
    throw new Error(`Export validation failed: ${validation.errors.join("; ")}`);
  }

  const payload = {
    format: "asaverse-map",
    version: 2,
    exported_at: new Date().toISOString(),
    map: {
      id: mapData.id,
      name: mapData.name,
      layers: mapData.layers.map((l) => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        locked: l.locked,
        order: l.order,
        group: l.group || (l.id.includes("ground") ? "ground" : "objects"),
        opacity: l.opacity !== undefined ? l.opacity : 1,
      })),
      placements: mapData.placements.map((p) => ({
        id: p.id,
        assetId: p.assetId,
        name: p.name,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        scaleX: p.scaleX,
        scaleY: p.scaleY,
        rotation: p.rotation,
        opacity: p.opacity !== undefined ? p.opacity : 1,
        layerId: p.layerId,
        collision: p.collision || null,
        collisionMode: p.collisionMode || "walkable",
        occlusionDepth: p.occlusionDepth,
      })),
      blockedAreas: (mapData.blockedAreas || []).map((b) => ({
        id: b.id,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        shape: b.shape || "rectangle",
        points: b.points || [],
        label: b.label || "Blocked",
        layerId: b.layerId,
        opacity: b.opacity,
      })),
      camera: mapData.camera,
      bounds: mapData.bounds,
      enemySpawn: mapData.enemySpawn,
      is_published: mapData.is_published,
      is_default: mapData.is_default,
      updated_at: mapData.updated_at,
      created_at: mapData.created_at,
    },
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${mapData.name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "map"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
