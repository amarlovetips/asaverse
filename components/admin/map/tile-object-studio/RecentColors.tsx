"use client";
type Props={colors:string[];selected:string;onSelect:(c:string)=>void};
export default function RecentColors({colors,selected,onSelect}:Props){
 return <section className="space-y-2">
  <p className="text-[10px] uppercase tracking-widest text-slate-500">Recent colors</p>
  <div className="flex flex-wrap gap-1">
   {colors.map((c,i)=><button key={`${c}-${i}`} title={c} aria-label={`Recent ${c}`}
    onClick={()=>onSelect(c)} style={{background:c}}
    className={`h-7 w-7 rounded border ${selected===c?"border-white ring-2 ring-cyan-400":"border-slate-600"}`}/>)}
   {!colors.length&&<span className="text-xs text-slate-500">No recent colors</span>}
  </div>
 </section>;
}



