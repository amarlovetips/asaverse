import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, X } from "lucide-react";

export type PixelCoordinate = { x: number; y: number };

const directions = [
  { dx: 0, dy: -1, label: "Up", Icon: ArrowUp },
  { dx: -1, dy: 0, label: "Left", Icon: ArrowLeft },
  { dx: 1, dy: 0, label: "Right", Icon: ArrowRight },
  { dx: 0, dy: 1, label: "Down", Icon: ArrowDown },
];

export default function IdlePixelMoveControls({ selectedPixels, onMove, onDeselect }: {
  selectedPixels: PixelCoordinate[];
  onMove: (dx: number, dy: number) => void;
  onDeselect: () => void;
}) {
  return <section className="flex flex-wrap items-center gap-2" aria-label="Move selected pixel">
    <span className="min-w-16 text-[10px] font-semibold text-slate-400" aria-live="polite">
      {selectedPixels.length ? selectedPixels.length + (selectedPixels.length === 1 ? " pixel" : " pixels") : "No selection"}
    </span>
    {directions.map(({ dx, dy, label, Icon }) => <button key={label} type="button" title={"Move one pixel " + label.toLowerCase()}
      aria-label={"Move selection one pixel " + label.toLowerCase()} disabled={!selectedPixels.length}
      onClick={() => onMove(dx, dy)}
      className="grid size-8 place-items-center rounded border border-slate-700 text-slate-200 hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-30">
      <Icon size={15} aria-hidden="true" />
    </button>)}
    <button type="button" title="Clear selection" aria-label="Clear selection" disabled={!selectedPixels.length} onClick={onDeselect}
      className="grid size-8 place-items-center rounded border border-slate-700 text-slate-400 disabled:opacity-30"><X size={15} /></button>
  </section>;
}
