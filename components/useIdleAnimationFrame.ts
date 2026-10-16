"use client";

import { useEffect, useState } from "react";

export default function useIdleAnimationFrame(enabled: boolean, intervalMs = 420, frameCount = 3): number | undefined {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!enabled || frameCount < 1) return;
    const timer = window.setInterval(() => setFrame(current => (current + 1) % frameCount), intervalMs);
    return () => window.clearInterval(timer);
  }, [enabled, intervalMs, frameCount]);

  return enabled && frameCount > 0 ? frame % frameCount : undefined;
}