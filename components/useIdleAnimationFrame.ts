"use client";

import { useEffect, useState } from "react";

export default function useIdleAnimationFrame(enabled: boolean, intervalMs = 420): number | undefined {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => setFrame(current => (current + 1) % 3), intervalMs);
    return () => window.clearInterval(timer);
  }, [enabled, intervalMs]);

  return enabled ? frame : undefined;
}