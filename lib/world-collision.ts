import type { SavedMapData } from "@/components/admin/map/lib/saveLoad";
import { getOrCreateAssetCanvas } from "@/components/admin/map/lib/assetRenderer";
import type { AssetRecord } from "@/components/admin/map/lib/supabaseAssets";

export type WorldObstacle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ActiveGameWorld = {
  map: SavedMapData | null;
  obstacles: WorldObstacle[];
  enemySpawn: { x: number; y: number; home_x: number; home_y: number };
  playerSpawn: { x: number; y: number };
};

/**
 * Builds the runtime world geometry, obstacles, and spawns from the active default map (or fallback).
 */
export function buildWorldCollision(map: SavedMapData | null, assetMap?: Map<string, AssetRecord>): ActiveGameWorld {
  const obstacles: WorldObstacle[] = [];
  const defaultSpawn = { x: 3100, y: 3100, home_x: 3100, home_y: 3100 };

  if (!map) {
    return {
      map: null,
      obstacles: [],
      enemySpawn: defaultSpawn,
      playerSpawn: { x: 3100, y: 3100 },
    };
  }

  // 1. Process custom marked blocked areas
  if (Array.isArray(map.blockedAreas)) {
    for (const b of map.blockedAreas) {
      obstacles.push({
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
      });
    }
  }

  // 2. Process placed assets with collision or auto-blocking categories
  if (Array.isArray(map.placements)) {
    // Create quick lookup for layer groups
    const layerMap = new Map<string, { group?: string }>();
    if (Array.isArray(map.layers)) {
      for (const l of map.layers) {
        layerMap.set(l.id, { group: l.group || (l.id.includes("ground") ? "ground" : "objects") });
      }
    }

    for (const p of map.placements) {
      // 1. Explicit collisionMode check
      if (p.collisionMode === "walkable") {
        // Explicitly walkable, no collision
        continue;
      }

      if (p.collisionMode === "blocked") {
        // Entire placement bounding box blocks enemies/player
        obstacles.push({
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
        });
        continue;
      }

      if (p.collision) {
        // Explicit custom collision geometry on the object (e.g., trunk only)
        obstacles.push({
          x: p.x + p.collision.x,
          y: p.y + p.collision.y,
          width: p.collision.width,
          height: p.collision.height,
        });
        continue;
      }

      // Check layer group
      const layerInfo = layerMap.get(p.layerId);
      const isGroundLayer = layerInfo?.group === "ground";

      // If on a ground layer and no explicit collision, it's walkable terrain
      if (isGroundLayer) {
        continue;
      }

      // Default fallback for objects without explicit collision:
      // Trees: trunk bottom 40%
      // Buildings/walls/stone/obstacle: full bounding box
      const asset = assetMap?.get(p.assetId);
      const cat = (asset?.category || "").toLowerCase();
      if (cat === "tree") {
        const trunkH = Math.max(8, Math.round(p.height * 0.4));
        const trunkW = Math.max(8, Math.round(p.width * 0.35));
        const trunkX = p.x + Math.round((p.width - trunkW) / 2);
        const trunkY = p.y + (p.height - trunkH);
        obstacles.push({ x: trunkX, y: trunkY, width: trunkW, height: trunkH });
      } else if (
        cat === "buildings" ||
        cat === "stone" ||
        cat === "obstacle" ||
        cat === "wall" ||
        cat === "object"
      ) {
        obstacles.push({ x: p.x, y: p.y, width: p.width, height: p.height });
      }
    }
  }

  const enemySpawn = {
    x: map.enemySpawn?.x ?? defaultSpawn.x,
    y: map.enemySpawn?.y ?? defaultSpawn.y,
    home_x: map.enemySpawn?.home_x ?? map.enemySpawn?.x ?? defaultSpawn.home_x,
    home_y: map.enemySpawn?.home_y ?? map.enemySpawn?.y ?? defaultSpawn.home_y,
  };

  return {
    map,
    obstacles,
    enemySpawn,
    playerSpawn: { x: 3100, y: 3100 },
  };
}

/**
 * Checks if a circular or rectangular body collides with any world obstacle.
 */
export function checkObstacleCollision(
  targetX: number,
  targetY: number,
  radius: number,
  obstacles: WorldObstacle[]
): boolean {
  for (const obs of obstacles) {
    // Circle vs Axis-Aligned Bounding Box (AABB)
    const closestX = Math.max(obs.x, Math.min(targetX, obs.x + obs.width));
    const closestY = Math.max(obs.y, Math.min(targetY, obs.y + obs.height));
    const distanceX = targetX - closestX;
    const distanceY = targetY - closestY;
    if (distanceX * distanceX + distanceY * distanceY < radius * radius) {
      return true; // Collision detected
    }
  }
  return false;
}

/**
 * Renders the saved map tiles, objects, and visual layers onto a canvas context relative to the camera.
 * Supports filtering by layer type or depth for character occlusion:
 * - "ground": renders all ground layers (under player & enemies)
 * - "objects_behind": renders objects with feet/base below character Y
 * - "objects_front": renders objects with feet/base in front of character Y
 * - "all": renders all layers in natural order
 */
export function renderSavedMapToWorld(
  ctx: CanvasRenderingContext2D,
  map: SavedMapData,
  assetMap: Map<string, AssetRecord>,
  camera: { x: number; y: number },
  filter?: {
    scope?: "ground" | "objects" | "all";
    characterY?: number;
    depthPass?: "behind_character" | "front_of_character";
  }
) {
  if (!map.placements || !map.layers) return;

  const sortedLayers = [...map.layers].sort((a, b) => a.order - b.order);

  for (const layer of sortedLayers) {
    if (!layer.visible) continue;

    const isGround = layer.group === "ground" || (!layer.group && layer.id.includes("ground"));

    if (filter?.scope === "ground" && !isGround) continue;
    if (filter?.scope === "objects" && isGround) continue;

    const layerPlacements = map.placements.filter((p) => p.layerId === layer.id);
    for (const p of layerPlacements) {
      const asset = assetMap.get(p.assetId);
      if (!asset) continue;

      // Depth sorting check if depthPass is requested
      if (filter?.characterY !== undefined && filter?.depthPass && !isGround) {
        // Base/foot Y where object contacts the ground
        const footY = p.y + (p.occlusionDepth !== undefined ? p.occlusionDepth : p.height);
        if (filter.depthPass === "behind_character") {
          // Object base is behind (above) the character: render behind character
          if (footY > filter.characterY) continue;
        } else if (filter.depthPass === "front_of_character") {
          // Object base is in front (below) the character: render in front of character (covers character)
          if (footY <= filter.characterY) continue;
        }
      }

      const screenX = Math.round(p.x - camera.x);
      const screenY = Math.round(p.y - camera.y);

      const assetCanvas = getOrCreateAssetCanvas(asset);
      if (assetCanvas) {
        ctx.save();
        const layerOpacity = layer.opacity !== undefined ? layer.opacity : 1;
        const placementOpacity = p.opacity !== undefined ? p.opacity : 1;
        const combinedOpacity = Math.max(0, Math.min(1, layerOpacity * placementOpacity));
        if (combinedOpacity < 1) {
          ctx.globalAlpha = combinedOpacity;
        }
        ctx.drawImage(assetCanvas, screenX, screenY, p.width, p.height);
        ctx.restore();
      }
    }
  }
}

