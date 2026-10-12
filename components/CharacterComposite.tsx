"use client";

import type { CharacterLook } from "@/lib/game-types";
import type { PlayDesign } from "./usePlayDesigns";

type Props = {
  look: CharacterLook;
  designs: PlayDesign[];
  size?: number;
  showPlanet?: boolean;
};

const categories = ["body", "face", "facial-hair", "clothing", "hair"];

function getCategory(type: string) {
  const t = type.toLowerCase().replace(/-back$/, "");
  if (/facial[-_ ]?hair|beard|mustache/.test(t)) return "facial-hair";
  if (/hair/.test(t)) return "hair";
  if (/face|head/.test(t)) return "face";
  if (/cloth|outfit|suit|dress|clothing/.test(t)) return "clothing";
  if (/body|base/.test(t)) return "body";
  return t;
}

export default function CharacterComposite({ look, designs, size = 300, showPlanet = true }: Props) {
  const parts = look.parts || {};
  const selected = categories.map(category => {
    const key = category === "facial-hair" ? "facialHair" : category;
    const id = parts[key as keyof typeof parts];
    const chosen = designs.find(d =>
      d.id === id &&
      getCategory(d.design_type) === category &&
      !d.design_type.toLowerCase().endsWith("-back")
    );
    if (chosen) return chosen;
    if (category === "face" || category === "body")
      return designs.find(d =>
        getCategory(d.design_type) === category &&
        !d.design_type.toLowerCase().endsWith("-back")
      );
    return undefined;
  }).filter((d): d is PlayDesign => Boolean(d));

  if (!selected.length) return null;

  return (
    <svg
      viewBox="8 0 48 64"
      width={size}
      height={size}
      role="img"
      aria-label="Pixel character standing on a space planet"
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated", display: "block", flexShrink: 0 }}
    >
      {showPlanet && (
        <g>
          <rect x="20" y="54" width="24" height="3" fill="#9ca3af" />
          <rect x="22" y="51" width="20" height="3" fill="#ffffff" />
          <rect x="25" y="54" width="14" height="3" fill="#e5e7eb" />
          <rect x="27" y="51" width="10" height="3" fill="#ffffff" />
          <rect x="24" y="57" width="16" height="3" fill="#64748b" />
          <rect x="25" y="60" width="14" height="3" fill="#334155" />
          <rect x="29" y="63" width="6" height="3" fill="#1e293b" />
          <rect x="17" y="51" width="3" height="3" fill="#ffffff" />
          <rect x="44" y="51" width="3" height="3" fill="#ffffff" />
          <rect x="20" y="54" width="2" height="3" fill="#38bdf8" />
          <rect x="42" y="54" width="2" height="3" fill="#38bdf8" />
        </g>
      )}

      {selected.map(design => (
        <g key={design.id} transform={`translate(${design.position_x || 0} ${((design.position_y || 0) - 1)})`}>
          {Object.entries(design.pixel_data || {}).map(([point, color]) => {
            const [x, y] = point.split(",").map(Number);
            if (
              !Number.isInteger(x) || !Number.isInteger(y) ||
              x < 0 || x >= 64 || y < 0 || y >= 64 ||
              !/^#[0-9a-f]{6}$/i.test(color)
            ) return null;
            return <rect key={point} x={x} y={y} width="1" height="1" fill={color} />;
          })}
        </g>
      ))}

      <g fill="#ffffff">
        <rect x="7" y="12" width="2" height="2" />
        <rect x="51" y="19" width="2" height="2" />
        <rect x="46" y="7" width="2" height="2" />
        <rect x="13" y="30" width="2" height="2" />
      </g>
      <g fill="#38bdf8">
        <rect x="54" y="35" width="2" height="2" />
        <rect x="5" y="43" width="2" height="2" />
      </g>
    </svg>
  );
}
