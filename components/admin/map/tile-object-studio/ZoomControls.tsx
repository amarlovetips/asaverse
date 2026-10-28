"use client";
type Props={zoom:number;setZoom:(v:number)=>void};
export default function ZoomControls({zoom,setZoom}:Props){
 return <div className="flex items-center gap-1 text-xs">
  <button onClick={()=>setZoom(Math.max(4,zoom-2))} className="rounded bg-slate-800 px-3 py-1">-</button>
  <span className="min-w-12 text-center">{Math.round(zoom/12*100)}%</span>
  <button onClick={()=>setZoom(Math.min(32,zoom+2))} className="rounded bg-slate-800 px-3 py-1">+</button>
  <button onClick={()=>setZoom(12)} className="rounded bg-slate-800 px-2 py-1">Reset</button>
 </div>;
}



