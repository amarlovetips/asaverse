"use client";
import { useEffect, useState } from "react";
import { DEFAULT_WALK_FRAME_DURATION_MS } from "@/lib/character-design-json";
export default function useWalkingAnimationFrame(enabled: boolean, frameCount: number, frameDurationMs = DEFAULT_WALK_FRAME_DURATION_MS) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!enabled || frameCount < 1) return;
    const timer = window.setInterval(() => setFrame(value => (value + 1) % frameCount), frameDurationMs);
    return () => window.clearInterval(timer);
  }, [enabled, frameCount, frameDurationMs]);
  return frameCount > 0 ? frame % frameCount : 0;
}
