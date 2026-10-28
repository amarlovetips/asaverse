"use client";
import { memo } from "react";
import PixelGridSurface from "./PixelGridSurface";
type Props = { size: number; height?: number; zoom: number; pixels: Record<string, string>; empty: string; onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void; onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void; onPointerUp: () => void };
function PixelArtGrid(p: Props) {
  return <PixelGridSurface width={p.size} height={p.height ?? p.size} zoom={p.zoom} pixels={p.pixels}
    onPointerDown={p.onPointerDown} onPointerMove={p.onPointerMove} onPointerUp={p.onPointerUp}/>;
}
export default memo(PixelArtGrid);



