"use client";

import { useEffect, useRef } from "react";

export default function ReferencePixelCanvas({
  size, height = size, zoom, pixels = {}, opacity,
}: { size: number; height?: number; zoom: number; pixels?: Record<string, string>; opacity: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const extent = size * zoom, verticalExtent = height * zoom;
    canvas.width = extent;
    canvas.height = verticalExtent;
    ctx.clearRect(0, 0, extent, verticalExtent);
    ctx.globalAlpha = opacity;
    ctx.imageSmoothingEnabled = false;
    for (const [key, color] of Object.entries(pixels)) {
      const [x, y] = key.split(",").map(Number);
      if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < size && y < height) {
        ctx.fillStyle = color;
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }
    ctx.globalAlpha = 1;
  }, [size, height, zoom, pixels, opacity]);

  if (!Object.keys(pixels).length) return null;
  const extent = size * zoom, verticalExtent = height * zoom;
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0" style={{ width: extent, height: verticalExtent }} />;
}
