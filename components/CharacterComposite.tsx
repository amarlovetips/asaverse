"use client";

import type { CharacterLook } from "@/lib/game-types";
import type { PlayDesign } from "./usePlayDesigns";
import useIdleAnimationFrame from "./useIdleAnimationFrame";
import { getCharacterDesignSlot } from "@/lib/character-design-defaults";

type Props = {
  look: CharacterLook;
  designs: PlayDesign[];
  size?: number;
  showPlanet?: boolean;
  animate?: boolean;
  animationFrame?: number;
};

const categories = ["body", "face", "facial-hair", "clothing", "hair", "hat"];

function getCategory(type: string) {
  const slot = getCharacterDesignSlot(type);
  return slot === "facialHair" ? "facial-hair" : slot || type.toLowerCase().replace(/-back$/, "");
}

export default function CharacterComposite({ look, designs, size = 300, showPlanet = true, animate = true, animationFrame }: Props) {
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
    if ((category === "face" || category === "body") && parts[key as keyof typeof parts] !== null)
      return designs.find(d =>
        getCategory(d.design_type) === category &&
        !d.design_type.toLowerCase().endsWith("-back")
      );
    return undefined;
  }).filter((d): d is PlayDesign => Boolean(d));
  const autoFrame = useIdleAnimationFrame(animate && selected.some(design =>
    (getCategory(design.design_type) === "body" || getCategory(design.design_type) === "face") && design.idle_frames?.length === 3
  ));
  const displayedFrame = animationFrame ?? autoFrame;

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

      {selected.map(design => {
        const framePixels = displayedFrame === undefined || (getCategory(design.design_type) !== "body" && getCategory(design.design_type) !== "face")
          ? undefined
          : design.idle_frames?.[displayedFrame]?.pixelData;
        return (
        <g key={design.id} transform={`translate(${design.position_x || 0} ${((design.position_y || 0) - 1)})`}>
          {Object.entries(framePixels || design.pixel_data || {}).map(([point, color]) => {
            const [x, y] = point.split(",").map(Number);
            if (
              !Number.isInteger(x) || !Number.isInteger(y) ||
              x < 0 || x >= 64 || y < 0 || y >= 64 ||
              !/^#[0-9a-f]{6}$/i.test(color)
            ) return null;
            return <rect key={point} x={x} y={y} width="1" height="1" fill={color} />;
          })}
        </g>
        );
      })}
    </svg>
  );
}
