"use client";

import { useEffect, useState } from "react";
import CharacterComposite from "@/components/CharacterComposite";
import { DEFAULT_LOOK } from "@/lib/game-types";
import type { CharacterItem, IdleFrameData } from "./types";
import { getIdlePartSlot } from "./parts";
import { Pause, Play } from "lucide-react";
import IdleAnimationFrameSelector from "./IdleAnimationFrameSelector";
import IdleSaveFramesButton from "./IdleSaveFramesButton";

function partDesign(slot: "body" | "face" | "hair" | "facialHair" | "clothing", selected: CharacterItem[], items: CharacterItem[]) {
  const checked = selected.find(item => getIdlePartSlot(item) === slot);
  if (checked) return checked;
  return items.find(item => getIdlePartSlot(item) === slot && item.is_default_base)
    || items.find(item => getIdlePartSlot(item) === slot);
}

export default function IdleCharacterPreview({ items, target, frames, activeFrame, selectedIds, onSelectFrame, onAddFrame, onDeleteFrame, onSave, saving, size = 208 }: {
  items: CharacterItem[];
  target: CharacterItem;
  frames: IdleFrameData[];
  activeFrame: number;
  selectedIds: string[];
  onSelectFrame: (frame: number) => void;
  onAddFrame: () => void;
  onDeleteFrame: () => void;
  onSave: () => void;
  saving: boolean;
  size?: number;
}) {
  const [playing, setPlaying] = useState(false);
  const [previewFrame, setPreviewFrame] = useState(activeFrame);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setPreviewFrame(current => (current + 1) % frames.length), 420);
    return () => window.clearInterval(timer);
  }, [playing, frames.length]);

  const shownFrame = playing ? previewFrame : activeFrame;
  const frame = frames[shownFrame] || frames[0];
  const selected = items.filter(item => selectedIds.includes(item.id));
  const previewItems = items.map(item => {
    const isAnimationSelected = selectedIds.includes(item.id);
    const itemFrame = item.id === target.id ? frame : item.idle_frames?.[shownFrame];
    return {
    ...item,
    source: "supabase" as const,
    idle_frames: isAnimationSelected ? (item.id === target.id ? frames : item.idle_frames) : null,
    ...(isAnimationSelected && itemFrame ? { pixel_data: itemFrame.pixelData } : {}),
  };
  });
  const body = partDesign("body", selected, previewItems);
  const face = partDesign("face", selected, previewItems);
  const hair = partDesign("hair", selected, previewItems);
  const facialHair = partDesign("facialHair", selected, previewItems);
  const clothing = partDesign("clothing", selected, previewItems);
  const parts = {
    body: body?.id,
    face: face?.id,
    hair: hair?.id,
    facialHair: facialHair?.id,
    clothing: clothing?.id,
  };
  const hasDefault = Boolean(body || face);

  return <section className="flex min-w-0 flex-col items-center gap-1" aria-label="Live character preview">
    <div className="flex min-h-36 w-full min-w-0 max-w-[208px] items-center justify-center [&>svg]:h-auto [&>svg]:max-w-full [&>svg]:w-full">
      {hasDefault ? <CharacterComposite look={{ ...DEFAULT_LOOK, parts }} designs={previewItems} size={size} showPlanet={false} animate={false} animationFrame={shownFrame} /> :
        <p className="max-w-32 text-center text-[11px] text-slate-500">Default body item not found.</p>}
    </div>
    <div className="flex w-full justify-end">
      <button type="button" title={playing ? "Pause preview" : `Preview all ${frames.length} frames`} aria-label={playing ? "Pause preview" : `Preview all ${frames.length} frames`}
        onClick={() => { if (!playing) setPreviewFrame(activeFrame); setPlaying(value => !value); }} className="grid size-8 shrink-0 place-items-center rounded border border-cyan-700 text-cyan-200">
        {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
      </button>
    </div>
    <div className="grid w-full grid-cols-[minmax(0,1fr)_36px] items-center gap-1.5">
      <IdleAnimationFrameSelector activeFrame={activeFrame} frameCount={frames.length} onSelect={onSelectFrame}
        onAdd={() => { setPlaying(false); setPreviewFrame(activeFrame + 1); onAddFrame(); }}
        onDelete={() => { setPlaying(false); setPreviewFrame(Math.min(activeFrame, frames.length - 2)); onDeleteFrame(); }} />
      <IdleSaveFramesButton saving={saving} onSave={onSave} />
    </div>
  </section>;
}
