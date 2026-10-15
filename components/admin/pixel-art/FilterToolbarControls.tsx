"use client";

export default function FilterToolbarControls({ value, onChange, onApply }: { value: string; onChange: (value: string) => void; onApply: () => void }) {
  return <div className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 p-1">
    <select value={value} onChange={e => onChange(e.target.value)} className="rounded bg-slate-950 px-1.5 py-1 text-[10px] text-slate-200" aria-label="Pixel filter">
      <option value="grayscale">Grayscale</option><option value="invert">Invert</option><option value="lighten">Lighten</option><option value="darken">Darken</option>
    </select>
    <button type="button" onClick={onApply} className="rounded bg-cyan-500/15 px-2 py-1 text-[10px] font-semibold text-cyan-200">Apply</button>
  </div>;
}
