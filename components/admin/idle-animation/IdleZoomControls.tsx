import { Maximize, ZoomIn, ZoomOut } from "lucide-react";

export default function IdleZoomControls({ zoom, onChange }: { zoom: number; onChange: (zoom: number) => void }) {
  return <div className="flex shrink-0 items-center gap-1 rounded-md border border-slate-800 bg-slate-950/60 p-1" aria-label="Pixel grid zoom">
    <button type="button" title="Zoom out" aria-label="Zoom out" disabled={zoom <= 0.5} onClick={() => onChange(Math.max(0.5, +(zoom - 0.25).toFixed(2)))}
      className="grid size-7 place-items-center rounded text-slate-300 hover:bg-slate-800 disabled:opacity-40"><ZoomOut size={15} /></button>
    <span className="w-10 text-center font-mono text-[10px] text-slate-300" aria-live="polite">{Math.round(zoom * 100)}%</span>
    <button type="button" title="Zoom in" aria-label="Zoom in" disabled={zoom >= 4} onClick={() => onChange(Math.min(4, +(zoom + 0.25).toFixed(2)))}
      className="grid size-7 place-items-center rounded text-slate-300 hover:bg-slate-800 disabled:opacity-40"><ZoomIn size={15} /></button>
    <button type="button" title="Fit grid" aria-label="Fit grid" onClick={() => onChange(1)}
      className="grid size-7 place-items-center rounded text-slate-300 hover:bg-slate-800"><Maximize size={14} /></button>
  </div>;
}
