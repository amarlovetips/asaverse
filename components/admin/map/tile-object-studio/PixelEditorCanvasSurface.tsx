"use client";

import type { usePixelArtEditorController } from "./usePixelArtEditorController";
import { useCanvasPan } from "./CanvasPan";
import { useEffect, useLayoutEffect, useRef } from "react";
import CoordinateRuler from "./CoordinateRuler";
import PixelArtCanvas from "./PixelArtCanvas";

type Props = { vm: ReturnType<typeof usePixelArtEditorController> };

export default function PixelEditorCanvasSurface({ vm }: Props) {
  const { s, image, panel } = vm;
  const viewport = useRef<HTMLDivElement>(null), pan = useCanvasPan(), anchor = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  useLayoutEffect(() => {
    const point = anchor.current, port = viewport.current, board = port?.querySelector<HTMLElement>("[data-artboard]");
    if (!point || !port || !board) return;
    const rect = board.getBoundingClientRect();
    port.scrollTo({ left: port.scrollLeft + rect.left + point.cx * s.zoom - point.x, top: port.scrollTop + rect.top + point.cy * s.zoom - point.y });
    anchor.current = null;
  }, [s.zoom]);
  useEffect(() => {
    const port = viewport.current;
    if (!port) return;
    function zoom(event: WheelEvent) {
      event.preventDefault(); event.stopPropagation();
      const next = Math.max(4, Math.min(32, s.zoom + (event.deltaY < 0 ? 2 : -2)));
      const board = viewport.current?.querySelector<HTMLElement>("[data-artboard]");
      if (board && next !== s.zoom) { const rect = board.getBoundingClientRect(); anchor.current = { x: event.clientX, y: event.clientY, cx: (event.clientX - rect.left) / s.zoom, cy: (event.clientY - rect.top) / s.zoom }; }
      s.setZoom(next);
    }
    port.addEventListener("wheel", zoom, { passive: false });
    return () => port.removeEventListener("wheel", zoom);
  }, [s]);
  return <div ref={viewport} onPointerDown={pan.start} onPointerMove={pan.move} onPointerUp={pan.stop}
    onPointerCancel={pan.stop} onLostPointerCapture={pan.stop} className="min-h-0 min-w-0 flex-1 overflow-auto bg-[radial-gradient(ellipse_at_center,#182331_0%,#090e15_70%)]">
    <div className="grid place-items-center" style={{ width: s.size * s.zoom + 72, height: s.height * s.zoom + 68, minWidth: "100%", minHeight: "100%" }}>
      <div className="relative shrink-0 pl-8 pt-7"><CoordinateRuler size={s.size} height={s.height} zoom={s.zoom}/>
        <PixelArtCanvas size={s.size} height={s.height} zoom={s.zoom} pixels={s.pixels} empty="#252b35" part={s.part} guide={s.guide} selection={s.selection} selectionKind={s.selectionKind} selectedPixelKeys={s.selectedPixelKeys}
          referencePixels={s.side === "back" ? s.referencePixels : {}} referenceOpacity={vm.frontOpacity} imageUrl={image.url} imageOpacity={image.opacity}
          imageVisible={image.visible} imageScale={image.scale} imageX={image.x} imageY={image.y} imageToolActive={panel === "image"}
          onImagePointerDown={image.down} onImagePointerMove={e => image.move(e, s.zoom)} onImagePointerUp={image.up}
          onPointerDown={s.start} onPointerMove={s.move} onPointerUp={s.stop}/>
      </div>
    </div>
  </div>;
}



