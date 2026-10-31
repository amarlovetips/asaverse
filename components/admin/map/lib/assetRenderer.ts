import type { AssetRecord } from "./supabaseAssets";

const dataUrlCache = new Map<string, string>();
const canvasCache = new Map<string, HTMLCanvasElement>();
const previewCanvasCache = new Map<string, HTMLCanvasElement>();

export function clearAssetRenderCaches(): void {
  dataUrlCache.clear();
  canvasCache.clear();
  previewCanvasCache.clear();
}

/**
 * Computes tight bounding box of non-transparent artwork pixels, excluding empty outer margins.
 */
export function getOccupiedAssetBounds(asset: AssetRecord): {
  minX: number;
  minY: number;
  width: number;
  height: number;
  hasPixels: boolean;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const pixels = asset.pixel_data || {};
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
      minX: 0,
      minY: 0,
      width: Math.max(1, asset.canvas_width),
      height: Math.max(1, asset.canvas_height),
      hasPixels: false,
    };
  }

  return {
    minX,
    minY,
    width: Math.max(1, maxX - minX + 1),
    height: Math.max(1, maxY - minY + 1),
    hasPixels: true,
  };
}

/**
 * Creates an offscreen canvas containing the pixel-accurate rendered asset,
 * trimmed of all fully transparent outer margins while preserving all pixels.
 */
export function getOrCreateAssetCanvas(asset: AssetRecord): HTMLCanvasElement | null {
  if (typeof window === "undefined") return null;

  const bounds = getOccupiedAssetBounds(asset);
  const cacheKey = `${asset.id}_${asset.updated_at}_${bounds.width}x${bounds.height}_offset_${bounds.minX}_${bounds.minY}`;
  if (canvasCache.has(cacheKey)) {
    return canvasCache.get(cacheKey)!;
  }

  const canvas = document.createElement("canvas");
  canvas.width = bounds.width;
  canvas.height = bounds.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const pixels = asset.pixel_data || {};
  for (const [coord, color] of Object.entries(pixels)) {
    if (!color) continue;
    const [x, y] = coord.split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const rx = x - bounds.minX;
    const ry = y - bounds.minY;
    if (rx >= 0 && rx < canvas.width && ry >= 0 && ry < canvas.height) {
      ctx.fillStyle = color;
      ctx.fillRect(rx, ry, 1, 1);
    }
  }

  canvasCache.set(cacheKey, canvas);
  return canvas;
}

/**
 * Returns a data URL for the given asset (for rendering in <img> tags or preview thumbnails),
 * automatically cropped to the occupied non-transparent pixel artwork.
 */
export function getAssetDataUrl(asset: AssetRecord): string {
  const bounds = getOccupiedAssetBounds(asset);
  const cacheKey = `${asset.id}_${asset.updated_at}_${bounds.width}x${bounds.height}_offset_${bounds.minX}_${bounds.minY}`;
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
export function getOrCreatePreviewCanvas(asset: AssetRecord, zoom: number): HTMLCanvasElement | null {
  if (typeof window === "undefined") return null;
  const baseCanvas = getOrCreateAssetCanvas(asset);
  if (!baseCanvas) return null;

  const previewScale = zoom < 0.8 ? 0.5 : zoom < 1.25 ? 0.75 : 1;
  const width = Math.max(1, Math.round(baseCanvas.width * previewScale));
  const height = Math.max(1, Math.round(baseCanvas.height * previewScale));
  const cacheKey = `${asset.id}_${asset.updated_at}_${width}x${height}_${previewScale}`;
  if (previewCanvasCache.has(cacheKey)) return previewCanvasCache.get(cacheKey)!;

  const preview = document.createElement("canvas");
  preview.width = width;
  preview.height = height;
  const previewCtx = preview.getContext("2d");
  if (!previewCtx) return baseCanvas;
  previewCtx.imageSmoothingEnabled = false;
  previewCtx.clearRect(0, 0, width, height);
  previewCtx.drawImage(baseCanvas, 0, 0, width, height);

  previewCanvasCache.set(cacheKey, preview);
  return preview;
}

export function drawAssetToContext(
  ctx: CanvasRenderingContext2D,
  asset: AssetRecord,
  screenX: number,
  screenY: number,
  zoom: number,
  opacity: number = 1,
  targetWidth?: number,
  targetHeight?: number,
  rotationDegrees: number = 0
) {
  const canvas = getOrCreateAssetCanvas(asset);
  if (!canvas) return;

  const effWidth = targetWidth !== undefined ? targetWidth : asset.canvas_width;
  const effHeight = targetHeight !== undefined ? targetHeight : asset.canvas_height;
  const previewCanvas = zoom < 1.25 ? getOrCreatePreviewCanvas(asset, zoom) ?? canvas : canvas;

  const rScreenX = Math.round(screenX);
  const rScreenY = Math.round(screenY);
  const rScreenRight = Math.round(screenX + effWidth * zoom);
  const rScreenBottom = Math.round(screenY + effHeight * zoom);
  const w = Math.max(1, rScreenRight - rScreenX);
  const h = Math.max(1, rScreenBottom - rScreenY);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (opacity < 1) ctx.globalAlpha = opacity;

  if (rotationDegrees !== 0) {
    const radians = (rotationDegrees * Math.PI) / 180;
    const centerX = rScreenX + w / 2;
    const centerY = rScreenY + h / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(radians);
    ctx.translate(-centerX, -centerY);
  }

  ctx.drawImage(previewCanvas, rScreenX, rScreenY, w, h);
  ctx.restore();
}

