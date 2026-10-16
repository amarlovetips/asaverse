import type { CharacterPartDesigns } from "@/lib/game-types";

export type CharacterDesignSlot = keyof CharacterPartDesigns;
export const CHARACTER_VISIBILITY_SLOTS = ["face", "body", "clothing", "hair", "facialHair"] as const;
export type CharacterVisibilitySlot = typeof CHARACTER_VISIBILITY_SLOTS[number];
export type CharacterLayerVisibility = Record<CharacterVisibilitySlot, boolean>;

export function getCharacterDesignSlot(type: string): CharacterDesignSlot | null {
  const normalized = type.toLowerCase().replace(/-back$/, "").replace(/[_ ]/g, "-");
  if (/facial-?hair|beard|mustache/.test(normalized)) return "facialHair";
  if (/hat|headwear|helmet/.test(normalized)) return "hat";
  if (/hair/.test(normalized)) return "hair";
  if (/face|head/.test(normalized)) return "face";
  if (/cloth|outfit|suit|dress/.test(normalized)) return "clothing";
  if (/body|base/.test(normalized)) return "body";
  return null;
}

export function getDefaultCharacterParts<T extends {
  id: string;
  design_type: string;
  is_default_base?: boolean | null;
}>(designs: readonly T[]): CharacterPartDesigns {
  const defaults: CharacterPartDesigns = {
    body: null,
    face: null,
    clothing: null,
    facialHair: null,
    hair: null,
    hat: null,
  };
  for (const design of designs) {
    if (!design.is_default_base || design.design_type.toLowerCase().endsWith("-back")) continue;
    const slot = getCharacterDesignSlot(design.design_type);
    if (slot && !defaults[slot]) defaults[slot] = design.id;
  }
  return defaults;
}
