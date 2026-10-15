import { Redo2, Undo2 } from "lucide-react";

export default function IdleHistoryControls({ canUndo, canRedo, onUndo, onRedo }: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return <div className="flex items-center gap-1 border-r border-slate-700 pr-2" aria-label="Undo and redo">
    <button type="button" title="Undo last edit" aria-label="Undo last edit" disabled={!canUndo} onClick={onUndo}
      className="grid size-8 place-items-center rounded border border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30">
      <Undo2 size={16} aria-hidden="true" />
    </button>
    <button type="button" title="Redo edit" aria-label="Redo edit" disabled={!canRedo} onClick={onRedo}
      className="grid size-8 place-items-center rounded border border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30">
      <Redo2 size={16} aria-hidden="true" />
    </button>
  </div>;
}
