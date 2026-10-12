"use client";
import { useState } from "react";
type Props = { pixels: Record<string, string>; onChange: (pixels: Record<string, string>) => void };
export default function EditArtboard({ pixels, onChange }: Props) {
  const [gridVisible, setGridVisible] = useState(true);
  const shift = (dx: number, dy: number) => {
    const next: Record<string, string> = {};
    Object.entries(pixels).forEach(([key, color]) => {
      const [x, y] = key.split(",").map(Number), nx = x + dx, ny = y + dy;
      next[`${nx},${ny}`] = color;
    });
    onChange(next);
  };
  return <div className="w-full min-w-0 space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      {([["←",-1,0],["→",1,0],["↑",0,-1],["↓",0,1]] as const).map(([label,x,y]) =>
        <button key={label} type="button" onClick={() => shift(x,y)} className="rounded bg-slate-700 px-3 py-1">{label}</button>)}
      <button type="button" onClick={() => setGridVisible(v => !v)} className="rounded bg-slate-700 px-3 py-1 text-xs">{gridVisible ? "Hide Grid" : "Show Grid"}</button><span className="text-xs text-slate-400">64×64 · Move 1 pixel · Bold guide every 10 pixels</span>
    </div>
    <div className="flex gap-1 text-[9px] text-slate-400">
      <span className="w-5 shrink-0">Y/X</span>
      <div className="grid min-w-0 flex-1" style={{gridTemplateColumns:"repeat(64,minmax(0,1fr))"}}>
        {Array.from({length:64},(_,x)=><span key={x} className="text-center">{x}</span>)}
      </div>
    </div>
    <div className="flex gap-1">
      <div className="flex w-5 shrink-0 flex-col text-[9px] text-slate-400">
        {Array.from({length:64},(_,y)=><span key={y} className="flex flex-1 items-center">{y}</span>)}
      </div>
      <div className="grid min-w-0 flex-1 border-l border-t border-slate-500" style={{gridTemplateColumns:"repeat(64,minmax(0,1fr))"}}>
        {Array.from({length:4096},(_,i)=>{
          const x=i%64,y=Math.floor(i/64),color=pixels[`${x},${y}`];
          return <div key={i} title={`X:${x} Y:${y}`} className={`aspect-square min-w-0 ${gridVisible ? `border-b border-r border-slate-500 ${(x+1)%10===0?"border-r-2 border-r-slate-400":""} ${(y+1)%10===0?"border-b-2 border-b-slate-400":""}` : ""}`} style={{backgroundColor:color||"transparent"}} />;
        })}
      </div>
    </div>
  </div>;
}
