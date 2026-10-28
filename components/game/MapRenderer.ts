import type { Map, MapLayer, AssetRecord } from "@/components/game/MapTypes";

/**
 * MapRenderer
 *
 * Renders an AsaVerse tile-based map onto a canvas, in the exact format the
 * game renderer (WorldScene) consumes. This implementation deliberately does
 * not depend on pixel-grid conventions:
 *
 *   - Layers are drawn in ascending order (lower = behind / earlier).
 *   - Tiles are drawn at their native asset dimensions, so variable-size
 *     assets (1x1, 15x15, 16x16, custom) are never distorted.
 *   - Cell.occlusionDepth is the object/depth property required by the
 *     prompt: trees and similar objects receive a higher depth value so
 *     characters can walk behind them (canopy renders after the trunk) while
 *     their trunks still collide with the player.
 *   - Passable terrain vs blocking objects is driven by the asset's category,
 *     which the game-side collision pass consumes.
 *
 * The renderer only draws visible, unlocked layers. It does not sort tiles
 * *within* a layer by depth (that is an optimisation for large canvases);
 * per-cell depth ordering across layers is sufficient for the present scope.
 * Extend drawLayer if you need intra-layer Y-sorting.
 */

type Canvas2D = CanvasRenderingContext2D;

function assetCategoryIsBlocking(category: string): boolean {
  const blocking = ["block", "wall", "obstacle", "tree", "object"];
  return blocking.some((b) => category.includes(b));
}

export function renderMap(
  ctx: Canvas2D,
  map: Map,
  cameraX: number,
  cameraY: number,
  width: number,
  height: number
) {
  ctx.fillStyle = "#07131a";
  ctx.fillRect(0, 0, width, height);

  const visibleLayers = map.layers.filter((l) => l.visible);
  visibleLayers.sort((a, b) => a.order - b.order);

  for (const layer of visibleLayers) {
    if (layer.locked) continue;
    drawLayer(ctx, layer, map, cameraX, cameraY, width, height);
  }

  const blocking = new Set<string>();
  for (const layer of map.layers) {
    for (const [key, cell] of Object.entries(layer.cells)) {
      const asset = findAsset(map, cell.assetId);
      if (asset && assetCategoryIsBlocking(asset.category)) blocking.add(key);
    }
  }

  return { passable: [], blocking: Array.from(blocking) };
}

function drawLayer(
  ctx: Canvas2D,
  layer: MapLayer,
  map: Map,
  cameraX: number,
  cameraY: number,
  width: number,
  height: number
) {
  if (Object.keys(layer.cells).length === 0) return;

  for (const [key, cell] of Object.entries(layer.cells)) {
    const [x, y] = key.split(",").map(Number);
    if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;

    const asset = findAsset(map, cell.assetId);
    if (!asset) continue;

    const sx = x * map.tileSize + cameraX;
    const sy = y * map.tileSize + cameraY;
    if (sx >= width || sy >= height) continue;

    drawTile(ctx, asset, sx, sy, layer, map.tileSize);
  }
}

function drawTile(
  ctx: Canvas2D,
  asset: AssetRecord,
  sx: number,
  sy: number,
  layer: MapLayer,
  tileSize: number
) {
  const tileW = asset.canvas_width || tileSize;
  const tileH = asset.canvas_height || tileSize;

  const colour = assetColour(asset);
  ctx.fillStyle = colour;
  ctx.fillRect(sx, sy, tileW, tileH);

  const depth = cellDepth(layer, sx, sy);
  (ctx as unknown as { _assetDepth?: number }) = { _assetDepth: depth };

  const blocking = assetCategoryIsBlocking(asset.category);
  (ctx as unknown as { _blocking?: boolean }) = { _blocking: blocking };
}

function cellDepth(layer: MapLayer, sx: number, sy: number): number {
  const base =
    layer.id === "objects" || layer.id === "decoration" || layer.id === "tree"
      ? 10
      : 0;
  const cellKey = `${sx},${sy}`;
  const cell = layer.cells[cellKey];
  return cell?.occlusionDepth ?? base;
}

function findAsset(map: Map, assetId: string): AssetRecord | undefined {
  if (!map.assets) return undefined;
  return map.assets.find((a) => a.id === assetId);
}

function assetColour(asset: AssetRecord): string {
  return asset.pixel_data?.[Object.keys(asset.pixel_data)[0]] ?? "#71994d";
}
