"use client";

import { Blend, Circle, Crop, Eraser, Hexagon, Minus, MousePointer2, PaintBucket, Pencil, Scan, SlidersHorizontal, Square, Type } from "lucide-react";

const tools = [
  { id: "select", label: "Selection", icon: MousePointer2, shortcut: "V" },
  { id: "pencil", label: "Pencil", icon: Pencil, shortcut: "B" },
  { id: "eraser", label: "Eraser", icon: Eraser, shortcut: "E" },
  { id: "fill", label: "Fill", icon: PaintBucket, shortcut: "G" },
  { id: "line", label: "Line", icon: Minus, shortcut: "L" },
  { id: "rectangle", label: "Rectangle / Square", icon: Square, shortcut: "U" },
  { id: "circle", label: "Circle / Ellipse", icon: Circle, shortcut: "O" },
  { id: "polygon", label: "Polygon", icon: Hexagon, shortcut: "P" },
  { id: "text", label: "Text", icon: Type, shortcut: "T" },
  { id: "filter", label: "Filters", icon: SlidersHorizontal, shortcut: "F" },
  { id: "gradient", label: "Gradient", icon: Blend, shortcut: "D" },
  { id: "crop", label: "Crop", icon: Crop, shortcut: "C" },
  { id: "perspective", label: "Perspective", icon: Scan, shortcut: "K" },
] as const;

export type ReferenceTool = typeof tools[number]["id"];

export default function ReferenceToolRail({ tool, onSelect }: { tool: string; onSelect: (tool: ReferenceTool) => void }) {
  return <aside aria-label="Reference editor tools" className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-slate-700/80 bg-[#101722] p-2">
    {tools.map(({ id, label, icon: Icon, shortcut }) => <button key={id} type="button" title={`${label} (${shortcut})`} aria-label={`${label} tool`} aria-pressed={tool === id} onClick={() => onSelect(id)} className={`group relative grid size-10 place-items-center rounded-lg border transition ${tool === id ? "border-cyan-300/70 bg-cyan-400/15 text-cyan-200 shadow-[0_0_18px_#22d3ee20]" : "border-transparent text-slate-400 hover:border-slate-600 hover:bg-slate-800 hover:text-white"}`}>
      <Icon size={18} strokeWidth={1.8}/>
      <span className="pointer-events-none absolute left-12 z-50 hidden whitespace-nowrap rounded-md border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-white shadow-xl group-hover:block">{label}<kbd className="ml-2 text-slate-500">{shortcut}</kbd></span>
    </button>)}
  </aside>;
}
