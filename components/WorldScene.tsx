"use client";

import { useEffect, useRef, useState } from "react";
import GameCharacter from "@/components/game/GameCharacter";
import { usePlayDesigns } from "@/components/usePlayDesigns";
import { DEFAULT_LOOK, type CharacterLook } from "@/lib/game-types";
import { drawWorld, WORLD_SIZE } from "@/lib/world-map";
import type { WalkDirection } from "@/lib/character-design-json";

type Hero = {
  character_name: string;
  level: number;
  xp: number;
  appearance: CharacterLook;
};

export default function WorldScene({ onReady }: { onReady?: () => void }) {
  const [hero, setHero] = useState<Hero | null>(null);
  const { designs } = usePlayDesigns();
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [movement, setMovement] = useState<{ moving: boolean; direction: WalkDirection }>({ moving: false, direction: "south" });
  const [worldDrawn, setWorldDrawn] = useState(false);
  const [imageLoaded] = useState(true);

  const canvas = useRef<HTMLCanvasElement>(null);
  const sprite = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const startedAt = useRef(0);
  const ready = useRef(false);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem("asaverse.selectedCharacter");
        if (raw) setHero(JSON.parse(raw) as Hero);
      } catch {
        setHero(null);
      }
      setHeroLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    startedAt.current = Date.now();

    const node = canvas.current;
    const context = node?.getContext("2d");
    if (!node || !context) return;

    let x = WORLD_SIZE / 2;
    let y = WORLD_SIZE / 2;
    let last = 0;
    let frame = 0;
    let firstFrame = true;
    let previousMotion = "";
    let facing: WalkDirection = "south";
    let dpr = 1;

    const keys = new Set<string>();

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      node.width = window.innerWidth * dpr;
      node.height = window.innerHeight * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
        keys.add(key);
      }
    };

    const up = (event: KeyboardEvent) => {
      keys.delete(event.key.toLowerCase());
    };

    const tick = (time: number) => {
      const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
      last = time;

      const dx =
        Number(keys.has("d") || keys.has("arrowright")) -
        Number(keys.has("a") || keys.has("arrowleft"));
      const dy =
        Number(keys.has("s") || keys.has("arrowdown")) -
        Number(keys.has("w") || keys.has("arrowup"));
      if (dx || dy) facing = walkDirection(dx, dy);
      const moving = dx !== 0 || dy !== 0;
      const motion = `${moving}:${facing}`;
      if (motion !== previousMotion) {
        previousMotion = motion;
        setMovement({ moving, direction: facing });
      }
      const length = Math.hypot(dx, dy) || 1;

      x = Math.max(25, Math.min(WORLD_SIZE - 25, x + (dx / length) * 220 * dt));
      y = Math.max(25, Math.min(WORLD_SIZE - 25, y + (dy / length) * 220 * dt));

      const camera = drawWorld(context, window.innerWidth, window.innerHeight, x, y);

      if (firstFrame) {
        firstFrame = false;
        setWorldDrawn(true);
      }

      if (sprite.current) {
        sprite.current.style.left = `${x - camera.x}px`;
        sprite.current.style.top = `${y - camera.y}px`;
      }

      frame = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    if (!heroLoaded || !worldDrawn || (hero !== null && !imageLoaded) || ready.current) {
      return;
    }

    const delay = Math.max(0, 1000 - (Date.now() - startedAt.current));

    const timer = window.setTimeout(() => {
      if (ready.current) return;
      ready.current = true;
      onReadyRef.current?.();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [heroLoaded, worldDrawn, hero, imageLoaded]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#07131a]">
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />

      <div
        ref={sprite}
        className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
      >
        {hero && (
          <GameCharacter
            look={{ ...DEFAULT_LOOK, ...hero.appearance }} designs={designs} size={220} movement={movement}

          />
        )}
      </div>
    </main>
  );
}

function walkDirection(dx: number, dy: number): WalkDirection {
  const x = Math.sign(dx), y = Math.sign(dy);
  if (y < 0) return x < 0 ? "north-west" : x > 0 ? "north-east" : "north";
  if (y > 0) return x < 0 ? "south-west" : x > 0 ? "south-east" : "south";
  return x < 0 ? "west" : x > 0 ? "east" : "south";
}
