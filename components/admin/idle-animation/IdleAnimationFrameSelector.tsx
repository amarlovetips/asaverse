import { Plus, Trash2 } from "lucide-react";

export default function IdleAnimationFrameSelector({ activeFrame, frameCount, onSelect, onAdd, onDelete }: {
  activeFrame: number; frameCount: number; onSelect: (frame: number) => void;
  onAdd: () => void; onDelete: () => void;
}) {
  return <div className="flex min-w-0 items-center gap-1">
    <div role="tablist" aria-label="Idle animation frames" className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
      {Array.from({ length: frameCount }, (_, frame) => <button key={frame} type="button" role="tab" title={`Frame ${frame + 1}`}
        aria-label={`Edit frame ${frame + 1}`} aria-selected={activeFrame === frame}
        aria-controls="idle-frame-board" onClick={() => onSelect(frame)}
        className={`min-w-8 rounded-lg border px-2 py-2 text-xs font-semibold ${activeFrame === frame ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500"}`}>
        {frame + 1}
      </button>)}
    </div>
    <button type="button" title="Add frame" aria-label="Add idle frame" onClick={onAdd}
      className="grid size-8 shrink-0 place-items-center rounded border border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-200"><Plus size={15}/></button>
    <button type="button" title="Delete current frame" aria-label="Delete current idle frame" disabled={frameCount <= 1} onClick={onDelete}
      className="grid size-8 shrink-0 place-items-center rounded border border-slate-700 text-slate-400 hover:border-rose-700 hover:text-rose-300 disabled:opacity-40"><Trash2 size={15}/></button>
  </div>;
}
