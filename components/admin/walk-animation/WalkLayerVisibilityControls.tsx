"use client";

import { Eye, EyeOff } from "lucide-react";
import { CHARACTER_VISIBILITY_SLOTS, type CharacterLayerVisibility, type CharacterVisibilitySlot } from "@/lib/character-design-defaults";

const labels: Record<CharacterVisibilitySlot, string> = {
  face: "Face", body: "Body", clothing: "Clothing / Outfit", hair: "Hair", facialHair: "Facial Hair",
};

export default function WalkLayerVisibilityControls({ value, onChange, label }: {
  value: CharacterLayerVisibility;
  onChange: (next: CharacterLayerVisibility) => void;
  label: string;
}) {
  return <div role="group" aria-label={label} className="flex items-center gap-1">
    {CHARACTER_VISIBILITY_SLOTS.map(slot => {
      const visible = value[slot];
      return <button key={slot} type="button" aria-label={`${labels[slot]} ${visible ? "visible" : "hidden"}`}
        aria-pressed={visible} title={`${labels[slot]}: ${visible ? "visible" : "hidden"}`}
        onClick={() => onChange({ ...value, [slot]: !visible })}
        className={`grid size-7 place-items-center rounded border ${visible ? "border-cyan-500/70 bg-cyan-400/10 text-cyan-200" : "border-slate-700 text-slate-500"}`}>
        {visible ? <Eye size={14}/> : <EyeOff size={14}/>}
      </button>;
    })}
  </div>;
}
