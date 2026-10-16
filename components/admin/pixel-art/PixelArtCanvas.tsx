"use client";

import PixelArtGrid from "./PixelArtGrid";
import AlignmentGuides from "./AlignmentGuides";
import ReferencePixelCanvas from "./ReferencePixelCanvas";
import ReferenceImageLayer from "./ReferenceImageLayer";
import MagicWandSelectionOverlay from "./MagicWandSelectionOverlay";
import type { PixelArtCanvasProps } from "./PixelArtCanvasTypes";

export default function PixelArtCanvas(p: PixelArtCanvasProps) {
  const extent = p.size * p.zoom, verticalExtent = p.height * p.zoom;
  return <div className="relative shrink-0 overflow-hidden border border-slate-600" style={{ width: extent, height: verticalExtent, backgroundColor: "#252b35" }}>
    <ReferencePixelCanvas size={p.size} height={p.height} zoom={p.zoom} pixels={p.referencePixels} opacity={p.referenceOpacity}/>
    <ReferenceImageLayer {...p}/>
    <PixelArtGrid size={p.size} height={p.height} zoom={p.zoom} pixels={p.pixels} empty={p.empty}
      onPointerDown={p.onPointerDown} onPointerMove={p.onPointerMove} onPointerUp={p.onPointerUp}/>
    {p.selectionKind === "magic" && p.selection && <MagicWandSelectionOverlay size={p.size} height={p.height} zoom={p.zoom} pixelKeys={p.selectedPixelKeys}/>}
    {p.selection && p.selectionKind !== "magic" && <div aria-label="Active pixel selection" className="pointer-events-none absolute z-20 border border-dashed border-yellow-200 bg-yellow-200/10 shadow-[0_0_0_1px_#111827]"
      style={{ left: p.selection.x * p.zoom, top: p.selection.y * p.zoom, width: p.selection.width * p.zoom, height: p.selection.height * p.zoom }}/>}
    <AlignmentGuides part={p.part} enabled={p.guide}/>
  </div>;
}
