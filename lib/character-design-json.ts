export type PixelMap = Record<string, string>;

export type IdleAnimationFrameJson = {
  pixelData: PixelMap;
};

export type PixelTextLayer = {
  id: string;
  text: string;
  x: number;
  y: number;
  scale: number;
  color: string;
};

export const CHARACTER_ANIMATION_KEY = "__animation";
export const CHARACTER_SIDES_KEY = "__sides";

const COORDINATE = /^\d+,\d+$/;
const COLOR = /^#[0-9a-f]{6}$/i;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function extractDesignPixels(value: unknown, size = 64): PixelMap {
  if (!isObject(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, color]) => {
    const [x, y] = key.split(",").map(Number);
    return COORDINATE.test(key) && x < size && y < size && typeof color === "string" && COLOR.test(color);
  })) as PixelMap;
}

export function readDesignSidePixels(value: unknown, side: "front" | "back", size = 64): PixelMap {
  if (!isObject(value)) return {};
  const sides = value[CHARACTER_SIDES_KEY];
  if (isObject(sides) && isObject(sides[side])) {
    const sideData = sides[side];
    return extractDesignPixels(isObject(sideData) && isObject(sideData.pixels) ? sideData.pixels : sideData, size);
  }
  // Older designs store the front pixels directly at the JSON root.
  return side === "front" ? extractDesignPixels(value, size) : {};
}

export function readDesignTextLayers(value: unknown, side: "front" | "back"): PixelTextLayer[] {
  if (!isObject(value)) return [];
  const sides = value[CHARACTER_SIDES_KEY];
  const sideData = isObject(sides) ? sides[side] : null;
  if (!isObject(sideData) || !Array.isArray(sideData.textLayers)) return [];
  return sideData.textLayers.filter((layer): layer is PixelTextLayer =>
    isObject(layer) && typeof layer.id === "string" && typeof layer.text === "string" &&
    typeof layer.x === "number" && typeof layer.y === "number" &&
    typeof layer.scale === "number" && typeof layer.color === "string"
  );
}

function normalizeFrames(value: unknown): IdleAnimationFrameJson[] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  return value.map(frame => ({ pixelData: extractDesignPixels(isObject(frame) ? frame.pixelData : undefined) }));
}

export function readEmbeddedIdleFrames(value: unknown): IdleAnimationFrameJson[] | null {
  if (!isObject(value)) return null;
  const animation = value[CHARACTER_ANIMATION_KEY];
  if (!isObject(animation) || !isObject(animation.idle)) return null;
  return normalizeFrames(animation.idle.frames);
}

function preserveDesignMetadata(value: unknown, pixels: PixelMap): Record<string, unknown> {
  const original = isObject(value) ? value : {};
  const metadata = Object.fromEntries(Object.entries(original).filter(([key]) => !COORDINATE.test(key)));
  return { ...metadata, ...pixels };
}

export function mergeDesignPixels(value: unknown, pixels: PixelMap): Record<string, unknown> {
  return preserveDesignMetadata(value, pixels);
}

export function mergeDesignSidePixels(
  value: unknown, side: "front" | "back", pixels: PixelMap, size = 64,
  textLayers: PixelTextLayer[] = [], renderedPixels: PixelMap = pixels
): Record<string, unknown> {
  const original = isObject(value) ? value : {};
  const sidesValue = isObject(original[CHARACTER_SIDES_KEY]) ? original[CHARACTER_SIDES_KEY] : {};
  const oldSide = isObject(sidesValue[side]) ? sidesValue[side] : {};
  const sides: Record<string, unknown> = {
    ...sidesValue,
    [side]: { ...oldSide, pixels, textLayers },
  };
  const result = side === "front"
    ? preserveDesignMetadata(original, renderedPixels)
    : { ...original };
  // Normalize existing side maps so malformed or out-of-bounds keys are not carried forward.
  if (!isObject(sides.front)) sides.front = { pixels: extractDesignPixels(original, size), textLayers: [] };
  if (!isObject(sides.back)) sides.back = { pixels: {}, textLayers: [] };
  return { ...result, [CHARACTER_SIDES_KEY]: sides };
}

export function mergeIdleFrames(value: unknown, pixels: PixelMap, frames: IdleAnimationFrameJson[]): Record<string, unknown> {
  const result = preserveDesignMetadata(value, pixels);
  const current = isObject(result[CHARACTER_ANIMATION_KEY]) ? result[CHARACTER_ANIMATION_KEY] : {};
  return {
    ...result,
    [CHARACTER_ANIMATION_KEY]: {
      ...current,
      idle: { version: 1, frameCount: 3, frames },
    },
  };
}
