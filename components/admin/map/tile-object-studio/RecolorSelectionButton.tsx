"use client";
type Props = { count: number; color: string; onRecolor: () => void };
export default function RecolorSelectionButton({ count, color, onRecolor }: Props) {
  if (!count) return null;
  return <button type="button" onClick={onRecolor} className="w-full rounded border border-slate-700 px-2 py-1.5 text-left text-[10px] text-slate-300 hover:bg-slate-800">
    Replace selected pixels with <span className="ml-1 inline-block size-2 rounded-full border border-white/40 align-middle" style={{ backgroundColor: color }}/> {color}
  </button>;
}



