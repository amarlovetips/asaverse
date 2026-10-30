"use client";
import { useState } from "react";
import { ARTBOARD_PRESETS, MAX_ARTBOARD_DIMENSION, validArtboardDimensions } from "./artboardDimensions";
type Props = { width: number; height: number; onPreset: (size: number) => boolean; onCustom: (width: number, height: number) => boolean };
export default function ArtboardSizeSelector(p: Props) {
  const [editing, setEditing] = useState(false), [width, setWidth] = useState(p.width), [height, setHeight] = useState(p.height), [error, setError] = useState("");
  const custom = editing || !ARTBOARD_PRESETS.includes(p.width as 16 | 32 | 64) || p.width !== p.height;
  function choose(value: string) { if (value === "custom") { setWidth(p.width); setHeight(p.height); setEditing(true); } else if (p.onPreset(Number(value))) { setEditing(false); setError(""); } }
  function edit(axis: "width" | "height", value: number) { if (!editing) { setWidth(p.width); setHeight(p.height); } setEditing(true); if (axis === "width") setWidth(value); else setHeight(value); setError(""); }
  function apply() { const w = editing ? width : p.width, h = editing ? height : p.height; if (!validArtboardDimensions(w, h)) { setError(`Enter whole numbers from 1 to ${MAX_ARTBOARD_DIMENSION}.`); return; } if (p.onCustom(w, h)) { setEditing(false); setError(""); } else setError("Cannot shrink smaller than occupied artwork pixels."); }
  return <div className="flex flex-wrap items-center gap-1">
    <select aria-label="Artboard size" value={custom ? "custom" : p.width} onChange={e => choose(e.target.value)} className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs">{ARTBOARD_PRESETS.map(n => <option key={n} value={n}>{n} × {n}</option>)}<option value="custom">Custom</option></select>
    {custom && <><input aria-label="Custom artboard width" type="number" min="1" max={MAX_ARTBOARD_DIMENSION} step="1" value={editing ? width : p.width} onChange={e => edit("width", e.target.valueAsNumber)} className="w-16 rounded border border-slate-700 bg-slate-950 px-1 py-1.5 text-xs"/><span>×</span><input aria-label="Custom artboard height" type="number" min="1" max={MAX_ARTBOARD_DIMENSION} step="1" value={editing ? height : p.height} onChange={e => edit("height", e.target.valueAsNumber)} className="w-16 rounded border border-slate-700 bg-slate-950 px-1 py-1.5 text-xs"/><button type="button" onClick={apply} className="rounded bg-cyan-700 px-2 py-1.5 text-xs">Apply</button>{error && <span role="alert" className="text-[10px] text-red-300">{error}</span>}</>}
  </div>;
}



