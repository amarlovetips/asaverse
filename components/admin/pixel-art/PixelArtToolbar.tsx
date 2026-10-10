"use client";
import { ARTBOARDS } from "./usePixelEditorState";
type Props={name:string;setName:(v:string)=>void;size:number;setSize:(v:number)=>void;tool:string;setTool:(v:string)=>void};
const labels:Record<string,string>={body:"Body / Skin",face:"Face / Head","facial-hair":"Facial Hair",hair:"Hair"};
export default function PixelArtToolbar(p:Props){
 return <header className="flex flex-wrap items-center gap-2 border-b border-slate-700 bg-[#151c27] p-3">
 <div className="mr-auto"><p className="text-[10px] tracking-widest text-cyan-400">ASAVERSE / PIXEL LAB</p><h2 className="font-semibold">Character Design Studio</h2></div>
 <input value={p.name} onChange={e=>p.setName(e.target.value)} placeholder="Design name" className="w-32 rounded bg-slate-900 p-2 select-text"/>
 <span className="rounded bg-slate-900 px-3 py-2 text-xs text-cyan-300">Single Artboard</span>
 <select value={p.size} onChange={e=>p.setSize(+e.target.value)} className="rounded bg-slate-900 p-2">{[16,32,64].map(v=><option key={v} value={v}>{v} x {v}</option>)}</select>
 <div className="flex gap-1">{["pencil","eraser","fill"].map(v=><button type="button" key={v} onClick={()=>p.setTool(v)} className={`rounded p-2 text-xs ${p.tool===v?"bg-cyan-700":"bg-slate-800"}`}>{v}</button>)}</div>
 </header>;
}
