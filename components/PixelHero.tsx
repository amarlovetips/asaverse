import type { CharacterLook } from "@/lib/game-types";

type Props = {
  look?: CharacterLook;
  size?: number;
  onAssetReady?: () => void;
  pixelData?: Record<string, string>;
  canvasWidth?: number;
  canvasHeight?: number;
  cropToPixels?: boolean;
};

export default function PixelHero({
  size = 160,
  onAssetReady,
  pixelData,
  canvasWidth = 64,
  canvasHeight = 64,
  cropToPixels = false,
}: Props) {
  if (pixelData && Object.keys(pixelData).length > 0) {
    const points = Object.entries(pixelData).flatMap(([point, color]) => {
      const [x, y] = point.split(",").map(Number);
      return Number.isInteger(x) && Number.isInteger(y) &&
        x >= 0 && y >= 0 && x < canvasWidth && y < canvasHeight &&
        /^#[0-9a-f]{6}$/i.test(color) ? [{ x, y }] : [];
    });

    const minX = points.length ? Math.min(...points.map(p => p.x)) : 0;
    const minY = points.length ? Math.min(...points.map(p => p.y)) : 0;
    const maxX = points.length ? Math.max(...points.map(p => p.x)) : canvasWidth - 1;
    const maxY = points.length ? Math.max(...points.map(p => p.y)) : canvasHeight - 1;
    const pad = cropToPixels ? 1 : 0;
    const viewX = cropToPixels ? Math.max(0, minX - pad) : 0;
    const viewY = cropToPixels ? Math.max(0, minY - pad) : 0;
    const viewW = cropToPixels ? Math.min(canvasWidth - viewX, maxX - viewX + 1 + pad) : canvasWidth;
    const viewH = cropToPixels ? Math.min(canvasHeight - viewY, maxY - viewY + 1 + pad) : canvasHeight;

    return (
      <svg
        viewBox={`${viewX} ${viewY} ${Math.max(1, viewW)} ${Math.max(1, viewH)}`}
        width={size}
        height={size}
        role="img"
        aria-label="AsaVerse pixel character design"
        shapeRendering="crispEdges"
        style={{ imageRendering: "pixelated", display: "block", flexShrink: 0 }}
        onLoad={onAssetReady}
      >
        {points.map(({ x, y }) => (
          <rect key={`${x},${y}`} x={x} y={y} width="1" height="1" fill={pixelData[`${x},${y}`]} />
        ))}
      </svg>
    );
  }

  return null;
}
