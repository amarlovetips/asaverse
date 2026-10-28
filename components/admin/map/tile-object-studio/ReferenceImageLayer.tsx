"use client";

import Image from "next/image";
import type { ReferenceImageProps } from "./PixelArtCanvasTypes";

export default function ReferenceImageLayer(p: ReferenceImageProps) {
  const extent = p.size * p.zoom, verticalExtent = p.height * p.zoom;
  if (!p.imageUrl || !p.imageVisible) return null;
  return <Image src={p.imageUrl} width={extent} height={verticalExtent} unoptimized alt="Image layer" draggable={false}
    onPointerDown={p.onImagePointerDown} onPointerMove={p.onImagePointerMove} onPointerUp={p.onImagePointerUp}
    onPointerCancel={p.onImagePointerUp} className={`absolute inset-0 h-full w-full select-none ${p.imageToolActive ? "z-20 cursor-grab active:cursor-grabbing touch-none" : "pointer-events-none"}`}
    style={{ opacity: p.imageOpacity, objectFit: "contain", transform: `translate(${p.imageX * p.zoom}px, ${p.imageY * p.zoom}px) scale(${p.imageScale})`, transformOrigin: "center center" }}/>;
}



