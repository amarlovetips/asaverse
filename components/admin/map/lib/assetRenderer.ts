import type { AssetRecord } from "./supabaseAssets";

const dataUrlCache = new Map<string, string>();
const canvasCache = new Map<string, HTMLCanvasElement>();

/**
 * Creates an offscreen canvas containing the pixel-accurate rendered asset.
 */
export function getOrCreateAssetCanvas(asset: AssetRecord): HTMLCanvasElement | null {
  if (typeof window === "undefined") return null;

  const cacheKey = `${asset.id}_${asset.updated_at}_${asset.canvas_width}x${asset.canvas_height}`;
  if (canvasCache.has(cacheKey)) {
    return canvasCache.get(cacheKey)!;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, asset.canvas_width);
  canvas.height = Math.max(1, asset.canvas_height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const pixels = asset.pixel_data || {};
  for (const [coord, color] of Object.entries(pixels)) {
    if (!color) continue;
    const [x, y] = coord.split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  canvasCache.set(cacheKey, canvas);
  return canvas;
}

/**
 * Returns a data URL for the given asset (for rendering in <img> tags or preview thumbnails).
 */
export function getAssetDataUrl(asset: AssetRecord): string {
  const cacheKey = `${asset.id}_${asset.updated_at}_${asset.canvas_width}x${asset.canvas_height}`;
  if (dataUrlCache.has(cacheKey)) {
    return dataUrlCache.get(cacheKey)!;
  }

  const canvas = getOrCreateAssetCanvas(asset);
  if (!canvas) return "";

  const url = canvas.toDataURL("image/png");
  dataUrlCache.set(cacheKey, url);
  return url;
}

/**
 * Draws an asset onto a 2D rendering context at screen coordinates with sharp pixel scaling.
 */
export function drawAssetToContext(
  ctx: CanvasRenderingContext2D,
  asset: AssetRecord,
  screenX: number,
  screenY: number,
  zoom: number,
  opacity: number = 1,
  targetWidth?: number,
  targetHeight?: number
) {
  const canvas = getOrCreateAssetCanvas(asset);
  if (!canvas) return;

  const effWidth = targetWidth !== undefined ? targetWidth : asset.canvas_width;
  const effHeight = targetHeight !== undefined ? targetHeight : asset.canvas_height;

  // Exact integer pixel rounding for screen coordinates and dimensions
  // Math.round(screenX + w) - Math.round(screenX) ensures adjacent tiles at (x) and (x+w)
  // have right edge of first tile == left edge of next tile with ZERO gap or seam at any zoom level.
  const rScreenX = Math.round(screenX);
  const rScreenY = Math.round(screenY);
  const rScreenRight = Math.round(screenX + effWidth * zoom);
  const rScreenBottom = Math.round(screenY + effHeight * zoom);
  const w = Math.max(1, rScreenRight - rScreenX);
  const h = Math.max(1, rScreenBottom - rScreenY);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (opacity < 1) ctx.globalAlpha = opacity;
  ctx.drawImage(canvas, rScreenX, rScreenY, w, h);
  ctx.restore();
}

