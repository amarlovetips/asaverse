"use client";

import type { CharacterLook } from "@/lib/game-types";
import type { PlayDesign } from "./usePlayDesigns";
import useIdleAnimationFrame from "./useIdleAnimationFrame";
import { getCharacterDesignSlot, type CharacterLayerVisibility } from "@/lib/character-design-defaults";
import { getWalkingFrameDurationMs, type WalkDirection } from "@/lib/character-design-json";
import useWalkingAnimationFrame from "./useWalkingAnimationFrame";
import { composeWalkingFrame } from "@/lib/character-design-json";

type Props = {
  look: CharacterLook;
  designs: PlayDesign[];
  size?: number;
  showPlanet?: boolean;
  animate?: boolean;
  animationFrame?: number;
  side?: "front" | "back";
  walkDirection?: WalkDirection;
  walkFrameIndex?: number;
  visibleLayers?: CharacterLayerVisibility;
};

const categories = ["body", "face", "facial-hair", "clothing", "hair", "hat"];

function getCategory(type: string) {
  const slot = getCharacterDesignSlot(type);
  return slot === "facialHair" ? "facial-hair" : slot || type.toLowerCase().replace(/-back$/, "");
}

function isSide(design: PlayDesign, side: "front" | "back") {
  return design.design_type.toLowerCase().endsWith("-back") === (side === "back");
}

export default function CharacterComposite({ look, designs, size = 300, showPlanet = true, animate = true, animationFrame, side = "front", walkDirection, walkFrameIndex, visibleLayers }: Props) {
  const parts = look.parts || {};
  const sideDesigns = side === "front" ? designs : designs.map(design => {
    if (isSide(design, "back") || !Object.keys(design.back_pixel_data || {}).length) return design;
    const hasPairedBack = designs.some(other => isSide(other, "back") &&
      getCategory(other.design_type) === getCategory(design.design_type) && other.design_name === design.design_name);
    if (hasPairedBack) return design;
    return {
      ...design, design_type: `${design.design_type.replace(/-back$/i, "")}-back`,
      pixel_data: design.back_pixel_data || {}, idle_frames: design.back_idle_frames,
      walking_animation: design.back_walking_animation,
    };
  });
  const selected = categories.map(category => {
    const key = category === "facial-hair" ? "facialHair" : category;
    const id = parts[key as keyof typeof parts];
    const chosen = sideDesigns.find(d =>
      d.id === id &&
      getCategory(d.design_type) === category &&
      isSide(d, side)
    );
    if (chosen) return chosen;
    const sideMatch = sideDesigns.find(d => getCategory(d.design_type) === category && isSide(d, side));
    if (sideMatch) return sideMatch;
    if (side === "back") {
      const frontFallback = designs.find(d => getCategory(d.design_type) === category && isSide(d, "front"));
      if (frontFallback) return frontFallback;
    }
    if ((category === "face" || category === "body") && parts[key as keyof typeof parts] !== null)
      return sideDesigns.find(d =>
        getCategory(d.design_type) === category &&
        isSide(d, side)
      );
    return undefined;
  }).filter((d): d is PlayDesign => Boolean(d))
    .filter(design => {
      const slot = getCharacterDesignSlot(design.design_type);
      return !visibleLayers || !slot || slot === "hat" || visibleLayers[slot];
    });
  const idleCount = Math.max(0, ...selected.map(d => d.idle_frames?.length || 0));
  const autoFrame = useIdleAnimationFrame(animate && idleCount > 0, 420, idleCount);
  const displayedFrame = animationFrame ?? autoFrame;
  const walkingParts = selected.filter(design => {
    const category = getCategory(design.design_type);
    return (category === "body" || category === "clothing") &&
      Boolean(walkDirection && design.walking_animation?.directions.includes(walkDirection));
  });
  const walkCount = Math.max(0, ...walkingParts.map(design => design.walking_animation?.frames.length || 0));
  const walkDuration = getWalkingFrameDurationMs(walkDirection,
    walkingParts.find(design => getCategory(design.design_type) === "body")?.walking_animation,
    walkingParts.find(design => getCategory(design.design_type) === "clothing")?.walking_animation);
  const currentWalkFrame = useWalkingAnimationFrame(Boolean(walkDirection && walkFrameIndex === undefined && walkCount), walkCount, walkDuration);
  const activeWalkFrame = walkFrameIndex ?? currentWalkFrame;

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
        const category = getCategory(design.design_type);
        const walking = (category === "body" || category === "clothing") && walkDirection && design.walking_animation?.directions.includes(walkDirection);
        const walk = design.walking_animation;
        const walkFrame = walk?.frames[activeWalkFrame % (walk.frames.length || 1)];
        const baseIndex = walking && walk?.basePose === "idle-cycle" ? activeWalkFrame : displayedFrame;
        const baseFrame = design.idle_frames?.length ? design.idle_frames[Number(baseIndex || 0) % design.idle_frames.length]?.pixelData : design.pixel_data;
        const synchronizedIdleFrame = walkDirection && walkingParts.length ? activeWalkFrame : displayedFrame;
        const framePixels = walking && walkFrame
          ? composeWalkingFrame(baseFrame || {}, walkFrame, walk?.basePose)
          : synchronizedIdleFrame === undefined || (category !== "body" && category !== "face" && category !== "hair" && category !== "facial-hair" && category !== "clothing") ? undefined
            : design.idle_frames?.length ? design.idle_frames[synchronizedIdleFrame % design.idle_frames.length]?.pixelData : undefined;
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
