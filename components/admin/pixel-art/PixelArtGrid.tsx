"use client";

import { memo, useEffect, useRef } from "react";

type Props = {
  size: number;
  zoom: number;
  pixels: Record<string, string>;
  empty: string;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
};

function PixelArtGrid(p: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { size, zoom, pixels } = p;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const extent = size * zoom;
    canvas.width = extent;
    canvas.height = extent;
    ctx.clearRect(0, 0, extent, extent);
    ctx.imageSmoothingEnabled = false;

    for (const [key, color] of Object.entries(pixels)) {
      const [x, y] = key.split(",").map(Number);
      if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < size && y < size) {
        ctx.fillStyle = color;
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.09)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= size; i++) {
      const pos = i * zoom + 0.25;
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, extent);
      ctx.moveTo(0, pos);
      ctx.lineTo(extent, pos);
    }
    ctx.stroke();
  }, [size, zoom, pixels]);

  const extent = size * zoom;

  return (
    <div
      data-artboard
      onPointerDown={p.onPointerDown}
      onPointerMove={p.onPointerMove}
      onPointerUp={p.onPointerUp}
      onPointerCancel={p.onPointerUp}
      onLostPointerCapture={p.onPointerUp}
      className="absolute inset-0 z-10 touch-none border border-slate-500"
      style={{ width: extent, height: extent }}
    >
      <canvas
        ref={ref}
        aria-label="Pixel art drawing canvas"
        className="pointer-events-none block"
        style={{ width: extent, height: extent }}
      />
    </div>
  );
}

export default memo(PixelArtGrid);
