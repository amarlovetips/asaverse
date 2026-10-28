"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw } from "lucide-react";
import PercentControl from "./PercentControl";

type Props = { name: string; url: string | null; visible: boolean; opacity: number; scale: number; x: number; y: number;
  onVisible: () => void; onOpacity: (value: number) => void; onScale: (value: number) => void;
  onX: (update: (value: number) => number) => void; onY: (update: (value: number) => number) => void;
  onAdd: (file?: File) => void; onRemove: () => void };

export default function ReferenceImageControls(p: Props) {
  return <section className="space-y-3 rounded-lg border border-slate-700 bg-[#0c121b] p-3"><h3 className="text-xs font-semibold text-cyan-200">Reference Image</h3>
    <p className="break-all text-[10px] text-slate-400">{p.name || "No image loaded"}</p>
    <label className="block rounded border border-slate-700 p-2 text-center text-xs text-cyan-200">Add / Replace Image
      <input type="file" accept="image/*" className="hidden" onChange={e => { p.onAdd(e.currentTarget.files?.[0]); e.currentTarget.value = ""; }}/>
    </label>
    {p.url && <><button type="button" onClick={p.onVisible} className="w-full rounded border border-slate-700 p-2 text-xs">{p.visible ? "Hide Image" : "Show Image"}</button>
      <PercentControl label="Opacity" value={p.opacity} min={0} max={1} onChange={p.onOpacity}/>
      <PercentControl label="Scale" value={p.scale} min={0.2} max={10} onChange={p.onScale}/>
      <div className="grid grid-cols-3 gap-1 justify-items-center"><span/><MoveButton label="Move image up" icon={<ArrowUp size={14}/>} onClick={()=>p.onY(v=>v-2)}/><span/>
        <MoveButton label="Move image left" icon={<ArrowLeft size={14}/>} onClick={()=>p.onX(v=>v-2)}/><MoveButton label="Center image" icon={<RotateCcw size={13}/>} onClick={()=>{p.onX(()=>0);p.onY(()=>0);p.onScale(1);}}/><MoveButton label="Move image right" icon={<ArrowRight size={14}/>} onClick={()=>p.onX(v=>v+2)}/>
        <span/><MoveButton label="Move image down" icon={<ArrowDown size={14}/>} onClick={()=>p.onY(v=>v+2)}/><span/></div>
      <p className="font-mono text-[10px] text-slate-500">X {p.x.toFixed(1)} · Y {p.y.toFixed(1)}</p>
      <button type="button" onClick={p.onRemove} className="w-full rounded border border-rose-900/70 p-2 text-xs text-rose-300">Remove Image</button></>}
  </section>;
}

function MoveButton(p: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return <button type="button" title={p.label} aria-label={p.label} onClick={p.onClick} className="grid size-8 place-items-center rounded border border-slate-700 text-slate-300 hover:border-cyan-500">{p.icon}</button>;
}



