"use client";
type Props={count:number;onUndo:()=>void;onClear:()=>void};
export default function HistoryPanel({count,onUndo,onClear}:Props){
 return <section className="space-y-2 rounded-lg border border-slate-700 bg-slate-900 p-3">
  <p className="text-[10px] uppercase tracking-widest text-slate-500">History</p>
  <p className="text-xs text-slate-400">{count} undo steps available</p>
  <button onClick={onUndo} disabled={!count} className="w-full rounded bg-slate-800 p-2 text-xs disabled:opacity-40">Undo</button>
  <button onClick={onClear} className="w-full rounded bg-slate-800 p-2 text-xs">Clear canvas</button>
 </section>;
}



