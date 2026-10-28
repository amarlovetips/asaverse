"use client";

import { useEffect, useRef, useState } from "react";
import GameCharacter from "@/components/game/GameCharacter";
import { usePlayDesigns } from "@/components/usePlayDesigns";
import { DEFAULT_LOOK, type CharacterLook } from "@/lib/game-types";
import { drawWorld, WORLD_SIZE } from "@/lib/world-map";
import type { WalkDirection } from "@/lib/character-design-json";
import { getDefaultMap, type SavedMapData } from "@/components/admin/map/lib/saveLoad";
import { fetchAllMapAssets, type AssetRecord } from "@/components/admin/map/lib/supabaseAssets";
import {
  buildWorldCollision,
  checkObstacleCollision,
  renderSavedMapToWorld,
  type ActiveGameWorld,
} from "@/lib/world-collision";

type Hero = {
  character_name: string;
  level: number;
  xp: number;
  appearance: CharacterLook;
};

type EnemyState = {
  x: number;
  y: number;
  home_x: number;
  home_y: number;
  hp: number;
  name: string;
};

export default function WorldScene({ onReady }: { onReady?: () => void }) {
  const [hero, setHero] = useState<Hero | null>(null);
  const { designs } = usePlayDesigns();
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [movement, setMovement] = useState<{ moving: boolean; direction: WalkDirection }>({
    moving: false,
    direction: "south",
  });
  const [worldDrawn, setWorldDrawn] = useState(false);
  const [imageLoaded] = useState(true);

  // Runtime Active Map & Collision
  const [activeMap, setActiveMap] = useState<SavedMapData | null>(null);
  const [assetMap, setAssetMap] = useState<Map<string, AssetRecord>>(new Map());
  const worldRef = useRef<ActiveGameWorld | null>(null);
  const enemyRef = useRef<EnemyState>({
    x: 3200,
    y: 3200,
    home_x: 3200,
    home_y: 3200,
    hp: 100,
    name: "Forest Slime",
  });

  const canvas = useRef<HTMLCanvasElement>(null);
  const sprite = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const startedAt = useRef(0);
  const ready = useRef(false);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  // Load Hero from local storage
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

  // Load Active Default Map and Assets
  useEffect(() => {
    let live = true;
    async function loadActiveMapAndAssets() {
      try {
        const [defaultMap, loadedAssets] = await Promise.all([
          getDefaultMap(),
          fetchAllMapAssets(true),
        ]);

        if (!live) return;

        const aMap = new Map<string, AssetRecord>();
        for (const a of loadedAssets) {
          aMap.set(a.id, a);
        }
        setAssetMap(aMap);
        setActiveMap(defaultMap);

        const worldGeom = buildWorldCollision(defaultMap, aMap);
        worldRef.current = worldGeom;

        // Position enemy at configured spawn
        enemyRef.current.x = worldGeom.enemySpawn.x;
        enemyRef.current.y = worldGeom.enemySpawn.y;
        enemyRef.current.home_x = worldGeom.enemySpawn.home_x;
        enemyRef.current.home_y = worldGeom.enemySpawn.home_y;
      } catch (err) {
        console.warn("Failed to load active default map:", err);
      }
    }

    void loadActiveMapAndAssets();
    return () => {
      live = false;
    };
  }, []);

  // Main Game Loop & Rendering
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

      // Player Movement with Collision Validation
      const speed = 220;
      const stepX = (dx / length) * speed * dt;
      const stepY = (dy / length) * speed * dt;

      const obstacles = worldRef.current?.obstacles || [];

      // Test X-axis movement
      const nextX = Math.max(25, Math.min(WORLD_SIZE - 25, x + stepX));
      if (!checkObstacleCollision(nextX, y, 16, obstacles)) {
        x = nextX;
      }

      // Test Y-axis movement
      const nextY = Math.max(25, Math.min(WORLD_SIZE - 25, y + stepY));
      if (!checkObstacleCollision(x, nextY, 16, obstacles)) {
        y = nextY;
      }

      // Enemy Patrol & Movement (respects blocked collision obstacles)
      const enemy = enemyRef.current;
      const distToPlayer = Math.hypot(x - enemy.x, y - enemy.y);
      let enemyTargetX = enemy.home_x;
      let enemyTargetY = enemy.home_y;

      // Aggro if player is within 300px
      if (distToPlayer < 300 && distToPlayer > 35) {
        enemyTargetX = x;
        enemyTargetY = y;
      }

      const eDx = enemyTargetX - enemy.x;
      const eDy = enemyTargetY - enemy.y;
      const eDist = Math.hypot(eDx, eDy);
      if (eDist > 2) {
        const eSpeed = 90;
        const eStepX = (eDx / eDist) * eSpeed * dt;
        const eStepY = (eDy / eDist) * eSpeed * dt;

        // Enemy collision check: Must NOT move through blocked areas (Task 5)
        const nextEnemyX = enemy.x + eStepX;
        if (!checkObstacleCollision(nextEnemyX, enemy.y, 14, obstacles)) {
          enemy.x = nextEnemyX;
        }
        const nextEnemyY = enemy.y + eStepY;
        if (!checkObstacleCollision(enemy.x, nextEnemyY, 14, obstacles)) {
          enemy.y = nextEnemyY;
        }
      }

      // Draw World Base Terrain
      const camera = drawWorld(context, window.innerWidth, window.innerHeight, x, y);

      // Render Saved Map Ground Layers (Walkable grass, soil, water, terrain under everyone)
      if (activeMap) {
        renderSavedMapToWorld(context, activeMap, assetMap, camera, { scope: "ground" });
      }

      // Render Objects behind the enemy (enemy appears in front of them)
      if (activeMap) {
        renderSavedMapToWorld(context, activeMap, assetMap, camera, {
          scope: "objects",
          characterY: enemy.y,
          depthPass: "behind_character",
        });
      }

      // Render Enemy
      const enemyScreenX = enemy.x - camera.x;
      const enemyScreenY = enemy.y - camera.y;
      if (
        enemyScreenX > -50 &&
        enemyScreenX < window.innerWidth + 50 &&
        enemyScreenY > -50 &&
        enemyScreenY < window.innerHeight + 50
      ) {
        context.save();
        // Slime body shadow
        context.fillStyle = "rgba(0,0,0,0.3)";
        context.beginPath();
        context.ellipse(enemyScreenX, enemyScreenY + 12, 14, 6, 0, 0, Math.PI * 2);
        context.fill();

        // Slime body
        context.fillStyle = "#ef4444";
        context.beginPath();
        context.arc(enemyScreenX, enemyScreenY, 14, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#fca5a5";
        context.beginPath();
        context.arc(enemyScreenX - 4, enemyScreenY - 4, 4, 0, Math.PI * 2);
        context.fill();

        // Enemy Name
        context.fillStyle = "#ffffff";
        context.font = "bold 10px sans-serif";
        context.textAlign = "center";
        context.fillText(enemy.name, enemyScreenX, enemyScreenY - 18);
        context.restore();
      }

      // Render Objects in front of the enemy (occlusion depth: canopies/structures covering enemy)
      if (activeMap) {
        renderSavedMapToWorld(context, activeMap, assetMap, camera, {
          scope: "objects",
          characterY: enemy.y,
          depthPass: "front_of_character",
        });
      }

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
  }, [activeMap, assetMap]);

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
            look={{ ...DEFAULT_LOOK, ...hero.appearance }}
            designs={designs}
            size={220}
            movement={movement}
          />
        )}
      </div>
    </main>
  );
}

function walkDirection(dx: number, dy: number): WalkDirection {
  const x = Math.sign(dx);
  const y = Math.sign(dy);
  if (y < 0) return x < 0 ? "north-west" : x > 0 ? "north-east" : "north";
  if (y > 0) return x < 0 ? "south-west" : x > 0 ? "south-east" : "south";
  return x < 0 ? "west" : x > 0 ? "east" : "south";
}
