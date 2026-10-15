import type { CharacterItem } from "./types";
import IdlePartOption from "./IdlePartOption";

export default function IdlePartGroup({ label, items, selectedIds, onToggle }: {
  label: string;
  items: CharacterItem[];
  selectedIds: string[];
  onToggle: (item: CharacterItem) => void;
}) {
  return <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-cyan-300">{label}</h3>
    {items.length ? <div className="space-y-2">
      {items.map(item => <IdlePartOption key={item.id} item={item} checked={selectedIds.includes(item.id)} onToggle={onToggle} />)}
    </div> : <p className="text-[11px] text-slate-600">No saved items in this category.</p>}
  </section>;
}
