import type { AssetRecord } from "./supabaseAssets";

const dataUrlCache = new Map<string, string>();
const canvasCache = new Map<string, HTMLCanvasElement>();
const previewCanvasCache = new Map<string, HTMLCanvasElement>();

function getPixelDataSignature(pixels: Record<string, string>): string {
  return Object.entries(pixels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([coord, color]) => `${coord}:${color}`)
    .join("|");
}

export function getAssetCanvasDimensions(asset: AssetRecord): { width: number; height: number } {
  const width = Number(asset.canvas_width) || Number(asset.source_width) || 1;
  const height = Number(asset.canvas_height) || Number(asset.source_height) || 1;
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

function parseColorAlpha(color: string): number {
  const value = color.trim();
  if (!value || value.toLowerCase() === "transparent") return 0;

  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const expanded = hex.split("").map((part) => part + part).join("");
      const alphaHex = expanded.slice(6, 8);
      if (alphaHex) return Number.parseInt(alphaHex, 16) / 255;
      return 1;
    }
    if (hex.length === 8) {
      const alphaHex = hex.slice(6, 8);
      return Number.parseInt(alphaHex, 16) / 255;
    }
    if (hex.length === 6) return 1;
    return 0;
  }

  const rgbaMatch = value.match(/rgba?\(([^)]+)\)/i);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(",").map((part) => Number.parseFloat(part.trim()));
    if (parts.length >= 4) return Number.isFinite(parts[3]) ? Math.max(0, Math.min(1, parts[3])) : 1;
    return 1;
  }

  const hslaMatch = value.match(/hsla?\(([^)]+)\)/i);
  if (hslaMatch) {
    const parts = hslaMatch[1].split(",").map((part) => Number.parseFloat(part.trim()));
    if (parts.length >= 4) return Number.isFinite(parts[3]) ? Math.max(0, Math.min(1, parts[3])) : 1;
    return 1;
  }

  return 1;
}

function getAssetVisiblePixels(asset: AssetRecord): Record<string, string> {
  const frames = Array.isArray(asset.animation?.frames) ? asset.animation.frames : [];
  if (frames.length > 0) {
    const union: Record<string, string> = {};
    for (const frame of frames) {
      if (!frame || typeof frame !== "object") continue;
      Object.assign(union, frame);
    }
    return union;
  }

  return asset.pixel_data || {};
}

export function getMapGeneratorAssetMetrics(asset: AssetRecord): {
  width: number;
  height: number;
  minX: number;
  minY: number;
  hasPixels: boolean;
} {
  const base = getAssetCanvasDimensions(asset);
  const pixels = getAssetVisiblePixels(asset);

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let visibleCount = 0;

  for (const [coord, color] of Object.entries(pixels)) {
    const alpha = parseColorAlpha(color ?? "");
    if (alpha <= 0) continue;
    const [x, y] = coord.split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    visibleCount += 1;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  if (!visibleCount || !Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { width: base.width, height: base.height, minX: 0, minY: 0, hasPixels: false };
  }

  return {
    width: Math.max(1, maxX - minX + 1),
    height: Math.max(1, maxY - minY + 1),
    minX,
    minY,
    hasPixels: true,
  };
}

export function clearAssetRenderCaches(): void {
  dataUrlCache.clear();
  canvasCache.clear();
  previewCanvasCache.clear();
}

/**
 * Computes tight bounding box of non-transparent artwork pixels, excluding empty outer margins.
 * This is used only as a display/footprint helper; it does not replace the authoritative canvas size.
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

  const { width, height } = getAssetCanvasDimensions(asset);
  const pixelSignature = getPixelDataSignature(asset.pixel_data || {});
  const cacheKey = `${asset.id}_${asset.updated_at}_${width}x${height}_${pixelSignature}`;
  if (canvasCache.has(cacheKey)) {
    return canvasCache.get(cacheKey)!;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const pixels = asset.pixel_data || {};
  for (const [coord, color] of Object.entries(pixels)) {
    if (!color) continue;
    const [x, y] = coord.split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const safeX = Math.max(0, Math.min(canvas.width - 1, x));
    const safeY = Math.max(0, Math.min(canvas.height - 1, y));
    if (safeX >= 0 && safeX < canvas.width && safeY >= 0 && safeY < canvas.height) {
      ctx.fillStyle = color;
      ctx.fillRect(safeX, safeY, 1, 1);
    }
  }

  canvasCache.set(cacheKey, canvas);
  return canvas;
}

/**
 * Returns a data URL for the given asset (for rendering in <img> tags or preview thumbnails),
 * automatically cropped to the occupied non-transparent pixel artwork.
 */
export function getMapGeneratorAssetCanvas(asset: AssetRecord): HTMLCanvasElement | null {
  if (typeof window === "undefined") return null;

  const bounds = getMapGeneratorAssetMetrics(asset);
  const { width, height } = getAssetCanvasDimensions(asset);
  const pixels = getAssetVisiblePixels(asset);
  const pixelSignature = getPixelDataSignature(pixels);
  const cacheKey = `${asset.id}_${asset.updated_at}_mapgen_${bounds.width}x${bounds.height}_origin_${bounds.minX}_${bounds.minY}_${width}x${height}_${pixelSignature}`;
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

  for (const [coord, color] of Object.entries(pixels)) {
    const alpha = parseColorAlpha(color ?? "");
    if (alpha <= 0) continue;
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

export function getAssetDataUrl(asset: AssetRecord): string {
  const { width, height } = getAssetCanvasDimensions(asset);
  const pixelSignature = getPixelDataSignature(asset.pixel_data || {});
  const cacheKey = `${asset.id}_${asset.updated_at}_${width}x${height}_${pixelSignature}`;
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
  const pixelSignature = getPixelDataSignature(asset.pixel_data || {});
  const cacheKey = `${asset.id}_${asset.updated_at}_${width}x${height}_${previewScale}_${pixelSignature}`;
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

export function drawMapGeneratorAssetToContext(
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
  const metrics = getMapGeneratorAssetMetrics(asset);
  const cropCanvas = getMapGeneratorAssetCanvas(asset);
  if (!cropCanvas) return;

  const effWidth = targetWidth ?? metrics.width;
  const effHeight = targetHeight ?? metrics.height;
  const rScreenX = Math.round(screenX);
  const rScreenY = Math.round(screenY);
  const w = Math.max(1, Math.round(effWidth * zoom));
  const h = Math.max(1, Math.round(effHeight * zoom));

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

  ctx.drawImage(cropCanvas, rScreenX, rScreenY, w, h);
  ctx.restore();
}

