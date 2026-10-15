import type { CharacterItem } from "./types";
import IdlePartOption from "./IdlePartOption";
import { getIdlePartSlot } from "./parts";

export default function IdlePartSelector({ items, selectedIds, onToggle }: {
  items: CharacterItem[];
  selectedIds: string[];
  onToggle: (item: CharacterItem) => void;
}) {
  return <aside className="grid min-h-0 content-start grid-cols-[repeat(auto-fill,minmax(34px,1fr))] gap-1.5 overflow-y-auto rounded-lg border border-slate-800 bg-[#111821] p-2" aria-label="Preview animation parts">
    {items.filter(item => getIdlePartSlot(item)).map(item => <IdlePartOption key={item.id} item={item}
      checked={selectedIds.includes(item.id)} onToggle={onToggle} />)}
  </aside>;
}
