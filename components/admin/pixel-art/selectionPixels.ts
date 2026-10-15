type Pixels = Record<string, string>;

function isTransparent(color: string) {
  if (color.trim().toLowerCase() === "transparent") return true;
  const hex = color.match(/^#([0-9a-f]{6})([0-9a-f]{2})$/i);
  if (hex) return hex[2].toLowerCase() === "00";
  const rgba = color.match(/^rgba?\((.*)\)$/i);
  if (!rgba) return false;
  const channels = rgba[1].split(/[,\s/]+/).filter(Boolean);
  return channels.length === 4 && Number(channels[3]) === 0;
}

export function recolorSelectionPixels(pixels: Pixels, keys: string[], color: string) {
  let next: Pixels | null = null;
  for (const key of keys) {
    const current = pixels[key];
    if (!current || isTransparent(current) || current.toLowerCase() === color.toLowerCase()) continue;
    if (!next) next = { ...pixels };
    next[key] = color;
  }
  return next ?? pixels;
}
