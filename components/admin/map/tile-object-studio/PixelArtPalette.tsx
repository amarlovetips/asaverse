"use client";
type Props={colors:string[];color:string;onChange:(c:string)=>void};
export default function PixelArtPalette({colors,color,onChange}:Props){
 return <div className="grid grid-cols-5 gap-1">
  {colors.map(c=><button key={c} title={c} aria-label={`Color ${c}`}
   onClick={()=>onChange(c)} style={{background:c}}
   className={`aspect-square rounded border ${color===c?"border-white ring-2 ring-cyan-400":"border-slate-600"}`}/>)}
 </div>;
}



