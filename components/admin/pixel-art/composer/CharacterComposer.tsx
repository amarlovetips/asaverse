"use client";
import { useEffect } from "react";
import { useCharacterLayers } from "./useCharacterLayers";
import LayerList from "./LayerList";
import CharacterPreview from "./CharacterPreview";
export default function CharacterComposer(){
 const s=useCharacterLayers();
 useEffect(()=>{void s.refresh();},[]);
 const move=(id:string,k:"x"|"y",v:number)=>s.setLayers(a=>a.map(l=>l.layerId===id?{...l,[k]:v}:l));
 const order=(id:string,d:number)=>s.setLayers(a=>{const i=a.findIndex(l=>l.layerId===id),j=Math.max(0,Math.min(a.length-1,i+d));if(i<0||i===j)return a;const b=[...a];[b[i],b[j]]=[b[j],b[i]];return b;});
 function exportPng(){const c=document.createElement("canvas");c.width=c.height=64;const x=c.getContext("2d");if(!x)return;s.layers.forEach(l=>Object.entries(l.pixel_data||{}).forEach(([k,v])=>{const [a,b]=k.split(",").map(Number);if(a+l.x>=0&&a+l.x<64&&b+l.y>=0&&b+l.y<64){x.fillStyle=v;x.fillRect(a+l.x,b+l.y,1,1);}}));const a=document.createElement("a");a.download="asaverse-character.png";a.href=c.toDataURL("image/png");a.click();}
 return <section className="space-y-3 border-t border-slate-700 pt-3"><h3 className="font-semibold text-cyan-300">Character Composer</h3>
 <button onClick={()=>void s.refresh()} className="w-full rounded bg-slate-800 p-2 text-xs">Refresh Saved Designs</button>
 <div className="max-h-32 space-y-1 overflow-y-auto">{s.designs.map(d=><button key={d.id} onClick={()=>s.add(d)} className="block w-full rounded border border-slate-700 p-2 text-left text-xs">{d.design_name} · {d.design_type}</button>)}</div>
 <CharacterPreview layers={s.layers}/><LayerList layers={s.layers} onMove={move} onOrder={order} onRemove={id=>s.setLayers(a=>a.filter(l=>l.layerId!==id))}/>
 <button onClick={exportPng} className="w-full rounded bg-cyan-800 p-2 text-xs">Export Character PNG</button>{s.message&&<p className="text-xs text-slate-400">{s.message}</p>}</section>;
}
