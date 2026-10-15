import type { SelectionBounds, SelectionKind } from "./SelectionBounds";

type Props = { selection: SelectionBounds | null; kind: SelectionKind; onClear: () => void; onSelectAll: () => void;
  onInvert: () => void; onCopy: () => void; onCut: () => void; onPaste: () => void; onDelete: () => void;
  onTransform: (value: "horizontal" | "vertical" | "clockwise" | "counterclockwise") => void };

export default function SelectionActionsPanel(p: Props) {
  const action = (label: string, run: () => void, disabled = false) => <button type="button" onClick={run} disabled={disabled}
    className="rounded-md border border-slate-700 px-2 py-2 text-slate-300 hover:bg-slate-800 disabled:opacity-40">{label}</button>;
  return <div className="space-y-2">
    <p className="text-slate-400">Drag to select; drag within the bounds to move. Shortcuts: Ctrl/Cmd+A, C, X, V; Delete; Escape.</p>
    {p.selection && <p className="font-mono text-slate-500">{p.selection.width} × {p.selection.height} px · {p.kind}</p>}
    <div className="grid grid-cols-2 gap-2">{action("Select All", p.onSelectAll)}{action("Invert", p.onInvert)}
      {action("Copy", p.onCopy, !p.selection)}{action("Cut", p.onCut, !p.selection)}{action("Paste", p.onPaste)}
      {action("Flip Horizontal", () => p.onTransform("horizontal"), !p.selection)}
      {action("Flip Vertical", () => p.onTransform("vertical"), !p.selection)}
      {action("Rotate ↻", () => p.onTransform("clockwise"), !p.selection)}
      {action("Rotate ↺", () => p.onTransform("counterclockwise"), !p.selection)}
      {action("Deselect", p.onClear, !p.selection)}{action("Delete Pixels", p.onDelete, !p.selection)}
    </div>
  </div>;
}
