"use client";
import type { Layer } from "./useCharacterLayers";

type Props = {
  layers: Layer[];
  size?: number;
  side?: "front" | "back";
  hiddenTypes?: string[];
};

function category(type: string) {
  const t = type.toLowerCase().replace(/-back$/, "");
  if (/facial[-_ ]?hair|beard|mustache/.test(t)) return "facial-hair";
  if (/hair/.test(t)) return "hair";
  if (/face|head/.test(t)) return "face";
  if (/cloth|outfit|suit|dress|clothing/.test(t)) return "clothing";
  if (/body|base/.test(t)) return "body";
  return t;
}

export default function CharacterPreview({
  layers, size = 64, side = "front", hiddenTypes = []
}: Props) {
  const pixels: Record<string, string> = {};
  layers.filter(l => {
    const back = l.design_type.toLowerCase().endsWith("-back");
    return (side === "back") === back &&
      !hiddenTypes.includes(category(l.design_type));
  }).forEach(l => Object.entries(l.pixel_data || {}).forEach(([k, c]) => {
    const [x, y] = k.split(",").map(Number), px = x + l.x, py = y + l.y;
    if (px >= 0 && py >= 0 && px < size && py < size)
      pixels[`${px},${py}`] = c;
  }));

  return <div className="grid aspect-square w-full max-w-64 overflow-hidden border border-slate-600"
    style={{ gridTemplateColumns: `repeat(${size},minmax(0,1fr))`,
      backgroundColor: "#18212c",
      backgroundImage: "linear-gradient(45deg,#293543 25%,transparent 25%,transparent 75%,#293543 75%),linear-gradient(45deg,#293543 25%,#18212c 25%,#18212c 75%,#293543 75%)",
      backgroundSize: "16px 16px", backgroundPosition: "0 0,8px 8px" }}>
    {Array.from({ length: size * size }, (_, i) =>
      <div key={i} style={{ background: pixels[`${i % size},${Math.floor(i / size)}`] || "transparent" }} />
    )}
  </div>;
}




