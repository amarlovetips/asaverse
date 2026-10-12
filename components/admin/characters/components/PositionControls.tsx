"use client";
type Props = { x: number; y: number; onChange: (x: number, y: number) => void };
export default function PositionControls({ x, y, onChange }: Props) {
  const move = (dx: number, dy: number) =>
    onChange(Math.max(0, Math.min(63, x + dx)), Math.max(0, Math.min(63, y + dy)));
  return <div className="flex flex-wrap items-center gap-2 text-xs">
    <button onClick={() => move(0, -1)} className="rounded bg-slate-700 px-3 py-2">↑</button>
    <button onClick={() => move(-1, 0)} className="rounded bg-slate-700 px-3 py-2">←</button>
    <button onClick={() => move(0, 1)} className="rounded bg-slate-700 px-3 py-2">↓</button>
    <button onClick={() => move(1, 0)} className="rounded bg-slate-700 px-3 py-2">→</button>
    <span className="text-slate-400">X: {x}, Y: {y}</span>
  </div>;
}
