import type { CharacterItem } from "./types";
import { Check, ScanFace, Shirt, UserRound, Waves } from "lucide-react";
import { getIdlePartSlot } from "./parts";

export default function IdlePartOption({ item, checked, onToggle }: {
  item: CharacterItem;
  checked: boolean;
  onToggle: (item: CharacterItem) => void;
}) {
  const slot = getIdlePartSlot(item);
  const Icon = slot === "body" ? UserRound : slot === "face" ? ScanFace
    : slot === "hair" ? Waves : slot === "clothing" ? Shirt : ScanFace;
  const label = `${item.design_name} · ${item.design_type} · ${item.canvas_width}×${item.canvas_height}`;
  return <button type="button" role="checkbox" aria-checked={checked} aria-label={label} title={label}
    onClick={() => onToggle(item)}
    className={`relative grid aspect-square min-w-0 place-items-center rounded-md border transition-colors ${checked
      ? "border-cyan-400 bg-cyan-400/15 text-cyan-100"
      : "border-slate-700 bg-slate-950/50 text-slate-400 hover:border-slate-500 hover:text-slate-200"}`}>
    <Icon size={17} aria-hidden="true" />
    {checked && <Check size={10} className="absolute -right-1 -top-1 rounded-full bg-cyan-400 text-slate-950" aria-hidden="true" />}
  </button>;
}
