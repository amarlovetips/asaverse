"use client";
import type { Layer } from "./useCharacterLayers";
type Props={layers:Layer[];onMove:(id:string,k:"x"|"y",v:number)=>void;onOrder:(id:string,d:number)=>void;onRemove:(id:string)=>void};
export default function LayerList({layers,onMove,onOrder,onRemove}:Props){
 return <div className="space-y-2">{layers.map((l,i)=><section key={l.layerId} className="rounded border border-slate-700 p-2 text-xs">
 <b>{i+1}. {l.design_name} · {l.design_type}</b>
 <div className="mt-2 flex gap-2">X<input type="number" value={l.x} onChange={e=>onMove(l.layerId,"x",+e.target.value)} className="w-14 bg-slate-900 p-1"/>Y<input type="number" value={l.y} onChange={e=>onMove(l.layerId,"y",+e.target.value)} className="w-14 bg-slate-900 p-1"/></div>
 <div className="mt-2 flex flex-wrap gap-2"><button onClick={()=>onOrder(l.layerId,-1)}>Back</button><button onClick={()=>onOrder(l.layerId,1)}>Front</button><button onClick={()=>onRemove(l.layerId)}>Remove</button></div>
 </section>)}</div>;
}




