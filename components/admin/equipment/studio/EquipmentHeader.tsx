"use client";

import { Eye, Grid2X2, Minus, Plus, RotateCcw } from "lucide-react";
import type { usePixelArtEditorController } from "../../pixel-art/usePixelArtEditorController";
import FilterToolbarControls from "../../pixel-art/FilterToolbarControls";
import ArtboardSizeSelector from "../../pixel-art/ArtboardSizeSelector";
import { EQUIPMENT_CATEGORIES, EQUIPMENT_CATEGORY_LABELS, type EquipmentCategory } from "../types";

type Props = { vm: ReturnType<typeof usePixelArtEditorController> };

export default function EquipmentHeader({ vm }: Props) {
  const { s } = vm;
  return <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-800/80 bg-[#0d141e] px-3 py-2">
    <div className="flex rounded-md border border-slate-700 bg-slate-950 p-0.5">
      <button type="button" onClick={() => s.setSide("front")} className={`rounded px-2 py-1 text-[10px] ${s.side === "front" ? "bg-cyan-500/20 text-cyan-200" : "text-slate-500"}`}>Front</button>
      <button type="button" onClick={() => s.setSide("back")} className={`rounded px-2 py-1 text-[10px] ${s.side === "back" ? "bg-cyan-500/20 text-cyan-200" : "text-slate-500"}`}>Back</button>
    </div>
    <input value={s.name} onChange={event => s.setName(event.target.value)} placeholder="Design name…" aria-label="Equipment design name"
      className="w-40 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-400"/>
    <select value={s.category} onChange={event => s.setPart(event.target.value)} aria-label="Equipment category"
      className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-cyan-400">
      {EQUIPMENT_CATEGORIES.map(category => <option key={category} value={category}>{EQUIPMENT_CATEGORY_LABELS[category as EquipmentCategory]}</option>)}
    </select>
    {s.side === "back" && <label className="flex items-center gap-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-[10px] text-slate-400"><Eye size={13}/><input type="range" min="0.05" max="0.8" step="0.01" value={vm.frontOpacity} onChange={e => vm.setFrontOpacity(Number(e.target.value))} aria-label="Front reference opacity" className="w-16 accent-cyan-400"/>{Math.round(vm.frontOpacity * 100)}%</label>}
    <ArtboardSizeSelector width={s.size} height={s.height} onPreset={s.setSize} onCustom={s.setArtboardSize}/>
    <button type="button" aria-label="Zoom out" onClick={() => s.setZoom(Math.max(4, s.zoom - 2))} className="grid size-7 place-items-center rounded border border-slate-700 bg-slate-900"><Minus size={13}/></button>
    <span className="w-10 text-center font-mono text-[10px] text-slate-400">{Math.round(s.zoom / 12 * 100)}%</span>
    <button type="button" aria-label="Zoom in" onClick={() => s.setZoom(Math.min(32, s.zoom + 2))} className="grid size-7 place-items-center rounded border border-slate-700 bg-slate-900"><Plus size={13}/></button>
    <button type="button" aria-label="Reset zoom" onClick={() => s.setZoom(12)} className="grid size-7 place-items-center rounded border border-slate-700 bg-slate-900"><RotateCcw size={12}/></button>
    <button type="button" aria-pressed={s.guide} aria-label="Toggle guides" onClick={() => s.setGuide(v => !v)} className="grid size-7 place-items-center rounded border border-slate-700 bg-slate-900"><Grid2X2 size={13}/></button>
    {s.tool === "filter" && <FilterToolbarControls value={vm.filter} onChange={vm.setFilter} onApply={() => s.applyFilter(vm.filter)}/>}
    <span className="ml-auto font-mono text-[10px] text-slate-500">X {s.xy.split(", ")[0]} · Y {s.xy.split(", ")[1]}</span>
  </div>;
}
