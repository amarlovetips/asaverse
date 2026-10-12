type Props={size:number;zoom:number};
export default function CoordinateRuler({size,zoom}:Props){
 const marks=Array.from({length:size},(_,i)=>i).filter(i=>i%4===0||i===size-1);
 return <div className="text-[9px] font-mono text-slate-500" style={{width:size*zoom}}>
  <div className="flex" style={{height:16}}>
   {marks.map(i=><span key={i} style={{position:"absolute",transform:`translateX(${i*zoom}px)`}}>{i}</span>)}
  </div>
  <div className="pointer-events-none absolute left-0 top-0 flex flex-col" style={{height:size*zoom}}>
   {marks.map(i=><span key={i} style={{position:"absolute",transform:`translateY(${i*zoom}px)`}}>{i}</span>)}
  </div>
 </div>;
}
