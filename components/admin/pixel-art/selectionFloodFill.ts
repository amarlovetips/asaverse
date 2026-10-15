type Pixels = Record<string, string>;

export function floodFillSelection(pixels: Pixels, x: number, y: number, size: number, color: string, bounds: { x: number; y: number; width: number; height: number }, mask?: string[]) {
  const start = `${x},${y}`, target = pixels[start];
  if (target?.toLowerCase() === color.toLowerCase()) return pixels;
  const allowed = mask ? new Set(mask) : null, queue = [start], visited = new Set(queue), result = { ...pixels };
  for (let head = 0; head < queue.length; head++) {
    const key = queue[head], [px, py] = key.split(",").map(Number);
    if (!sameColor(pixels[key], target)) continue;
    result[key] = color;
    for (const [nx, ny] of [[px - 1, py], [px + 1, py], [px, py - 1], [px, py + 1]]) {
      const next = `${nx},${ny}`;
      if (nx < bounds.x || ny < bounds.y || nx >= bounds.x + bounds.width || ny >= bounds.y + bounds.height || nx < 0 || ny < 0 || nx >= size || ny >= size || visited.has(next) || allowed && !allowed.has(next)) continue;
      if (sameColor(pixels[next], target)) { visited.add(next); queue.push(next); }
    }

    function sameColor(a: string | undefined, b: string | undefined) {
      return a === undefined || b === undefined ? a === b : a.toLowerCase() === b.toLowerCase();
    }
  }
  return result;
}
