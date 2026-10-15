import type { CharacterItem } from "./types";

export const idlePartGroups = [
  { id: "body", label: "Body", slots: ["body"] },
  { id: "head", label: "Head & face", slots: ["face", "hair", "facialHair"] },
  { id: "clothing", label: "Clothing & extras", slots: ["clothing"] },
] as const;

export type IdlePartSlot = typeof idlePartGroups[number]["slots"][number];

export function getIdlePartSlot(item: CharacterItem): IdlePartSlot | null {
  const type = item.design_type.toLowerCase().replace(/-back$/, "");
  if (/facial[-_ ]?hair|beard|mustache/.test(type)) return "facialHair";
  if (/hair/.test(type)) return "hair";
  if (/face|head/.test(type)) return "face";
  if (/cloth|outfit|suit|dress|clothing/.test(type)) return "clothing";
  if (/body|base/.test(type)) return "body";
  return null;
}
