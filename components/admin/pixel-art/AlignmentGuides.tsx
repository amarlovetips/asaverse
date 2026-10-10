type Props={part:string;enabled:boolean};
export default function AlignmentGuides({part,enabled}:Props){
 if(!enabled)return null;
 const positions:Record<string,number>={hair:25,face:45,body:50,outfit:55};
 return <div className="pointer-events-none absolute inset-0 overflow-hidden">
  <div className="absolute bottom-0 left-1/2 top-0 border-l border-dashed border-cyan-400/50"/>
  <div className="absolute left-0 right-0 border-t border-dashed border-amber-300/60" style={{top:`${positions[part]??50}%`}}/>
  <span className="absolute left-1 top-1 text-[9px] text-cyan-300/80">CENTER</span>
  <span className="absolute bottom-1 right-1 text-[9px] text-amber-200/80">{part.toUpperCase()} GUIDE</span>
 </div>;
}
