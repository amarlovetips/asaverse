"use client";

import { useRef, useState } from "react";
import { readReferencePixels } from "./readReferencePixels";

export function useReferenceImage(size: number, height: number, onExtract: (pixels: Record<string, string>) => void, onControls: () => void) {
  const [url, setUrl] = useState<string | null>(null), [name, setName] = useState("");
  const [opacity, setOpacity] = useState(0.45), [visible, setVisible] = useState(true);
  const [scale, setScale] = useState(1), [x, setX] = useState(0), [y, setY] = useState(0);
  const drag = useRef<{ x: number; y: number } | null>(null);
  function add(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) { alert("Image must be 10 MB or smaller."); return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") { setUrl(reader.result); setName(file.name); setVisible(true); setScale(1); setX(0); setY(0); onControls(); } };
    reader.onerror = () => alert("Could not read the selected image.");
    reader.readAsDataURL(file);
  }
  async function extract() {
    if (!url) { onControls(); return; }
    try { onExtract(await readReferencePixels(url, size, height)); }
    catch (error) { alert(error instanceof Error ? error.message : "Could not read the reference image."); }
  }
  function down(event: React.PointerEvent<HTMLImageElement>) { event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY }; }
  function move(event: React.PointerEvent<HTMLImageElement>, zoom: number) { if (!drag.current) return; const dx = event.clientX - drag.current.x, dy = event.clientY - drag.current.y; drag.current = { x: event.clientX, y: event.clientY }; setX(v => v + dx / zoom); setY(v => v + dy / zoom); }
  return { url, name, opacity, setOpacity, visible, setVisible, scale, setScale, x, setX, y, setY, drag, add, extract, down, move, up: () => { drag.current = null; }, remove: () => { setUrl(null); setName(""); drag.current = null; } };
}



