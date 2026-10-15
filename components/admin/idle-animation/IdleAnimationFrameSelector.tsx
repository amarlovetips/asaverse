export default function IdleAnimationFrameSelector({ activeFrame, onSelect }: { activeFrame: number; onSelect: (frame: number) => void }) {
  return <div role="tablist" aria-label="Idle animation frames" className="grid grid-cols-3 gap-2">
    {[0, 1, 2].map(frame => <button key={frame} type="button" role="tab" title={`Frame ${frame + 1}`}
      aria-label={`Edit frame ${frame + 1}`} aria-selected={activeFrame === frame}
      aria-controls="idle-frame-board" onClick={() => onSelect(frame)}
      className={`rounded-lg border px-2 py-2 text-xs font-semibold ${activeFrame === frame ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500"}`}>
      {frame + 1}
    </button>)}
  </div>;
}
