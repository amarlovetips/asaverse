import { Eraser, MousePointer2, Pencil } from "lucide-react";

export type IdlePixelTool = "paint" | "erase" | "select";

const tools = [
  { id: "paint" as const, label: "Paint pixel", Icon: Pencil },
  { id: "erase" as const, label: "Erase pixel", Icon: Eraser },
  { id: "select" as const, label: "Drag to select pixels; Shift-click to add; Ctrl/Command-click to toggle; use arrow keys to move", Icon: MousePointer2 },
];

export default function IdlePixelToolSelector({ activeTool, onSelect }: {
  activeTool: IdlePixelTool;
  onSelect: (tool: IdlePixelTool) => void;
}) {
  return <nav className="flex flex-col gap-1.5 rounded-lg border border-slate-800 bg-[#101722] p-1.5" aria-label="Pixel tools">
    {tools.map(({ id, label, Icon }) => <button key={id} type="button" aria-label={label} title={label} aria-pressed={activeTool === id}
      onClick={() => onSelect(id)}
      className={"grid size-10 place-items-center rounded-md border transition-colors " + (activeTool === id ? "border-cyan-400 bg-cyan-400/15 text-cyan-100" : "border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-white")}>
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
    </button>)}
  </nav>;
}
