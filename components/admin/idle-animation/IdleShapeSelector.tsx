import { Circle, Minus, Pencil, Square } from "lucide-react";

export type IdlePixelShape = "freehand" | "line" | "rectangle" | "ellipse";

const shapes = [
  { id: "freehand" as const, label: "Freehand brush", Icon: Pencil },
  { id: "line" as const, label: "Draw line", Icon: Minus },
  { id: "rectangle" as const, label: "Draw rectangle", Icon: Square },
  { id: "ellipse" as const, label: "Draw ellipse", Icon: Circle },
];

export default function IdleShapeSelector({ activeShape, onSelect }: {
  activeShape: IdlePixelShape;
  onSelect: (shape: IdlePixelShape) => void;
}) {
  return <div className="flex items-center gap-1" aria-label="Shape controls">
    {shapes.map(({ id, label, Icon }) => <button key={id} type="button" title={label} aria-label={label} aria-pressed={activeShape === id}
      onClick={() => onSelect(id)}
      className={"grid size-8 shrink-0 place-items-center rounded border transition-colors " + (activeShape === id ? "border-cyan-500 bg-cyan-500/10 text-cyan-200" : "border-transparent text-slate-400 hover:border-slate-700 hover:text-white")}>
      <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
    </button>)}
  </div>;
}
