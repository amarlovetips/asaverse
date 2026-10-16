"use client";
import type { PublishedDesign } from "./BackDesignPickerTypes";
import { useBackDesignPicker } from "./useBackDesignPicker";
const categories = ["All categories", "body", "face", "hair", "facial-hair", "clothing", "outfit"];
export type { PublishedDesign } from "./BackDesignPickerTypes";
export default function BackDesignPicker({ selectedId, selectedCategory, onSelect }: {
  selectedId: string | null; selectedCategory: string; onSelect: (design: PublishedDesign) => void;
}) {
  const p = useBackDesignPicker(onSelect);
  return <div className="flex min-w-0 items-center gap-1.5">
    <select value={p.filter} onChange={e => p.setFilter(e.target.value)} className="w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 capitalize" aria-label="Filter published designs by item">
      {categories.map(c => <option key={c} value={c}>{c === "All categories" ? c : c.replace("-", " ")}</option>)}
    </select>
    <select value={selectedId || ""} onChange={e => p.choose(e.target.value)} className="w-36 min-w-0 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100" aria-label="Choose published front design">
      <option value="">Choose a design…</option>
      {selectedId && p.items.find(d => d.id === selectedId) && !p.visible.some(d => d.id === selectedId) && <option value={selectedId}>{p.items.find(d => d.id === selectedId)?.design_name}</option>}
      {p.visible.map(d => <option key={d.id} value={d.id}>{d.design_name} · {d.design_type}</option>)}
    </select>
    <select disabled={!selectedId} value={selectedCategory} className="w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs capitalize text-slate-400" aria-label="Detected item category">
      {categories.slice(1).map(c => <option key={c} value={c}>{c.replace("-", " ")}</option>)}
    </select>
    {p.message && <span role="status" title={p.message} className="sr-only">{p.message}</span>}
  </div>;
}
