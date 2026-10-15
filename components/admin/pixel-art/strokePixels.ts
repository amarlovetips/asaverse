import { boundsBetween, linePixels, type PixelPoint } from "../pixel-art-utils";

type Pixels = Record<string, string>;

function lineStroke(start: PixelPoint, end: PixelPoint, size: number, color: string, width: number) {
  const result: Pixels = {};
  const offset = -Math.floor(width / 2);
  const shiftX = Math.abs(end.y - start.y) > Math.abs(end.x - start.x);
  for (let band = offset; band < offset + width; band++) {
    const dx = shiftX ? band : 0, dy = shiftX ? 0 : band;
    for (const key of linePixels(start.x + dx, start.y + dy, end.x + dx, end.y + dy)) {
      const [x, y] = key.split(",").map(Number);
      if (x >= 0 && y >= 0 && x < size && y < size) result[`${x},${y}`] = color;
    }
  }
  return result;
}

export function strokePixels(tool: string, start: PixelPoint, end: PixelPoint, size: number, fill: string | null, border: string, filled: boolean, width: number) {
  const stroke = Math.max(1, Math.min(5, Math.floor(width) || 1));
  if (tool === "line") return lineStroke(start, end, size, border, stroke);
  const bounds = boundsBetween(start, end), result: Pixels = {};
  const rx = Math.max(0.5, (bounds.width - 1) / 2), ry = Math.max(0.5, (bounds.height - 1) / 2);
  const cx = bounds.x + (bounds.width - 1) / 2, cy = bounds.y + (bounds.height - 1) / 2;
  for (let y = Math.max(0, bounds.y); y < Math.min(size, bounds.y + bounds.height); y++) {
    for (let x = Math.max(0, bounds.x); x < Math.min(size, bounds.x + bounds.width); x++) {
      const edge = tool === "rectangle" ? Math.min(x - bounds.x, y - bounds.y, bounds.x + bounds.width - 1 - x, bounds.y + bounds.height - 1 - y) < stroke : ellipseBorder(x, y, cx, cy, rx, ry, stroke);
      if (edge) result[`${x},${y}`] = border;
      else if (filled && fill !== null) result[`${x},${y}`] = fill;
    }
  }
  return result;
}

function ellipseBorder(x: number, y: number, cx: number, cy: number, rx: number, ry: number, width: number) {
  const inside = (x - cx) ** 2 / rx ** 2 + (y - cy) ** 2 / ry ** 2 <= 1.12;
  const ix = rx - width + 0.5, iy = ry - width + 0.5;
  const inner = ix > 0 && iy > 0 && (x - cx) ** 2 / ix ** 2 + (y - cy) ** 2 / iy ** 2 <= 1;
  return inside && !inner;
}
