import { floodFillPixels, textPixels } from "../pixel-art-utils";
import { readDesignSidePixels } from "../../../lib/character-design-json";
type Pixels = Record<string, string>;
export function fillArtboard(p: Pixels, x: number, y: number, width: number, height: number, color: string | null, bounds?: { x: number; y: number; width: number; height: number }) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= width || y >= height || bounds && (x < bounds.x || y < bounds.y || x >= bounds.x + bounds.width || y >= bounds.y + bounds.height)) return p;
  if (width === height) return floodFillPixels(p, x, y, width, color, bounds);
  const copy = { ...p }, target = p[`${x},${y}`], queue = [[x, y]], seen = new Set([`${x},${y}`]);
  for (let i = 0; i < queue.length; i++) { const [px, py] = queue[i], key = `${px},${py}`; if (!sameColor(p[key], target)) continue;
    if (color === null) delete copy[key]; else copy[key] = color;
    for (const [nx, ny] of [[px - 1, py], [px + 1, py], [px, py - 1], [px, py + 1]]) { const next = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || bounds && (nx < bounds.x || ny < bounds.y || nx >= bounds.x + bounds.width || ny >= bounds.y + bounds.height) || seen.has(next) || !sameColor(p[next], target)) continue;
      seen.add(next); queue.push([nx, ny]);
    }
  }
  return copy;
}
function sameColor(a?: string, b?: string) { return a === b || a !== undefined && b !== undefined && a.toLowerCase() === b.toLowerCase(); }
export function readArtboardSide(value: unknown, side: "front" | "back", width: number, height: number) {
  return Object.fromEntries(Object.entries(readDesignSidePixels(value, side, Math.max(width, height))).filter(([key]) => {
    const [x, y] = key.split(",").map(Number); return x < width && y < height;
  }));
}
export function artboardTextPixels(text: string, x: number, y: number, color: string, width: number, height: number, scale = 1) {
  return Object.fromEntries(Object.entries(textPixels(text, x, y, color, Math.max(width, height), scale)).filter(([key]) => {
    const [px, py] = key.split(",").map(Number); return px < width && py < height;
  }));
}
