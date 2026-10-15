"use client";

import type { CharacterLook } from "@/lib/game-types";
import type { PlayDesign } from "@/components/usePlayDesigns";
import useIdleAnimationFrame from "@/components/useIdleAnimationFrame";
import { getCharacterDesignSlot } from "@/lib/character-design-defaults";

type Props = {
  look: CharacterLook;
  designs: PlayDesign[];
  size?: number;
};

const categories = ["body", "face", "facial-hair", "clothing", "hair", "hat"];

function getCategory(type: string) {
  const slot = getCharacterDesignSlot(type);
  return slot === "facialHair" ? "facial-hair" : slot || type.toLowerCase().replace(/-back$/, "");
}

export default function GameCharacter({ look, designs, size = 64 }: Props) {
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
    if ((category === "body" || category === "face") && parts[key as keyof typeof parts] !== null) {
      return designs.find(d =>
        getCategory(d.design_type) === category &&
        !d.design_type.toLowerCase().endsWith("-back")
      );
    }
    return undefined;
  }).filter((d): d is PlayDesign => Boolean(d));
  const frameIndex = useIdleAnimationFrame(selected.some(design =>
    (getCategory(design.design_type) === "body" || getCategory(design.design_type) === "face") && design.idle_frames?.length === 3
  ));

  if (!selected.length) return null;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated", display: "block" }}
    >
      {selected.map(design => {
        const framePixels = frameIndex === undefined || (getCategory(design.design_type) !== "body" && getCategory(design.design_type) !== "face")
          ? undefined
          : design.idle_frames?.[frameIndex]?.pixelData;
        return (
        <g
          key={design.id}
          transform={`translate(${design.position_x || 0} ${design.position_y || 0})`}
        >
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
