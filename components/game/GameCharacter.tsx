"use client";

import type { CharacterLook } from "@/lib/game-types";
import type { PlayDesign } from "@/components/usePlayDesigns";
import useIdleAnimationFrame from "@/components/useIdleAnimationFrame";
import { getCharacterDesignSlot } from "@/lib/character-design-defaults";
import { getWalkingFrameDurationMs, type WalkDirection } from "@/lib/character-design-json";
import useWalkingAnimationFrame from "@/components/useWalkingAnimationFrame";
import { composeWalkingFrame } from "@/lib/character-design-json";

type Props = {
  look: CharacterLook;
  designs: PlayDesign[];
  size?: number;
  movement?: { moving: boolean; direction: WalkDirection };
};

const categories = ["body", "face", "facial-hair", "clothing", "hair", "hat"];

function getCategory(type: string) {
  const slot = getCharacterDesignSlot(type);
  return slot === "facialHair" ? "facial-hair" : slot || type.toLowerCase().replace(/-back$/, "");
}

export default function GameCharacter({ look, designs, size = 64, movement }: Props) {
  const parts = look.parts || {};
  const side = movement?.direction.startsWith("north") ? "back" : "front";
  const selected = categories.map(category => {
    const key = category === "facial-hair" ? "facialHair" : category;
    const id = parts[key as keyof typeof parts];
    const chosen = designs.find(d =>
      d.id === id &&
      getCategory(d.design_type) === category &&
      isSide(d, side)
    );
    if (chosen) return chosen;
    const frontDesign = designs.find(d => d.id === id && getCategory(d.design_type) === category);
    if (side === "back" && frontDesign) {
      const counterpart = designs.find(d => getCategory(d.design_type) === category && isSide(d, "back") && d.design_name === frontDesign.design_name);
      if (counterpart) return counterpart;
      if (Object.keys(frontDesign.back_pixel_data || {}).length) return {
        ...frontDesign, design_type: `${frontDesign.design_type.replace(/-back$/i, "")}-back`,
        pixel_data: frontDesign.back_pixel_data || {}, idle_frames: frontDesign.back_idle_frames,
        walking_animation: frontDesign.back_walking_animation,
      };
    }
    if ((category === "body" || category === "face") && parts[key as keyof typeof parts] !== null) {
      return designs.find(d =>
        getCategory(d.design_type) === category &&
        isSide(d, side) && d.is_default_base
      ) || designs.find(d => getCategory(d.design_type) === category && isSide(d, side)) ||
        (side === "back" ? frontDesign : undefined);
    }
    if (side === "back" && frontDesign) return frontDesign;
    return undefined;
  }).filter((d): d is PlayDesign => Boolean(d));
  const idleCount = Math.max(0, ...selected.map(d => d.idle_frames?.length || 0));
  const walkingParts = selected.filter(design => {
    const category = getCategory(design.design_type);
    const walk = design.walking_animation;
    return (category === "body" || category === "clothing") &&
      Boolean(walk?.frames.length && walk.directions.includes(movement?.direction || "south"));
  });
  const walkCount = Math.max(0, ...walkingParts.map(design => design.walking_animation?.frames.length || 0));
  const frameIndex = useIdleAnimationFrame(idleCount > 0 && (!movement?.moving || walkCount === 0), 420, idleCount);
  const walkDuration = getWalkingFrameDurationMs(movement?.direction,
    walkingParts.find(design => getCategory(design.design_type) === "body")?.walking_animation,
    walkingParts.find(design => getCategory(design.design_type) === "clothing")?.walking_animation);
  const walkFrameIndex = useWalkingAnimationFrame(Boolean(movement?.moving && walkCount), walkCount, walkDuration);

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
        const category = getCategory(design.design_type);
        const walking = movement?.moving && (category === "body" || category === "clothing") && design.walking_animation?.directions.includes(movement.direction);
        const walk = design.walking_animation;
        const walkFrame = walk?.frames[walkFrameIndex % (walk.frames.length || 1)];
        const baseIndex = walking && walk?.basePose === "idle-cycle" ? walkFrameIndex : frameIndex;
        const baseFrame = design.idle_frames?.length ? design.idle_frames[Number(baseIndex || 0) % design.idle_frames.length]?.pixelData : design.pixel_data;
        const synchronizedIdleFrame = movement?.moving && walkCount > 0 ? walkFrameIndex : frameIndex;
        const framePixels = walking && walkFrame
          ? composeWalkingFrame(baseFrame || {}, walkFrame, walk?.basePose)
          : synchronizedIdleFrame === undefined || (category !== "body" && category !== "face" && category !== "hair" && category !== "facial-hair" && category !== "clothing") ? undefined
            : design.idle_frames?.length ? design.idle_frames[synchronizedIdleFrame % design.idle_frames.length]?.pixelData : undefined;
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

function isSide(design: PlayDesign, side: "front" | "back") {
  return design.design_type.toLowerCase().endsWith("-back") === (side === "back");
}
