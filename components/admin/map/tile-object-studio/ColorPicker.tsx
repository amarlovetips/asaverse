"use client";
type Props={color:string;onChange:(c:string)=>void};
export default function ColorPicker({color,onChange}:Props){
 return <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
  <label className="text-xs text-slate-400">Custom color</label>
  <input type="color" value={color} onChange={e=>onChange(e.target.value)} className="mt-2 h-12 w-full cursor-pointer bg-transparent"/>
  <input aria-label="HEX color" value={color} onChange={e=>{if(/^#[0-9a-fA-F]{6}$/.test(e.target.value))onChange(e.target.value);}} className="mt-2 w-full rounded bg-slate-950 p-2 font-mono uppercase select-text"/>
 </div>;
}



