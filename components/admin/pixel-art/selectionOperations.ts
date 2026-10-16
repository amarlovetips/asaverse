import type { SelectionBounds } from "./SelectionBounds";

export type SelectionBuffer = { width: number; height: number; pixels: Record<string, string> };
export type SelectionTransform = "horizontal" | "vertical" | "clockwise" | "counterclockwise";

export function selectionPixelKeys(pixels: Record<string, string>, bounds: SelectionBounds, mask?: string[]) {
  if (mask) return mask;
  return Object.keys(pixels).filter(key => {
    const [x, y] = key.split(",").map(Number);
    return x >= bounds.x && y >= bounds.y && x < bounds.x + bounds.width && y < bounds.y + bounds.height;
  });
}

export function copySelection(pixels: Record<string, string>, bounds: SelectionBounds, keys: string[]): SelectionBuffer {
  const copied: Record<string, string> = {};
  for (const key of keys) {
    const [x, y] = key.split(",").map(Number);
    copied[`${x - bounds.x},${y - bounds.y}`] = pixels[key] ?? "transparent";
  }
  return { width: bounds.width, height: bounds.height, pixels: copied };
}

export function pasteSelection(pixels: Record<string, string>, buffer: SelectionBuffer, x: number, y: number, width: number, height = width) {
  const next = { ...pixels }, keys: string[] = [];
  for (const [key, color] of Object.entries(buffer.pixels)) {
    const [dx, dy] = key.split(",").map(Number), px = x + dx, py = y + dy;
    if (px < 0 || py < 0 || px >= width || py >= height) continue;
    if (color === "transparent") delete next[`${px},${py}`];
    else next[`${px},${py}`] = color;
    keys.push(`${px},${py}`);
  }
  return { pixels: next, keys };
}
