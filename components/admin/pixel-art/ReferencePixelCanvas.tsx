"use client";

import { useEffect, useRef } from "react";

export default function ReferencePixelCanvas({
  size, zoom, pixels = {}, opacity,
}: { size: number; zoom: number; pixels?: Record<string, string>; opacity: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const extent = size * zoom;
    canvas.width = extent;
    canvas.height = extent;
    ctx.clearRect(0, 0, extent, extent);
    ctx.globalAlpha = opacity;
    ctx.imageSmoothingEnabled = false;
    for (const [key, color] of Object.entries(pixels)) {
      const [x, y] = key.split(",").map(Number);
      if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < size && y < size) {
        ctx.fillStyle = color;
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }
    ctx.globalAlpha = 1;
  }, [size, zoom, pixels, opacity]);

  if (!Object.keys(pixels).length) return null;
  const extent = size * zoom;
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0" style={{ width: extent, height: extent }} />;
}
