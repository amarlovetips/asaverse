import { sameRgbaColor } from "./pixelColor";
type Pixels = Record<string, string>;

export function recolorSelectionPixels(pixels: Pixels, keys: string[], color: string) {
  let next: Pixels | null = null;
  for (const key of keys) {
    const current = pixels[key];
    if (sameRgbaColor(current, color)) continue;
    if (!next) next = { ...pixels };
    next[key] = color;
  }
  return next ?? pixels;
}
