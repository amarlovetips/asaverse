import type { SelectionBounds } from "./SelectionBounds";
import type { SelectionTransform } from "./selectionOperations";

export function transformSelection(pixels: Record<string, string>, bounds: SelectionBounds, keys: string[], width: number, transform: SelectionTransform, height = width) {
  const next = { ...pixels }, points: string[] = [];
  for (const key of keys) delete next[key];
  const rotate = transform === "clockwise" || transform === "counterclockwise";
  const resultBounds = rotate ? { ...bounds, width: bounds.height, height: bounds.width } : bounds;
  for (const key of keys) {
    const [x, y] = key.split(",").map(Number), dx = x - bounds.x, dy = y - bounds.y;
    const px = transform === "horizontal" ? bounds.width - 1 - dx : transform === "vertical" ? dx : transform === "clockwise" ? bounds.height - 1 - dy : dy;
    const py = transform === "horizontal" ? dy : transform === "vertical" ? bounds.height - 1 - dy : transform === "clockwise" ? dx : bounds.width - 1 - dx;
    const nx = bounds.x + px, ny = bounds.y + py;
    if (nx >= 0 && ny >= 0 && nx < width && ny < height) { if (pixels[key] !== undefined) next[`${nx},${ny}`] = pixels[key]; points.push(`${nx},${ny}`); }
  }
  return { pixels: next, bounds: resultBounds, keys: points };
}



