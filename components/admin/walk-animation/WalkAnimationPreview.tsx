"use client";
import CharacterComposite from "@/components/CharacterComposite";
import { DEFAULT_LOOK } from "@/lib/game-types";
import { getIdlePartSlot } from "../idle-animation/parts";
import type { WalkCharacterItem } from "./types";
import WalkFrameControls from "./WalkFrameControls";
import type { WalkDirection } from "@/lib/character-design-json";
import { getCharacterDesignSlot } from "@/lib/character-design-defaults";
import type { CharacterLayerVisibility } from "@/lib/character-design-defaults";
import WalkLayerVisibilityControls from "./WalkLayerVisibilityControls";
export default function WalkAnimationPreview(p: {
  items: WalkCharacterItem[]; target: WalkCharacterItem; side: "front" | "back"; directions: WalkDirection[];
  visibleLayers: CharacterLayerVisibility; onVisibleLayersChange: (next: CharacterLayerVisibility) => void;
  frame: number; count: number; playing: boolean; busy: boolean; message: string;
  onSelect: (frame: number) => void; onAdd: () => void; onDelete: () => void;
  onPrevious: () => void; onNext: () => void; onPlay: () => void; onStop: () => void;
  onRestart: () => void; onSave: () => void;
}) {
  const source = p.items.map(item => ({ ...item, ...(item.id === p.target.id ? p.target : {}), source: "supabase" as const }));
  const designs = p.side === "back" ? source.map(item => {
    if (item.design_type.toLowerCase().endsWith("-back") || !Object.keys(item.back_pixel_data || {}).length) return item;
    const hasPairedBack = source.some(other => other.design_type.toLowerCase().endsWith("-back") &&
      (getIdlePartSlot(other) || getCharacterDesignSlot(other.design_type)) === (getIdlePartSlot(item) || getCharacterDesignSlot(item.design_type)) &&
      other.design_name === item.design_name);
    if (hasPairedBack) return item;
    return {
      ...item, design_type: `${item.design_type.replace(/-back$/i, "")}-back`,
      pixel_data: item.back_pixel_data || {}, idle_frames: item.back_idle_frames,
      walking_animation: item.back_walking_animation,
    };
  }) : source;
  const onSide = (item: WalkCharacterItem) => item.design_type.toLowerCase().endsWith("-back") === (p.side === "back");
  const part = (slot: string) => {
    const targetSlot = getIdlePartSlot(p.target) || getCharacterDesignSlot(p.target.design_type);
    if (targetSlot === slot && onSide(p.target)) return p.target;
    const candidates = designs.filter(item => onSide(item) &&
      (getIdlePartSlot(item) || getCharacterDesignSlot(item.design_type)) === slot);
    if (candidates.length) return candidates.find(item => item.is_default_base) || candidates[0];
    const fallback = designs.find(item => (getIdlePartSlot(item) || getCharacterDesignSlot(item.design_type)) === slot);
    return fallback;
  };
  const parts = {
    body: part("body")?.id, face: part("face")?.id, hair: part("hair")?.id,
    facialHair: part("facialHair")?.id, clothing: part("clothing")?.id, hat: part("hat")?.id,
  };
  return <aside className="flex min-h-0 flex-col items-center gap-3 overflow-auto rounded-lg border border-slate-800 bg-[#111821] p-3" aria-label="Walking animation preview">
    <WalkLayerVisibilityControls value={p.visibleLayers} onChange={p.onVisibleLayersChange} label="Preview layer visibility"/>
    <div className="grid min-h-36 w-full place-items-center [&>svg]:h-auto [&>svg]:max-w-full [&>svg]:w-full">
      <CharacterComposite look={{ ...DEFAULT_LOOK, parts }} designs={designs} side={p.side} size={208} showPlanet={false} animate={false}
        animationFrame={p.frame} walkDirection={p.directions[0]} walkFrameIndex={p.frame} visibleLayers={p.visibleLayers} />
    </div>
    <WalkFrameControls {...p} onSelectFrame={p.onSelect} />
    <button type="button" onClick={p.onSave} disabled={p.busy || !p.directions.length}
      className="w-full rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">{p.busy ? "Saving…" : "Save walking animation"}</button>
    {p.message && <p role="status" className="break-words text-center text-[10px] text-slate-300">{p.message}</p>}
  </aside>;
}
