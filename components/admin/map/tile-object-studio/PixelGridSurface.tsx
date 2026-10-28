"use client";
import { useEffect, useRef } from "react";
import { drawPixelGrid } from "./drawPixelGrid";
type Props = { width: number; height: number; zoom: number; pixels: Record<string, string>; onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void; onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void; onPointerUp: () => void };
export default function PixelGridSurface(p: Props) {
  const ref = useRef<HTMLCanvasElement>(null), extentX = p.width * p.zoom, extentY = p.height * p.zoom;
  useEffect(() => { const canvas = ref.current, ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    canvas.width = extentX; canvas.height = extentY; drawPixelGrid(ctx, p.width, p.height, p.zoom, p.pixels);
  }, [p.width, p.height, p.zoom, p.pixels, extentX, extentY]);
  return <div data-artboard onPointerDown={p.onPointerDown} onPointerMove={p.onPointerMove} onPointerUp={p.onPointerUp} onPointerCancel={p.onPointerUp} onLostPointerCapture={p.onPointerUp} className="absolute inset-0 z-10 touch-none border border-slate-500" style={{ width: extentX, height: extentY }}>
    <canvas ref={ref} aria-label="Pixel art drawing canvas" className="pointer-events-none block" style={{ width: extentX, height: extentY }}/>
  </div>;
}



