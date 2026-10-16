export type PixelMap = Record<string, string>;

export type IdleAnimationFrameJson = {
  pixelData: PixelMap;
};

export type WalkingAnimationFrameJson = IdleAnimationFrameJson & {
  removedPixels?: string[];
};

export const WALK_DIRECTIONS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"] as const;
export type WalkDirection = typeof WALK_DIRECTIONS[number];
export type WalkingAnimationJson = {
  directions: WalkDirection[];
  frames: WalkingAnimationFrameJson[];
  basePose?: "idle-cycle";
  frameDurationMs?: number;
};
export const DEFAULT_WALK_FRAME_DURATION_MS = 420;

export function getWalkingFrameDurationMs(
  direction: WalkDirection | undefined,
  body?: WalkingAnimationJson | null,
  clothing?: WalkingAnimationJson | null
) {
  if (direction && body?.directions.includes(direction)) return body.frameDurationMs ?? DEFAULT_WALK_FRAME_DURATION_MS;
  if (direction && clothing?.directions.includes(direction)) return clothing.frameDurationMs ?? DEFAULT_WALK_FRAME_DURATION_MS;
  return DEFAULT_WALK_FRAME_DURATION_MS;
}

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

function normalizeFrames(value: unknown, size = 64): IdleAnimationFrameJson[] | null {
  if (!Array.isArray(value) || !value.length) return null;
  return value.map(frame => ({ pixelData: extractDesignPixels(isObject(frame) ? frame.pixelData : undefined, size) }));
}

function readSideAnimation(value: unknown, side: "front" | "back", sideNode: boolean) {
  if (!isObject(value)) return null;
  if (!sideNode) return isObject(value[CHARACTER_ANIMATION_KEY]) ? value[CHARACTER_ANIMATION_KEY] : null;
  const sides = value[CHARACTER_SIDES_KEY];
  if (!isObject(sides) || !isObject(sides[side])) return null;
  const sideData = sides[side];
  return isObject(sideData.animation) ? sideData.animation : null;
}

export function readEmbeddedIdleFrames(value: unknown, side: "front" | "back" = "front", sideNode = false, size = 64): IdleAnimationFrameJson[] | null {
  if (!isObject(value)) return null;
  const animation = readSideAnimation(value, side, sideNode);
  if (!animation || !isObject(animation.idle)) return null;
  return normalizeFrames(animation.idle.frames, size);
}

export function readEmbeddedWalkingAnimation(value: unknown, side: "front" | "back" = "front", sideNode = false, size = 64): WalkingAnimationJson | null {
  if (!isObject(value)) return null;
  const animation = readSideAnimation(value, side, sideNode);
  if (!isObject(animation) || !isObject(animation.walk)) return null;
  const walk = animation.walk;
  const rawFrames = Array.isArray(walk.frames) ? walk.frames : [];
  const directions = [...new Set((Array.isArray(walk.directions) ? walk.directions : []).filter((item): item is WalkDirection =>
    typeof item === "string" && (WALK_DIRECTIONS as readonly string[]).includes(item)
  ))];
  return {
    directions,
    ...(walk.basePose === "idle-cycle" ? { basePose: "idle-cycle" as const } : {}),
    ...(Number.isInteger(walk.frameDurationMs) && Number(walk.frameDurationMs) >= 16 && Number(walk.frameDurationMs) <= 5000
      ? { frameDurationMs: Number(walk.frameDurationMs) } : {}),
    frames: rawFrames.length
      ? rawFrames.map(frame => ({
        pixelData: extractDesignPixels(isObject(frame) ? frame.pixelData : undefined, size),
        ...(isObject(frame) && Array.isArray(frame.removedPixels)
          ? { removedPixels: frame.removedPixels.filter((key): key is string => typeof key === "string" && COORDINATE.test(key)) }
          : {}),
      }))
      : [{ pixelData: {} }],
  };
}

export function mergeWalkingAnimation(
  value: unknown, animation: WalkingAnimationJson, side: "front" | "back" = "front", sideNode = false
): Record<string, unknown> {
  const original = isObject(value) ? value : {};
  const sideRoot = isObject(original[CHARACTER_SIDES_KEY]) ? original[CHARACTER_SIDES_KEY] : {};
  const sideData = isObject(sideRoot[side]) ? sideRoot[side] : {};
  const current = sideNode
    ? isObject(sideData.animation) ? sideData.animation : {}
    : isObject(original[CHARACTER_ANIMATION_KEY]) ? original[CHARACTER_ANIMATION_KEY] : {};
  const previousWalk = isObject(current.walk) ? current.walk : {};
  const directions = [...new Set(animation.directions.filter(direction =>
    (WALK_DIRECTIONS as readonly string[]).includes(direction)
  ))];
  if (!directions.length || !animation.frames.length) throw new Error("Walking animation needs at least one frame and direction.");
  const walk = {
    ...current,
    walk: {
      ...previousWalk,
      version: 1, frameCount: animation.frames.length, directions, frames: animation.frames,
      ...(animation.basePose === "idle-cycle" ? { basePose: "idle-cycle" } : {}),
      ...(animation.frameDurationMs ? { frameDurationMs: animation.frameDurationMs } : {}),
    },
  };
  if (sideNode) return {
    ...original,
    [CHARACTER_SIDES_KEY]: {
      ...sideRoot,
      [side]: { ...sideData, animation: walk },
    },
  };
  return {
    ...original,
    [CHARACTER_ANIMATION_KEY]: {
      ...current,
      walk: walk.walk,
    },
  };
}

export function composeWalkingFrame(
  basePixels: PixelMap, frame: WalkingAnimationFrameJson, basePose?: "idle-cycle"
): PixelMap {
  if (basePose !== "idle-cycle") return { ...frame.pixelData };
  const result = { ...basePixels, ...frame.pixelData };
  for (const key of frame.removedPixels || []) delete result[key];
  return result;
}

export function createWalkingFrameOverlay(basePixels: PixelMap, pixels: PixelMap): WalkingAnimationFrameJson {
  const overrides = Object.fromEntries(Object.entries(pixels).filter(([key, color]) => basePixels[key] !== color));
  return {
    pixelData: overrides,
    removedPixels: Object.keys(basePixels).filter(key => !(key in pixels)),
  };
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalJson(value[key])]));
}

export function jsonDataEquals(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalJson(left)) === JSON.stringify(canonicalJson(right));
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
      idle: { version: 1, frameCount: frames.length, frames },
    },
  };
}
