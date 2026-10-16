import { Pause, Play, Plus, RotateCcw, Square, Trash2 } from "lucide-react";
export default function WalkFrameControls(p: {
  frame: number; count: number; playing: boolean;
  onAdd: () => void; onDelete: () => void; onPrevious: () => void; onNext: () => void;
  onPlay: () => void; onStop: () => void; onRestart: () => void; onSelectFrame: (frame: number) => void;
}) {
  const button = "flex items-center gap-1 rounded border border-slate-700 px-2 py-1.5 text-[10px] text-slate-200 hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-40";
  return <section className="w-full space-y-2" aria-label="Walking animation frames and playback">
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <button type="button" className={button} aria-label="Previous frame" onClick={p.onPrevious}>‹</button>
      <button type="button" className={button} aria-label={p.playing ? "Pause animation preview" : "Play animation preview"} onClick={p.onPlay}>{p.playing ? <Pause size={14}/> : <Play size={14}/>}</button>
      <button type="button" className={button} aria-label="Stop animation preview" onClick={p.onStop}><Square size={13}/></button>
      <button type="button" className={button} aria-label="Restart animation preview" onClick={p.onRestart}><RotateCcw size={14}/></button>
      <button type="button" className={button} aria-label="Next frame" onClick={p.onNext}>›</button>
      <button type="button" className={button} aria-label="Add frame" onClick={p.onAdd}><Plus size={14}/> Add Frame</button>
      <button type="button" className={button} aria-label="Delete frame" disabled={p.count <= 1} onClick={p.onDelete}><Trash2 size={14}/> Delete Frame</button>
    </div>
    <div className="flex flex-wrap justify-center gap-1">
      {Array.from({ length: p.count }, (_, i) => <button key={i} type="button" role="tab" aria-label={`Select frame ${i + 1}`} aria-selected={p.frame === i} onClick={() => p.onSelectFrame(i)}
        className={`rounded border px-2 py-1 text-xs ${p.frame === i ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : "border-slate-700 text-slate-400"}`}>{i + 1}</button>)}
    </div>
  </section>;
}
