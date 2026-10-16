import { sameRgbaColor } from "./pixelColor";

export function magicWandPixelKeys(pixels: Record<string, string>, width: number, height: number, x: number, y: number) {
  const target = pixels[`${x},${y}`], keys: string[] = [];
  for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
    const key = `${px},${py}`;
    if (sameRgbaColor(pixels[key], target)) keys.push(key);
  }
  return keys;
}
