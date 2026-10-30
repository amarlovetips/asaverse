"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAllMapAssets, type AssetRecord } from "./lib/supabaseAssets";
import { drawAssetToContext } from "./lib/assetRenderer";
import {
  saveMap,
  loadMap,
  type MapLayer,
  type PlacedAsset,
  type SavedMapData,
  type BlockedArea,
  type CollisionRect,
  type LayerGroupType,
  type CollisionMode,
  type BlockedShapeType,
  type ShapePoint,
  exportMapJson,
} from "./lib/saveLoad";
import AssetPickerModal from "./components/AssetPickerModal";
import LayersPanel from "./components/LayersPanel";
import SavedMapsModal from "./components/SavedMapsModal";

type ToolMode = "select" | "place" | "pan" | "block" | "spawn" | "delete";

const DEFAULT_LAYERS: MapLayer[] = [
  { id: "layer_ground", name: "Ground", visible: true, locked: false, order: 0, group: "ground" },
  { id: "layer_objects", name: "Buildings & Trees", visible: true, locked: false, order: 1, group: "objects" },
];

function createMapId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export default function MapToolsWorkspace({
  routeRemainder = [],
  initialTool,
}: {
  routeRemainder?: string[];
  initialTool?: ToolMode;
}) {
  // Map State
  const [mapId, setMapId] = useState<string>(createMapId);
  const [mapName, setMapName] = useState<string>("Untitled Map");
  const [mapCreatedAt, setMapCreatedAt] = useState<string>(() => new Date().toISOString());
  const [mapPublished, setMapPublished] = useState(false);
  const [mapDefault, setMapDefault] = useState(false);
  const [bounds, setBounds] = useState<{ width: number; height: number } | undefined>();
  const [layers, setLayers] = useState<MapLayer[]>(DEFAULT_LAYERS);
  const [activeLayerId, setActiveLayerId] = useState<string>("layer_ground");
  const [placements, setPlacements] = useState<PlacedAsset[]>([]);
  const [blockedAreas, setBlockedAreas] = useState<BlockedArea[]>([]);
  const [enemySpawn, setEnemySpawn] = useState<{ x: number; y: number; home_x?: number; home_y?: number }>({
    x: 3200,
    y: 3200,
    home_x: 3200,
    home_y: 3200,
  });

  // Selection & Placement State
  const [toolMode, setToolMode] = useState<ToolMode>(initialTool || "place");
  const [activeAsset, setActiveAsset] = useState<AssetRecord | null>(null);
  const [selectedPlacementIds, setSelectedPlacementIds] = useState<string[]>([]);
  // Legacy / primary selected ID for quick reference
  const selectedPlacementId = selectedPlacementIds[selectedPlacementIds.length - 1] || null;
  const setSelectedPlacementId = (id: string | null) => {
    setSelectedPlacementIds(id ? [id] : []);
  };
  const [selectedBlockedId, setSelectedBlockedId] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [proportionalScale, setProportionalScale] = useState<boolean>(true);
  const [blockedShapeMode, setBlockedShapeMode] = useState<BlockedShapeType>("rectangle");
  const [polygonPoints, setPolygonPoints] = useState<ShapePoint[]>([]);

  // Marquee Drag Box State
  const [marqueeBox, setMarqueeBox] = useState<{ startX: number; startY: number; curX: number; curY: number } | null>(null);
  const isMarqueeActive = useRef<boolean>(false);
  const marqueeStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Asset Library State
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [assetsLoading, setAssetsLoading] = useState<boolean>(true);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState<boolean>(false);
  const [isSavedMapsOpen, setIsSavedMapsOpen] = useState<boolean>(false);
  const [isReplacingPlacement, setIsReplacingPlacement] = useState<boolean>(false);

  // Persistence State
  const [saveStatus, setSaveStatus] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Camera / Viewport Navigation State
  const [camera, setCamera] = useState<{ x: number; y: number; zoom: number }>({
    x: 0,
    y: 0,
    zoom: 2, // 2x default for pixel art
  });

  // Pointer & Drag Interaction Ref State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseWorldPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanning = useRef<boolean>(false);
  const panStart = useRef<{ clientX: number; clientY: number; camX: number; camY: number }>({
    clientX: 0,
    clientY: 0,
    camX: 0,
    camY: 0,
  });
  const isDraggingPlacement = useRef<boolean>(false);
  const dragPlacementOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const isDrawingBlocked = useRef<boolean>(false);
  const blockedBoxStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Keyboard Space for pan state
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const spacePressed = useRef<boolean>(false);

  // Asset Map for fast lookup
  const assetMap = useMemo(() => {
    const map = new Map<string, AssetRecord>();
    for (const a of assets) map.set(a.id, a);
    return map;
  }, [assets]);

  // Load assets from Supabase
  const loadAssets = useCallback(async () => {
    setAssetsLoading(true);
    setAssetsError(null);
    try {
      const items = await fetchAllMapAssets();
      setAssets(items);
      setActiveAsset((prev) => prev ?? (items.length > 0 ? items[0] : null));
    } catch (err) {
      setAssetsError(err instanceof Error ? err.message : "Failed to load assets");
    } finally {
      setAssetsLoading(false);
    }
  }, []);

  useEffect(() => {
    let live = true;
    async function init() {
      try {
        const items = await fetchAllMapAssets();
        if (live) {
          setAssets(items);
          setActiveAsset((prev) => prev ?? (items.length > 0 ? items[0] : null));
        }
      } catch (err) {
        if (live) {
          setAssetsError(err instanceof Error ? err.message : "Failed to load assets");
        }
      } finally {
        if (live) setAssetsLoading(false);
      }
    }
    void init();
    return () => {
      live = false;
    };
  }, []);

  // Pre-load map if routeRemainder contains a map ID (e.g., from Map Editor Edit action)
  useEffect(() => {
    const targetMapId = routeRemainder[0] && routeRemainder[0] !== "new" ? decodeURIComponent(routeRemainder[0]) : null;
    if (!targetMapId) return;

    let live = true;
    async function loadTarget() {
      const data = await loadMap(targetMapId!);
      if (live && data) {
        setMapId(data.id);
        setMapName(data.name || "Untitled Map");
        setMapCreatedAt(data.created_at);
        setMapPublished(data.is_published ?? false);
        setMapDefault(data.is_default ?? false);
        setBounds(data.bounds);
        setLayers(data.layers?.length ? data.layers : DEFAULT_LAYERS);
        setActiveLayerId(data.layers?.[0]?.id || "layer_ground");
        setPlacements(data.placements || []);
        setBlockedAreas(data.blockedAreas || []);
        setEnemySpawn(data.enemySpawn || { x: 3200, y: 3200, home_x: 3200, home_y: 3200 });
        setCamera(data.camera || { x: 0, y: 0, zoom: 2 });
        setSaveStatus({ message: `Loaded map "${data.name}" for editing`, type: "success" });
        setTimeout(() => setSaveStatus(null), 3000);
      }
    }
    void loadTarget();
    return () => {
      live = false;
    };
  }, [routeRemainder]);

  // Convert Client / Screen Coords to World Coords
  const screenToWorld = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;
      const worldX = (screenX - rect.width / 2) / camera.zoom + camera.x;
      const worldY = (screenY - rect.height / 2) / camera.zoom + camera.y;
      return { x: worldX, y: worldY };
    },
    [camera]
  );

  // Snapping helper: supports snapping adjacent to existing tiles and snap-to-grid
  // Never distorts or overrides tile dimensions w and h.
  const snapCoords = useCallback(
    (
      worldX: number,
      worldY: number,
      w: number,
      h: number,
      ignorePlacementId?: string | null
    ): { x: number; y: number } => {
      let x = Math.round(worldX);
      let y = Math.round(worldY);

      if (!snapToGrid) return { x, y };

      // Snap to neighbor placed assets (magnetic edges) so tiles of any dimensions (16x16, 15x15, 12x12, 10x10, etc.)
      // touch each other at exact pixel integer boundaries with ZERO gap.
      // Search distance threshold: 10 world units
      const threshold = 10;
      let closestSnapX: number | null = null;
      let minDiffX = threshold;
      let closestSnapY: number | null = null;
      let minDiffY = threshold;

      for (const p of placements) {
        if (ignorePlacementId && p.id === ignorePlacementId) continue;

        // X magnetic alignments:
        // 1. Right edge of p touches left edge of current tile: candidate X = p.x + p.width
        const candRight = p.x + p.width;
        const diffRight = Math.abs(x - candRight);
        if (diffRight < minDiffX) {
          minDiffX = diffRight;
          closestSnapX = candRight;
        }

        // 2. Left edge of p touches right edge of current tile: candidate X = p.x - w
        const candLeft = p.x - w;
        const diffLeft = Math.abs(x - candLeft);
        if (diffLeft < minDiffX) {
          minDiffX = diffLeft;
          closestSnapX = candLeft;
        }

        // 3. Flush left edges: candidate X = p.x
        const candFlushLeft = p.x;
        const diffFlushLeft = Math.abs(x - candFlushLeft);
        if (diffFlushLeft < minDiffX) {
          minDiffX = diffFlushLeft;
          closestSnapX = candFlushLeft;
        }

        // 4. Flush right edges: candidate X = p.x + p.width - w
        const candFlushRight = p.x + p.width - w;
        const diffFlushRight = Math.abs(x - candFlushRight);
        if (diffFlushRight < minDiffX) {
          minDiffX = diffFlushRight;
          closestSnapX = candFlushRight;
        }

        // Y magnetic alignments:
        // 1. Bottom edge of p touches top edge of current tile: candidate Y = p.y + p.height
        const candBottom = p.y + p.height;
        const diffBottom = Math.abs(y - candBottom);
        if (diffBottom < minDiffY) {
          minDiffY = diffBottom;
          closestSnapY = candBottom;
        }

        // 2. Top edge of p touches bottom edge of current tile: candidate Y = p.y - h
        const candTop = p.y - h;
        const diffTop = Math.abs(y - candTop);
        if (diffTop < minDiffY) {
          minDiffY = diffTop;
          closestSnapY = candTop;
        }

        // 3. Flush top edges: candidate Y = p.y
        const candFlushTop = p.y;
        const diffFlushTop = Math.abs(y - candFlushTop);
        if (diffFlushTop < minDiffY) {
          minDiffY = diffFlushTop;
          closestSnapY = candFlushTop;
        }

        // 4. Flush bottom edges: candidate Y = p.y + p.height - h
        const candFlushBottom = p.y + p.height - h;
        const diffFlushBottom = Math.abs(y - candFlushBottom);
        if (diffFlushBottom < minDiffY) {
          minDiffY = diffFlushBottom;
          closestSnapY = candFlushBottom;
        }
      }

      if (closestSnapX !== null) {
        x = closestSnapX;
      } else {
        // Fallback grid snap using the tile's native width as step
        const stepX = Math.max(1, w);
        x = Math.round(x / stepX) * stepX;
      }

      if (closestSnapY !== null) {
        y = closestSnapY;
      } else {
        // Fallback grid snap using the tile's native height as step
        const stepY = Math.max(1, h);
        y = Math.round(y / stepY) * stepY;
      }

      return { x, y };
    },
    [snapToGrid, placements]
  );

  // Active placement reference
  const activePlacement = placements.find((p) => p.id === selectedPlacementId);

  // Collision mode update on selected placement ("walkable" | "blocked" | "custom")
  const handleUpdatePlacementCollisionMode = (collisionMode: CollisionMode) => {
    if (!selectedPlacementId) return;
    setPlacements((prev) =>
      prev.map((p) => {
        if (p.id !== selectedPlacementId) return p;
        if (collisionMode === "custom" && !p.collision) {
          // Default custom collision box (e.g. tree trunk): bottom 40% height, centered 40% width
          const h = Math.max(8, Math.round(p.height * 0.4));
          const w = Math.max(8, Math.round(p.width * 0.4));
          const x = Math.round((p.width - w) / 2);
          const y = p.height - h;
          return { ...p, collisionMode, collision: { x, y, width: w, height: h } };
        }
        return { ...p, collisionMode };
      })
    );
  };

  // Occlusion depth update on selected placement (offset from top in px)
  const handleUpdatePlacementOcclusionDepth = (depth: number) => {
    if (!selectedPlacementId) return;
    setPlacements((prev) =>
      prev.map((p) => (p.id === selectedPlacementId ? { ...p, occlusionDepth: depth } : p))
    );
  };

  // Layer Opacity handler
  const handleLayerOpacityChange = (layerId: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l))
    );
  };

  // Selected Placements Opacity handler
  const handleSelectedPlacementsOpacity = (opacity: number) => {
    if (selectedPlacementIds.length === 0) return;
    const clamped = Math.max(0, Math.min(1, opacity));
    setPlacements((prev) =>
      prev.map((p) => (selectedPlacementIds.includes(p.id) ? { ...p, opacity: clamped } : p))
    );
  };

  // Main Canvas Rendering Engine
  const renderWorkspace = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Clear Screen
    ctx.fillStyle = "#070b13";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Sort layers by order ascending (draw bottom layer first)
    const sortedLayers = [...layers].sort((a, b) => a.order - b.order);

    for (const layer of sortedLayers) {
      if (!layer.visible) continue;

      const layerPlacements = placements.filter((p) => p.layerId === layer.id);

      for (const p of layerPlacements) {
        const asset = assetMap.get(p.assetId);
        if (!asset) continue;

        const screenX = (p.x - camera.x) * camera.zoom + centerX;
        const screenY = (p.y - camera.y) * camera.zoom + centerY;

        // Apply layer opacity and placement opacity
        const layerOpacity = layer.opacity !== undefined ? layer.opacity : 1;
        const placementOpacity = p.opacity !== undefined ? p.opacity : 1;
        const combinedOpacity = Math.max(0, Math.min(1, layerOpacity * placementOpacity));

        // Draw pixel art asset with native or scaled dimensions
        drawAssetToContext(ctx, asset, screenX, screenY, camera.zoom, combinedOpacity, p.width, p.height);

        // Render collision geometry overlay if set
        if (p.collisionMode === "blocked") {
          // Full bounding box blocked
          ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
          ctx.fillRect(screenX, screenY, p.width * camera.zoom, p.height * camera.zoom);
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(screenX, screenY, p.width * camera.zoom, p.height * camera.zoom);
        } else if (p.collision && p.collisionMode !== "walkable") {
          const collScreenX = screenX + p.collision.x * camera.zoom;
          const collScreenY = screenY + p.collision.y * camera.zoom;
          const collW = p.collision.width * camera.zoom;
          const collH = p.collision.height * camera.zoom;

          ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
          ctx.fillRect(collScreenX, collScreenY, collW, collH);
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(collScreenX, collScreenY, collW, collH);
        }

        // Selection Highlight Ring, Resize Handles & Depth Line (Always visible regardless of artwork opacity)
        const isSelected = selectedPlacementIds.includes(p.id);
        const isPrimarySelected = selectedPlacementId === p.id;

        if (isSelected) {
          ctx.save();
          ctx.strokeStyle = isPrimarySelected ? "#22d3ee" : "#38bdf8"; // Cyan
          ctx.lineWidth = isPrimarySelected ? 2 : 1.5;
          if (!isPrimarySelected) ctx.setLineDash([4, 2]);
          ctx.strokeRect(
            screenX - 1,
            screenY - 1,
            p.width * camera.zoom + 2,
            p.height * camera.zoom + 2
          );
          ctx.restore();

          if (isPrimarySelected) {
            // Corner handles on primary selection
            const sW = p.width * camera.zoom;
            const sH = p.height * camera.zoom;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(screenX - 3, screenY - 3, 6, 6);
            ctx.fillRect(screenX + sW - 3, screenY - 3, 6, 6);
            ctx.fillRect(screenX - 3, screenY + sH - 3, 6, 6);
            ctx.fillRect(screenX + sW - 3, screenY + sH - 3, 6, 6);

            // Occlusion Depth sort line (amber dashed line showing ground contact line)
            const depthOffset = p.occlusionDepth !== undefined ? p.occlusionDepth : p.height;
            const depthScreenY = screenY + depthOffset * camera.zoom;
            ctx.save();
            ctx.strokeStyle = "#f59e0b"; // Amber
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(screenX, depthScreenY);
            ctx.lineTo(screenX + sW, depthScreenY);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

    // Render Blocked Areas (with support for Rectangle, Circle/Ellipse, and Polygon shapes)
    for (const b of blockedAreas) {
      const bScreenX = (b.x - camera.x) * camera.zoom + centerX;
      const bScreenY = (b.y - camera.y) * camera.zoom + centerY;
      const bW = b.width * camera.zoom;
      const bH = b.height * camera.zoom;
      const isSel = selectedBlockedId === b.id;
      const alpha = b.opacity !== undefined ? b.opacity : (isSel ? 0.45 : 0.28);

      ctx.save();
      ctx.fillStyle = isSel ? `rgba(239, 68, 68, ${alpha})` : `rgba(220, 38, 38, ${alpha})`;
      ctx.strokeStyle = isSel ? "#f87171" : "#ef4444";
      ctx.lineWidth = isSel ? 2 : 1;

      if (b.shape === "circle") {
        // Circle / Ellipse shape
        ctx.beginPath();
        ctx.ellipse(bScreenX + bW / 2, bScreenY + bH / 2, Math.max(1, bW / 2), Math.max(1, bH / 2), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (b.shape === "polygon" && Array.isArray(b.points) && b.points.length >= 3) {
        // Polygon shape
        ctx.beginPath();
        const firstPt = b.points[0];
        ctx.moveTo((firstPt.x - camera.x) * camera.zoom + centerX, (firstPt.y - camera.y) * camera.zoom + centerY);
        for (let i = 1; i < b.points.length; i++) {
          const pt = b.points[i];
          ctx.lineTo((pt.x - camera.x) * camera.zoom + centerX, (pt.y - camera.y) * camera.zoom + centerY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // If selected, draw polygon vertex handles
        if (isSel) {
          ctx.fillStyle = "#ffffff";
          for (const pt of b.points) {
            const px = (pt.x - camera.x) * camera.zoom + centerX;
            const py = (pt.y - camera.y) * camera.zoom + centerY;
            ctx.fillRect(px - 3, py - 3, 6, 6);
          }
        }
      } else {
        // Rectangle default
        ctx.fillRect(bScreenX, bScreenY, bW, bH);
        ctx.strokeRect(bScreenX, bScreenY, bW, bH);
      }

      // Blocked badge text
      ctx.fillStyle = "#fca5a5";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText(b.label || "BLOCKED", bScreenX + 4, bScreenY + 12);
      ctx.restore();
    }

    // Render Enemy Spawn marker
    if (enemySpawn) {
      const spScreenX = (enemySpawn.x - camera.x) * camera.zoom + centerX;
      const spScreenY = (enemySpawn.y - camera.y) * camera.zoom + centerY;

      ctx.save();
      ctx.fillStyle = "rgba(245, 158, 11, 0.3)";
      ctx.beginPath();
      ctx.arc(spScreenX, spScreenY, 20 * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(spScreenX, spScreenY, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fef3c7";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ENEMY SPAWN", spScreenX, spScreenY - 14);
      ctx.restore();
    }

    // Dynamic Blocked Area creation preview (supports Rectangle, Circle, and Polygon)
    if (toolMode === "block") {
      const curWorld = mouseWorldPos.current;
      if (blockedShapeMode === "polygon" && polygonPoints.length > 0) {
        // Draw in-progress polygon lines
        ctx.save();
        ctx.strokeStyle = "#ef4444";
        ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        const firstPt = polygonPoints[0];
        ctx.moveTo((firstPt.x - camera.x) * camera.zoom + centerX, (firstPt.y - camera.y) * camera.zoom + centerY);
        for (let i = 1; i < polygonPoints.length; i++) {
          const pt = polygonPoints[i];
          ctx.lineTo((pt.x - camera.x) * camera.zoom + centerX, (pt.y - camera.y) * camera.zoom + centerY);
        }
        ctx.lineTo((curWorld.x - camera.x) * camera.zoom + centerX, (curWorld.y - camera.y) * camera.zoom + centerY);
        ctx.stroke();

        // Draw points handles
        ctx.fillStyle = "#ffffff";
        for (const pt of polygonPoints) {
          const px = (pt.x - camera.x) * camera.zoom + centerX;
          const py = (pt.y - camera.y) * camera.zoom + centerY;
          ctx.fillRect(px - 3, py - 3, 6, 6);
        }
        ctx.restore();
      } else if (isDrawingBlocked.current) {
        const bX = Math.min(blockedBoxStart.current.x, curWorld.x);
        const bY = Math.min(blockedBoxStart.current.y, curWorld.y);
        const bW = Math.abs(curWorld.x - blockedBoxStart.current.x);
        const bH = Math.abs(curWorld.y - blockedBoxStart.current.y);

        const previewScreenX = (bX - camera.x) * camera.zoom + centerX;
        const previewScreenY = (bY - camera.y) * camera.zoom + centerY;

        ctx.save();
        ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 1.5;

        if (blockedShapeMode === "circle") {
          ctx.beginPath();
          ctx.ellipse(previewScreenX + (bW * camera.zoom) / 2, previewScreenY + (bH * camera.zoom) / 2, Math.max(1, (bW * camera.zoom) / 2), Math.max(1, (bH * camera.zoom) / 2), 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(previewScreenX, previewScreenY, bW * camera.zoom, bH * camera.zoom);
          ctx.strokeRect(previewScreenX, previewScreenY, bW * camera.zoom, bH * camera.zoom);
        }
        ctx.restore();
      }
    }

    // Draw Rectangular Selection Marquee Box
    if (marqueeBox) {
      const minX = Math.min(marqueeBox.startX, marqueeBox.curX);
      const minY = Math.min(marqueeBox.startY, marqueeBox.curY);
      const mW = Math.abs(marqueeBox.curX - marqueeBox.startX);
      const mH = Math.abs(marqueeBox.curY - marqueeBox.startY);

      const mScreenX = (minX - camera.x) * camera.zoom + centerX;
      const mScreenY = (minY - camera.y) * camera.zoom + centerY;

      ctx.save();
      ctx.fillStyle = "rgba(34, 211, 238, 0.15)";
      ctx.fillRect(mScreenX, mScreenY, mW * camera.zoom, mH * camera.zoom);
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(mScreenX, mScreenY, mW * camera.zoom, mH * camera.zoom);
      ctx.restore();
    }

    // Draw Placement Preview at cursor when in Place tool mode
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (
      toolMode === "place" &&
      activeAsset &&
      activeLayer?.visible &&
      !activeLayer.locked
    ) {
      const targetW = activeAsset.canvas_width;
      const targetH = activeAsset.canvas_height;
      const snapped = snapCoords(
        mouseWorldPos.current.x,
        mouseWorldPos.current.y,
        targetW,
        targetH
      );
      const previewScreenX = (snapped.x - camera.x) * camera.zoom + centerX;
      const previewScreenY = (snapped.y - camera.y) * camera.zoom + centerY;

      // Draw ghosted asset
      drawAssetToContext(ctx, activeAsset, previewScreenX, previewScreenY, camera.zoom, 0.65);

      // Subtle placement boundary
      ctx.strokeStyle = "rgba(34, 211, 238, 0.8)";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        previewScreenX,
        previewScreenY,
        targetW * camera.zoom,
        targetH * camera.zoom
      );
    }
  }, [
    camera,
    layers,
    placements,
    selectedPlacementId,
    selectedPlacementIds,
    selectedBlockedId,
    blockedAreas,
    blockedShapeMode,
    polygonPoints,
    marqueeBox,
    enemySpawn,
    toolMode,
    activeAsset,
    activeLayerId,
    assetMap,
    snapCoords,
  ]);

  // Request Animation Frame loop for smooth rendering
  useEffect(() => {
    let animId: number;
    const loop = () => {
      renderWorkspace();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [renderWorkspace]);

  // Resize canvas to match container
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard Shortcuts (Space for Pan, Escape for Cancel, Delete for Remove, Ctrl+D for Duplicate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === "Space" && !spacePressed.current) {
        spacePressed.current = true;
        setIsSpacePressed(true);
        e.preventDefault();
      }

      // V for Select, B for Place, H for Pan, K for Block Area, S for Spawn, X or Delete for Delete tool
      if (e.key === "v" || e.key === "V") setToolMode("select");
      if (e.key === "b" || e.key === "B") setToolMode("place");
      if (e.key === "h" || e.key === "H") setToolMode("pan");
      if (e.key === "k" || e.key === "K") setToolMode("block");
      if (e.key === "x" || e.key === "X") setToolMode("delete");

      // Delete selected placements or blocked area (only if on active layer)
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedPlacementIds.length > 0) {
          const toDelete = new Set(selectedPlacementIds);
          setPlacements((prev) =>
            prev.filter((p) => {
              if (toDelete.has(p.id) && p.layerId === activeLayerId) {
                return false;
              }
              return true;
            })
          );
          setSelectedPlacementIds([]);
          setSaveStatus({ message: `${toDelete.size} tile(s) removed from map.`, type: "info" });
          setTimeout(() => setSaveStatus(null), 2000);
        }
        if (selectedBlockedId) {
          setBlockedAreas((prev) => prev.filter((b) => b.id !== selectedBlockedId));
          setSelectedBlockedId(null);
        }
      }

      // Keyboard Arrow Keys for 1-pixel precision nudge movement for ALL selected placements
      if (
        (e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowDown") &&
        selectedPlacementIds.length > 0
      ) {
        e.preventDefault();
        const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
        const dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
        setPlacements((prev) =>
          prev.map((p) => {
            if (!selectedPlacementIds.includes(p.id) || p.layerId !== activeLayerId) return p;
            return {
              ...p,
              x: p.x + dx,
              y: p.y + dy,
            };
          })
        );
        return;
      }

      // Escape to deselect / cancel polygon drawing
      if (e.key === "Escape") {
        setSelectedPlacementIds([]);
        setSelectedBlockedId(null);
        setPolygonPoints([]);
        setIsAssetPickerOpen(false);
        setIsSavedMapsOpen(false);
      }

      // Duplicate all selected placements (Ctrl+D / Cmd+D)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedPlacementIds.length > 0) {
          const newDuplicated: PlacedAsset[] = [];
          const newIds: string[] = [];
          for (const id of selectedPlacementIds) {
            const target = placements.find((p) => p.id === id);
            if (target && target.layerId === activeLayerId) {
              const dup: PlacedAsset = {
                ...target,
                id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                x: target.x + target.width,
                y: target.y,
              };
              newDuplicated.push(dup);
              newIds.push(dup.id);
            }
          }
          if (newDuplicated.length > 0) {
            setPlacements((prev) => [...prev, ...newDuplicated]);
            setSelectedPlacementIds(newIds);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressed.current = false;
        setIsSpacePressed(false);
        isPanning.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [placements, selectedPlacementId, selectedPlacementIds, selectedBlockedId, activeLayerId]);

  // Pointer Down Handler
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const isMiddleClick = e.button === 1;
    const isPanMode = toolMode === "pan" || spacePressed.current || isMiddleClick;

    if (isPanMode) {
      isPanning.current = true;
      panStart.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        camX: camera.x,
        camY: camera.y,
      };
      return;
    }

    if (e.button !== 0) return; // Only primary button for placement/selection

    const world = screenToWorld(e.clientX, e.clientY);
    const activeLayer = layers.find((l) => l.id === activeLayerId);

    // 1. SPAWN MODE: Place Enemy Spawn
    if (toolMode === "spawn") {
      setEnemySpawn({
        x: Math.round(world.x),
        y: Math.round(world.y),
        home_x: Math.round(world.x),
        home_y: Math.round(world.y),
      });
      setSaveStatus({ message: "Enemy spawn point placed!", type: "info" });
      setTimeout(() => setSaveStatus(null), 2500);
      return;
    }

    // 2. BLOCK MODE: Drawing blocked areas (Rectangle, Circle, Polygon)
    if (toolMode === "block") {
      if (blockedShapeMode === "polygon") {
        const pt: ShapePoint = { x: Math.round(world.x), y: Math.round(world.y) };
        // Check if closing polygon (clicking near first point)
        if (polygonPoints.length >= 3) {
          const first = polygonPoints[0];
          const distToFirst = Math.hypot(pt.x - first.x, pt.y - first.y);
          if (distToFirst <= 12 / camera.zoom) {
            // Close polygon and create blocked area
            const xs = polygonPoints.map((p) => p.x);
            const ys = polygonPoints.map((p) => p.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            const newBlocked: BlockedArea = {
              id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              x: minX,
              y: minY,
              width: Math.max(8, maxX - minX),
              height: Math.max(8, maxY - minY),
              shape: "polygon",
              points: [...polygonPoints],
              label: "Blocked Polygon",
              layerId: activeLayer?.group === "blocked" ? activeLayer.id : undefined,
            };
            setBlockedAreas((prev) => [...prev, newBlocked]);
            setSelectedBlockedId(newBlocked.id);
            setPolygonPoints([]);
            setSaveStatus({ message: "Custom polygon blocked area created!", type: "info" });
            setTimeout(() => setSaveStatus(null), 2500);
            return;
          }
        }
        setPolygonPoints((prev) => [...prev, pt]);
        return;
      }

      isDrawingBlocked.current = true;
      blockedBoxStart.current = { x: Math.round(world.x), y: Math.round(world.y) };
      return;
    }

    // 3. SELECT MODE
    if (toolMode === "select") {
      const isShift = e.shiftKey;
      const isCtrl = e.ctrlKey || e.metaKey;
      const isAlt = e.altKey;

      // Check if clicking a blocked area
      const hitBlocked = [...blockedAreas].reverse().find((b) => (
        world.x >= b.x && world.x <= b.x + b.width && world.y >= b.y && world.y <= b.y + b.height
      ));
      if (hitBlocked) {
        setSelectedBlockedId(hitBlocked.id);
        setSelectedPlacementIds([]);
        return;
      }
      setSelectedBlockedId(null);

      // Find all placed assets on the ACTIVE layer under cursor
      const candidatePlacements = placements.filter((p) => {
        if (p.layerId !== activeLayerId) return false;
        const layer = layers.find((l) => l.id === p.layerId);
        if (!layer || !layer.visible || layer.locked) return false;
        return (
          world.x >= p.x &&
          world.x <= p.x + p.width &&
          world.y >= p.y &&
          world.y <= p.y + p.height
        );
      });

      if (candidatePlacements.length > 0) {
        // Cycling through overlapping objects if clicking the same location or selecting topmost
        let chosenPlacement: PlacedAsset = candidatePlacements[candidatePlacements.length - 1]; // topmost default
        if (candidatePlacements.length > 1 && selectedPlacementIds.length === 1) {
          const currentIdx = candidatePlacements.findIndex((p) => p.id === selectedPlacementIds[0]);
          if (currentIdx >= 0) {
            // Cycle to the object underneath
            const nextIdx = (currentIdx - 1 + candidatePlacements.length) % candidatePlacements.length;
            chosenPlacement = candidatePlacements[nextIdx];
          }
        }

        // Apply Modifier-key selection
        if (isCtrl) {
          // Toggle
          setSelectedPlacementIds((prev) =>
            prev.includes(chosenPlacement.id)
              ? prev.filter((id) => id !== chosenPlacement.id)
              : [...prev, chosenPlacement.id]
          );
        } else if (isShift) {
          // Add to selection
          setSelectedPlacementIds((prev) =>
            prev.includes(chosenPlacement.id) ? prev : [...prev, chosenPlacement.id]
          );
        } else if (isAlt) {
          // Remove from selection
          setSelectedPlacementIds((prev) => prev.filter((id) => id !== chosenPlacement.id));
        } else {
          // Normal single click selection
          if (!selectedPlacementIds.includes(chosenPlacement.id)) {
            setSelectedPlacementIds([chosenPlacement.id]);
          }
        }

        isDraggingPlacement.current = true;
        dragPlacementOffset.current = {
          dx: world.x - chosenPlacement.x,
          dy: world.y - chosenPlacement.y,
        };
        return;
      }

      // If clicked empty space on canvas, initiate marquee rectangular selection
      if (!isShift && !isCtrl && !isAlt) {
        setSelectedPlacementIds([]);
      }
      isMarqueeActive.current = true;
      marqueeStart.current = { x: world.x, y: world.y };
      setMarqueeBox({
        startX: world.x,
        startY: world.y,
        curX: world.x,
        curY: world.y,
      });
      return;
    }

    // 4. DELETE TOOL MODE: Click to remove placed asset on active layer
    if (toolMode === "delete") {
      // Check if clicking placed asset on active layer
      const hit = [...placements].reverse().find((p) => (
        p.layerId === activeLayerId &&
        world.x >= p.x &&
        world.x <= p.x + p.width &&
        world.y >= p.y &&
        world.y <= p.y + p.height
      ));

      if (hit) {
        setPlacements((prev) => prev.filter((p) => p.id !== hit.id));
        if (selectedPlacementId === hit.id) setSelectedPlacementId(null);
        setSaveStatus({ message: "Tile removed from map.", type: "info" });
        setTimeout(() => setSaveStatus(null), 2000);
        return;
      }

      // Check if clicking a blocked area
      const hitBlocked = [...blockedAreas].reverse().find((b) => (
        world.x >= b.x && world.x <= b.x + b.width && world.y >= b.y && world.y <= b.y + b.height
      ));
      if (hitBlocked) {
        setBlockedAreas((prev) => prev.filter((b) => b.id !== hitBlocked.id));
        if (selectedBlockedId === hitBlocked.id) setSelectedBlockedId(null);
        setSaveStatus({ message: "Blocked area removed.", type: "info" });
        setTimeout(() => setSaveStatus(null), 2000);
        return;
      }
      return;
    }

    // 5. PLACE MODE
    if (toolMode === "place") {
      if (!activeAsset) {
        setIsAssetPickerOpen(true);
        return;
      }
      if (!activeLayer || !activeLayer.visible || activeLayer.locked) {
        setSaveStatus({
          message: "Current layer is locked or hidden. Select an active layer first.",
          type: "error",
        });
        return;
      }

      const snapped = snapCoords(
        world.x,
        world.y,
        activeAsset.canvas_width,
        activeAsset.canvas_height
      );

      // Auto-assign collision box and collision mode based on layer group & asset category
      let initialCollision: CollisionRect | null = null;
      let initialCollisionMode: CollisionMode = "walkable";
      const isGround = activeLayer.group === "ground" || (!activeLayer.group && activeLayer.id.includes("ground"));
      const cat = (activeAsset.category || "").toLowerCase();

      if (isGround) {
        initialCollisionMode = "walkable";
      } else if (cat === "tree") {
        // Bottom 40% represents trunk collision box (canopy remains walkable/covers characters)
        const trunkH = Math.max(8, Math.round(activeAsset.canvas_height * 0.4));
        const trunkW = Math.max(8, Math.round(activeAsset.canvas_width * 0.35));
        const trunkX = Math.round((activeAsset.canvas_width - trunkW) / 2);
        const trunkY = activeAsset.canvas_height - trunkH;
        initialCollision = { x: trunkX, y: trunkY, width: trunkW, height: trunkH };
        initialCollisionMode = "custom";
      } else if (cat === "buildings" || cat === "stone" || cat === "obstacle" || cat === "wall") {
        initialCollisionMode = "blocked";
      } else {
        // Default objects layer items: walkable unless user sets collision
        initialCollisionMode = "walkable";
      }

      const newPlacement: PlacedAsset = {
        id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        assetId: activeAsset.id,
        name: activeAsset.name || undefined,
        x: snapped.x,
        y: snapped.y,
        width: activeAsset.canvas_width,
        height: activeAsset.canvas_height,
        layerId: activeLayer.id,
        collision: initialCollision,
        collisionMode: initialCollisionMode,
        occlusionDepth: activeAsset.canvas_height,
      };

      setPlacements((prev) => [...prev, newPlacement]);
    }
  };

  // Pointer Move Handler
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const world = screenToWorld(e.clientX, e.clientY);
    mouseWorldPos.current = world;

    // Update Marquee Box if dragging
    if (isMarqueeActive.current) {
      setMarqueeBox({
        startX: marqueeStart.current.x,
        startY: marqueeStart.current.y,
        curX: world.x,
        curY: world.y,
      });
      return;
    }

    // Pan camera
    if (isPanning.current) {
      const dx = (e.clientX - panStart.current.clientX) / camera.zoom;
      const dy = (e.clientY - panStart.current.clientY) / camera.zoom;
      setCamera((prev) => ({
        ...prev,
        x: panStart.current.camX - dx,
        y: panStart.current.camY - dy,
      }));
      return;
    }

    // Drag selected placements together (preserves relative positions)
    if (isDraggingPlacement.current && selectedPlacementId) {
      const primaryPlacement = placements.find((p) => p.id === selectedPlacementId);
      if (!primaryPlacement) return;

      const rawX = world.x - dragPlacementOffset.current.dx;
      const rawY = world.y - dragPlacementOffset.current.dy;
      const snapped = snapCoords(rawX, rawY, primaryPlacement.width, primaryPlacement.height, primaryPlacement.id);
      const deltaX = snapped.x - primaryPlacement.x;
      const deltaY = snapped.y - primaryPlacement.y;

      if (deltaX !== 0 || deltaY !== 0) {
        setPlacements((prev) =>
          prev.map((p) => {
            if (selectedPlacementIds.includes(p.id)) {
              return {
                ...p,
                x: p.x + deltaX,
                y: p.y + deltaY,
              };
            }
            return p;
          })
        );
      }
    }
  };

  // Pointer Up Handler
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already released
    }
    isPanning.current = false;
    isDraggingPlacement.current = false;

    // Finish Marquee Box selection
    if (isMarqueeActive.current && marqueeBox) {
      isMarqueeActive.current = false;
      const minX = Math.min(marqueeBox.startX, marqueeBox.curX);
      const maxX = Math.max(marqueeBox.startX, marqueeBox.curX);
      const minY = Math.min(marqueeBox.startY, marqueeBox.curY);
      const maxY = Math.max(marqueeBox.startY, marqueeBox.curY);

      // Select all placements on the active layer intersecting the marquee box
      const intersecting = placements.filter((p) => {
        if (p.layerId !== activeLayerId) return false;
        const layer = layers.find((l) => l.id === p.layerId);
        if (!layer || !layer.visible || layer.locked) return false;
        // Bounding box intersection check
        return (
          p.x < maxX &&
          p.x + p.width > minX &&
          p.y < maxY &&
          p.y + p.height > minY
        );
      });

      const ids = intersecting.map((p) => p.id);
      setSelectedPlacementIds(ids);
      setMarqueeBox(null);
      return;
    }
    isMarqueeActive.current = false;
    setMarqueeBox(null);

    // Finish Block Area drawing (Rectangle or Circle)
    if (toolMode === "block" && isDrawingBlocked.current) {
      isDrawingBlocked.current = false;
      const world = screenToWorld(e.clientX, e.clientY);
      const bX = Math.min(blockedBoxStart.current.x, Math.round(world.x));
      const bY = Math.min(blockedBoxStart.current.y, Math.round(world.y));
      const bW = Math.abs(Math.round(world.x) - blockedBoxStart.current.x);
      const bH = Math.abs(Math.round(world.y) - blockedBoxStart.current.y);

      if (bW >= 8 && bH >= 8) {
        const activeLayer = layers.find((l) => l.id === activeLayerId);
        const newBlocked: BlockedArea = {
          id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          x: bX,
          y: bY,
          width: bW,
          height: bH,
          shape: blockedShapeMode === "circle" ? "circle" : "rectangle",
          label: blockedShapeMode === "circle" ? "Blocked Circle" : "Blocked",
          layerId: activeLayer?.group === "blocked" ? activeLayer.id : undefined,
        };
        setBlockedAreas((prev) => [...prev, newBlocked]);
        setSelectedBlockedId(newBlocked.id);
        setSaveStatus({ message: `${blockedShapeMode === "circle" ? "Circular" : "Rectangular"} collision area marked!`, type: "info" });
        setTimeout(() => setSaveStatus(null), 2500);
      }
    }
  };

  // Wheel Zoom (Infinite zooming with focal point under cursor)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(0.25, Math.min(10, camera.zoom * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseScreenX = e.clientX - rect.left - rect.width / 2;
    const mouseScreenY = e.clientY - rect.top - rect.height / 2;

    // Zoom centered on mouse location
    const newCamX = camera.x + mouseScreenX * (1 / camera.zoom - 1 / newZoom);
    const newCamY = camera.y + mouseScreenY * (1 / camera.zoom - 1 / newZoom);

    setCamera({
      x: newCamX,
      y: newCamY,
      zoom: Number(newZoom.toFixed(3)),
    });
  };

  // Zoom Toolbar Handlers
  const handleZoomIn = () => {
    setCamera((prev) => ({ ...prev, zoom: Math.min(10, Number((prev.zoom * 1.25).toFixed(3))) }));
  };

  const handleZoomOut = () => {
    setCamera((prev) => ({ ...prev, zoom: Math.max(0.25, Number((prev.zoom * 0.8).toFixed(3))) }));
  };

  const handleResetZoom = () => {
    setCamera((prev) => ({ ...prev, zoom: 2 }));
  };

  const handleFitCenter = () => {
    if (placements.length === 0) {
      setCamera({ x: 0, y: 0, zoom: 2 });
      return;
    }
    const xs = placements.map((p) => p.x);
    const ys = placements.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs.map((x, i) => x + placements[i].width));
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys.map((y, i) => y + placements[i].height));
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    setCamera({ x: midX, y: midY, zoom: 2 });
  };

  // Layer Management Handlers
  const handleAddLayer = (group: LayerGroupType = "ground") => {
    const groupCount = layers.filter((l) => (l.group || (l.id.includes("ground") ? "ground" : "objects")) === group).length;
    const nextOrder = layers.length ? Math.max(...layers.map((l) => l.order)) + 1 : 0;
    const groupLabel = group === "ground" ? "Ground" : "Objects";
    const newLayer: MapLayer = {
      id: `layer_${group}_${Date.now()}`,
      name: `${groupLabel} Layer ${groupCount + 1}`,
      visible: true,
      locked: false,
      order: nextOrder,
      group,
    };
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  };

  const handleRenameLayer = (layerId: string, newName: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, name: newName } : l))
    );
  };

  const handleToggleVisible = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleToggleLock = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, locked: !l.locked } : l))
    );
  };

  const handleMoveLayer = (layerId: string, direction: "up" | "down") => {
    const current = layers.find((l) => l.id === layerId);
    if (!current) return;
    const currentGroup = current.group || (current.id.includes("ground") ? "ground" : "objects");

    // Only swap with layers in the SAME group
    const groupLayers = [...layers]
      .filter((l) => (l.group || (l.id.includes("ground") ? "ground" : "objects")) === currentGroup)
      .sort((a, b) => b.order - a.order);

    const idx = groupLayers.findIndex((l) => l.id === layerId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= groupLayers.length) return;

    // Swap orders
    const targetLayer = groupLayers[targetIdx];
    const tempOrder = current.order;
    current.order = targetLayer.order;
    targetLayer.order = tempOrder;

    setLayers([...layers]);
  };

  const handleDeleteLayer = (layerId: string) => {
    if (layers.length <= 1) return;
    setLayers((prev) => prev.filter((l) => l.id !== layerId));
    setPlacements((prev) => prev.filter((p) => p.layerId !== layerId));
    if (activeLayerId === layerId) {
      const remaining = layers.filter((l) => l.id !== layerId);
      setActiveLayerId(remaining[0].id);
    }
  };

  const handleSelectLayer = (id: string) => {
    setActiveLayerId(id);
    setSelectedPlacementId(null);
  };

  // Replace Placed Asset
  const handleReplaceSelected = () => {
    if (!selectedPlacementId) return;
    setIsReplacingPlacement(true);
    setIsAssetPickerOpen(true);
  };

  // Asset Selected from Picker Modal (supports null for "None")
  const handleSelectAsset = (asset: AssetRecord | null) => {
    if (!asset) {
      setActiveAsset(null);
      setIsReplacingPlacement(false);
      setIsAssetPickerOpen(false);
      return;
    }

    if (isReplacingPlacement && selectedPlacementId) {
      // Replace asset on selected placement while preserving original position
      setPlacements((prev) =>
        prev.map((p) =>
          p.id === selectedPlacementId
            ? {
                ...p,
                assetId: asset.id,
                width: asset.canvas_width,
                height: asset.canvas_height,
              }
            : p
        )
      );
      setIsReplacingPlacement(false);
      setIsAssetPickerOpen(false);
      return;
    }

    setActiveAsset(asset);
    setToolMode("place");
    setIsAssetPickerOpen(false);
  };

  // Map Persistence Handlers
  const handleSaveMap = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const payload: SavedMapData = {
        id: mapId,
        name: mapName.trim() || "Untitled Map",
        layers,
        placements,
        blockedAreas,
        enemySpawn,
        camera,
        bounds,
        is_published: mapPublished,
        is_default: mapDefault,
        updated_at: new Date().toISOString(),
        created_at: mapCreatedAt,
      };
      const result = await saveMap(payload, true);
      setSaveStatus({ message: result.message, type: "success" });
    } catch (err) {
      // Supabase upsert failed. Report the real error to the user.
      setSaveStatus({
        message: err instanceof Error ? err.message : "Error saving map",
        type: "error",
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  const handleLoadMapById = async (targetId: string) => {
    try {
      const data = await loadMap(targetId);
      setMapId(data.id);
      setMapName(data.name || "Untitled Map");

      // Ensure all loaded layers have explicit group property
      const loadedLayers = (data.layers?.length ? data.layers : DEFAULT_LAYERS).map((l) => ({
        ...l,
        group: l.group || (l.id.includes("ground") || l.name.toLowerCase().includes("ground") ? "ground" : "objects") as LayerGroupType,
      }));
      setLayers(loadedLayers);
      setActiveLayerId(loadedLayers[0]?.id || "layer_ground");
      setPlacements(data.placements || []);
      setBlockedAreas(data.blockedAreas || []);
      if (data.enemySpawn) setEnemySpawn(data.enemySpawn);
      if (data.camera) setCamera(data.camera);
      setSelectedPlacementId(null);
      setSelectedBlockedId(null);
      setSaveStatus({ message: `Loaded map: ${data.name}`, type: "success" });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      // Supabase was the source of truth and it failed / returned nothing.
      setSaveStatus({
        message: err instanceof Error ? err.message : `Could not open map: record not found`,
        type: "error",
      });
    }
  };

  const handleNewMap = () => {
    setMapId(createMapId());
    setMapName("Untitled Map");
    setMapCreatedAt(new Date().toISOString());
    setMapPublished(false);
    setMapDefault(false);
    setBounds(undefined);
    setLayers(DEFAULT_LAYERS);
    setActiveLayerId("layer_ground");
    setPlacements([]);
    setBlockedAreas([]);
    setSelectedPlacementId(null);
    setSelectedBlockedId(null);
    setCamera({ x: 0, y: 0, zoom: 2 });
    setSaveStatus({ message: "New empty map created.", type: "info" });
    setTimeout(() => setSaveStatus(null), 2500);
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-[#070b13] text-slate-100 select-none">
      {/* Top Header / Primary Toolbar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0d1424] px-4 py-2.5 shadow-md">
        {/* Left: Section Title & Map Name */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Map Tools</p>
              <h1 className="text-sm font-black text-white leading-tight">Map Generator</h1>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-800" />

          {/* Editable Map Title */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              className="rounded-lg border border-transparent bg-transparent px-2 py-1 text-xs font-semibold text-white hover:border-slate-700 focus:border-cyan-500 focus:bg-slate-900 outline-none transition"
              title="Click to rename map"
            />
          </div>
        </div>

        {/* Center: Tools (Select, Place, Block Area, Enemy Spawn, Pan, Tiles & Objects Button) */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-1">
          {/* Select Tool */}
          <button
            type="button"
            onClick={() => setToolMode("select")}
            title="Select tool (V)"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              toolMode === "select"
                ? "bg-cyan-500 text-slate-950 shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            Select
          </button>

          {/* Place Tool */}
          <button
            type="button"
            onClick={() => setToolMode("place")}
            title="Place tool (B)"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              toolMode === "place"
                ? "bg-cyan-500 text-slate-950 shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Place
          </button>

          {/* Block Collision Tool & Shape Sub-selector */}
          <div className="flex items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-800/80 p-0.5">
            <button
              type="button"
              onClick={() => setToolMode("block")}
              title="Mark blocked collision area (K)"
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                toolMode === "block"
                  ? "bg-red-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <svg className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Blocked
            </button>

            {/* Shape selection if block tool is active */}
            {toolMode === "block" && (
              <div className="flex items-center gap-0.5 pl-1 border-l border-slate-700">
                <button
                  type="button"
                  onClick={() => setBlockedShapeMode("rectangle")}
                  className={`rounded p-1 text-[10px] font-bold transition ${
                    blockedShapeMode === "rectangle" ? "bg-red-500/30 text-red-300" : "text-slate-400 hover:text-white"
                  }`}
                  title="Rectangle tool: Drag to create box"
                >
                  Rect
                </button>
                <button
                  type="button"
                  onClick={() => setBlockedShapeMode("circle")}
                  className={`rounded p-1 text-[10px] font-bold transition ${
                    blockedShapeMode === "circle" ? "bg-red-500/30 text-red-300" : "text-slate-400 hover:text-white"
                  }`}
                  title="Circle/Ellipse tool: Drag to create ellipse"
                >
                  Circle
                </button>
                <button
                  type="button"
                  onClick={() => setBlockedShapeMode("polygon")}
                  className={`rounded p-1 text-[10px] font-bold transition ${
                    blockedShapeMode === "polygon" ? "bg-red-500/30 text-red-300" : "text-slate-400 hover:text-white"
                  }`}
                  title="Polygon/Pen tool: Click points to draw shape, click near start point to close"
                >
                  Poly
                </button>
              </div>
            )}
          </div>

          {/* Enemy Spawn Tool (Task 6) */}
          <button
            type="button"
            onClick={() => setToolMode("spawn")}
            title="Configure enemy spawn location"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              toolMode === "spawn"
                ? "bg-amber-500 text-slate-950 shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <svg className="h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Enemy Spawn
          </button>

          {/* Pan Tool */}
          <button
            type="button"
            onClick={() => setToolMode("pan")}
            title="Hand / Pan tool (H or Space+Drag)"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              toolMode === "pan"
                ? "bg-cyan-500 text-slate-950 shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
            Pan
          </button>

          {/* Delete Tool */}
          <button
            type="button"
            onClick={() => setToolMode("delete")}
            title="Delete tool (X) - Click to delete placements on active layer"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              toolMode === "delete"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-rose-950/50 hover:text-rose-300"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>

          <div className="mx-1 h-4 w-px bg-slate-700" />

          {/* Dedicated Tiles & Objects Button */}
          <button
            type="button"
            onClick={() => {
              setIsReplacingPlacement(false);
              void loadAssets();
              setIsAssetPickerOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/50 bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-300 hover:bg-cyan-500/25 transition"
            title="Open Tiles & Objects Library"
          >
            <svg className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Tiles &amp; Objects
            {activeAsset && (
              <span className="ml-1 max-w-[90px] truncate rounded bg-cyan-500/30 px-1 py-0.2 text-[10px] text-white">
                {activeAsset.name}
              </span>
            )}
          </button>
        </div>

        {/* Right: Snap toggle, Zoom controls, Save / Load */}
        <div className="flex items-center gap-2">
          {/* Snap toggle */}
          <button
            type="button"
            onClick={() => setSnapToGrid((v) => !v)}
            title="Snap placements to tile dimensions"
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
              snapToGrid
                ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
                : "border-slate-700 bg-slate-800 text-slate-400"
            }`}
          >
            Snap: {snapToGrid ? "On" : "Off"}
          </button>

          {/* Zoom controls */}
          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800/80 p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              className="px-2 py-0.5 text-xs text-slate-300 hover:text-white"
              title="Zoom out"
            >
              -
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-0.5 font-mono text-[11px] text-cyan-300 hover:text-white"
              title="Reset zoom to 100%"
            >
              {Math.round(camera.zoom * 50)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="px-2 py-0.5 text-xs text-slate-300 hover:text-white"
              title="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleFitCenter}
              className="border-l border-slate-700 px-2 py-0.5 text-xs text-slate-400 hover:text-white"
              title="Center on map"
            >
              ⌖
            </button>
          </div>

          {/* New Map */}
          <button
            type="button"
            onClick={handleNewMap}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-600 hover:text-white transition"
            title="Create a new empty map"
          >
            New
          </button>

          {/* Open Saved Maps */}
          <button
            type="button"
            onClick={() => setIsSavedMapsOpen(true)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-600 hover:text-white transition"
          >
            Open Map
          </button>

          {/* Save Map */}
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveMap}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-50 transition shadow-sm shadow-cyan-600/30"
          >
            {isSaving ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Map
              </>
            )}
          </button>

          {/* Export JSON Button */}
          <button
            type="button"
            onClick={() => {
              try {
                const payload: SavedMapData = {
                  id: mapId,
                  name: mapName.trim() || "Untitled Map",
                  layers,
                  placements,
                  blockedAreas,
                  enemySpawn,
                  camera,
                  bounds,
                  is_published: mapPublished,
                  is_default: mapDefault,
                  updated_at: new Date().toISOString(),
                  created_at: mapCreatedAt,
                };
                exportMapJson(payload);
                setSaveStatus({ message: "Map JSON exported and downloaded successfully!", type: "success" });
                setTimeout(() => setSaveStatus(null), 3000);
              } catch (err) {
                setSaveStatus({ message: err instanceof Error ? err.message : "Export failed", type: "error" });
                setTimeout(() => setSaveStatus(null), 4000);
              }
            }}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition shadow-sm shadow-emerald-500/20"
            title="Download full map JSON file"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export JSON
          </button>
        </div>
      </header>

      {/* Save Notification / Status Toast */}
      {saveStatus && (
        <div
          className={`px-4 py-2 text-center text-xs font-semibold transition ${
            saveStatus.type === "success"
              ? "bg-emerald-950/80 text-emerald-300 border-b border-emerald-800"
              : saveStatus.type === "error"
              ? "bg-red-950/80 text-red-300 border-b border-red-800"
              : "bg-cyan-950/80 text-cyan-300 border-b border-cyan-800"
          }`}
        >
          {saveStatus.message}
        </div>
      )}

      {/* Main Area: Infinite Canvas + Floating Panels */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Infinite Canvas Container */}
        <div
          ref={containerRef}
          className={`relative h-full w-full overflow-hidden ${
            isSpacePressed || toolMode === "pan"
              ? "cursor-grab active:cursor-grabbing"
              : toolMode === "place"
              ? "cursor-crosshair"
              : toolMode === "block"
              ? "cursor-cell"
              : "cursor-default"
          }`}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            className="block h-full w-full touch-none"
          />

          {/* Clean Central Initial Start State (+ button) */}
          {placements.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="pointer-events-auto flex flex-col items-center rounded-2xl border border-slate-700/80 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xs text-center max-w-sm">
                <button
                  type="button"
                  onClick={() => {
                    void loadAssets();
                    setIsAssetPickerOpen(true);
                  }}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 hover:scale-105 active:scale-95 transition"
                  title="Add first tile"
                >
                  <svg className="h-8 w-8 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <h3 className="mt-4 text-base font-bold text-white">Start Building Your Map</h3>
                <p className="mt-1.5 text-xs text-slate-400">
                  Click the <b className="text-cyan-300">+</b> button to select a saved tile from Tiles &amp; Objects and start placing anywhere.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void loadAssets();
                    setIsAssetPickerOpen(true);
                  }}
                  className="mt-4 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition"
                >
                  Browse Tiles &amp; Objects
                </button>
              </div>
            </div>
          )}

          {/* Selection Context Bar for Placed Assets (Task 5: Custom Collision Geometry) */}
          {activePlacement && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap items-center gap-2 rounded-xl border border-cyan-500/50 bg-slate-900/95 px-4 py-2 shadow-2xl backdrop-blur-xs text-xs z-20">
              <span className="font-semibold text-cyan-300">
                Selected: {assetMap.get(activePlacement.assetId)?.name || "Tile"}
              </span>
              <span className="text-slate-400">
                ({activePlacement.x}, {activePlacement.y})
              </span>
              <div className="h-4 w-px bg-slate-700 mx-1" />

              {/* Scale / Dimensions Controls (Task 2) */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/90 px-2 py-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Size:</span>
                <input
                  type="number"
                  min="1"
                  max="1024"
                  value={activePlacement.width}
                  onChange={(e) => {
                    const nextW = Math.max(1, parseInt(e.target.value) || 1);
                    setPlacements((prev) =>
                      prev.map((p) => {
                        if (p.id !== activePlacement.id) return p;
                        const origW = p.width;
                        const origH = p.height;
                        const nextH = proportionalScale && origW > 0
                          ? Math.max(1, Math.round((origH / origW) * nextW))
                          : origH;
                        return { ...p, width: nextW, height: nextH };
                      })
                    );
                  }}
                  className="w-12 rounded bg-slate-950 px-1 py-0.5 text-center font-mono text-xs text-cyan-300 outline-none border border-slate-700 focus:border-cyan-400"
                  title="Width in exact pixels"
                />
                <span className="text-slate-500 font-mono text-xs">&times;</span>
                <input
                  type="number"
                  min="1"
                  max="1024"
                  value={activePlacement.height}
                  onChange={(e) => {
                    const nextH = Math.max(1, parseInt(e.target.value) || 1);
                    setPlacements((prev) =>
                      prev.map((p) => {
                        if (p.id !== activePlacement.id) return p;
                        const origW = p.width;
                        const origH = p.height;
                        const nextW = proportionalScale && origH > 0
                          ? Math.max(1, Math.round((origW / origH) * nextH))
                          : origW;
                        return { ...p, width: nextW, height: nextH };
                      })
                    );
                  }}
                  className="w-12 rounded bg-slate-950 px-1 py-0.5 text-center font-mono text-xs text-cyan-300 outline-none border border-slate-700 focus:border-cyan-400"
                  title="Height in exact pixels"
                />
                <button
                  type="button"
                  onClick={() => setProportionalScale((v) => !v)}
                  className={`rounded p-1 text-[10px] font-semibold transition ${
                    proportionalScale ? "text-cyan-400 bg-cyan-950/60" : "text-slate-500 hover:text-slate-300"
                  }`}
                  title={proportionalScale ? "Proportional scaling ON" : "Free scaling (proportional OFF)"}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </button>
              </div>

              {/* Nudge / 1-pixel movement buttons */}
              <div className="flex items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-800/90 px-1.5 py-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Nudge:</span>
                <button
                  type="button"
                  onClick={() => {
                    setPlacements((prev) =>
                      prev.map((p) => (p.id === activePlacement.id ? { ...p, x: p.x - 1 } : p))
                    );
                  }}
                  className="rounded p-1 text-slate-300 hover:bg-slate-700 hover:text-white"
                  title="Nudge 1px Left (ArrowLeft)"
                >
                  &larr;
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlacements((prev) =>
                      prev.map((p) => (p.id === activePlacement.id ? { ...p, x: p.x + 1 } : p))
                    );
                  }}
                  className="rounded p-1 text-slate-300 hover:bg-slate-700 hover:text-white"
                  title="Nudge 1px Right (ArrowRight)"
                >
                  &rarr;
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlacements((prev) =>
                      prev.map((p) => (p.id === activePlacement.id ? { ...p, y: p.y - 1 } : p))
                    );
                  }}
                  className="rounded p-1 text-slate-300 hover:bg-slate-700 hover:text-white"
                  title="Nudge 1px Up (ArrowUp)"
                >
                  &uarr;
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlacements((prev) =>
                      prev.map((p) => (p.id === activePlacement.id ? { ...p, y: p.y + 1 } : p))
                    );
                  }}
                  className="rounded p-1 text-slate-300 hover:bg-slate-700 hover:text-white"
                  title="Nudge 1px Down (ArrowDown)"
                >
                  &darr;
                </button>
              </div>

              {/* Collision Mode Controls */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/90 px-1.5 py-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Collision:</span>
                <button
                  type="button"
                  onClick={() => handleUpdatePlacementCollisionMode("walkable")}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-semibold transition ${
                    (!activePlacement.collisionMode || activePlacement.collisionMode === "walkable") && !activePlacement.collision
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Walkable: Characters and enemies pass through freely"
                >
                  Walkable
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdatePlacementCollisionMode("blocked")}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-semibold transition ${
                    activePlacement.collisionMode === "blocked"
                      ? "bg-red-500/20 text-red-300 border border-red-500/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Blocked: Entire object blocks character & enemy movement"
                >
                  Blocked
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdatePlacementCollisionMode("custom")}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-semibold transition ${
                    activePlacement.collisionMode === "custom" || (activePlacement.collision && activePlacement.collisionMode !== "walkable" && activePlacement.collisionMode !== "blocked")
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Custom: Trunk/obstacle box blocks movement while canopy/decorations overlap"
                >
                  Custom Box
                </button>
              </div>

              {/* Visual Depth / Occlusion Control (Characters appear behind/front) */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/90 px-2 py-0.5">
                <span className="text-[10px] uppercase font-bold text-amber-400" title="Contact depth line where character passes behind or in front">
                  Depth Line:
                </span>
                <input
                  type="number"
                  min="0"
                  max={activePlacement.height}
                  value={activePlacement.occlusionDepth !== undefined ? activePlacement.occlusionDepth : activePlacement.height}
                  onChange={(e) => {
                    const depth = Math.max(0, Math.min(activePlacement.height, parseInt(e.target.value) || 0));
                    handleUpdatePlacementOcclusionDepth(depth);
                  }}
                  className="w-12 rounded bg-slate-950 px-1 py-0.5 text-center font-mono text-xs text-amber-300 outline-none border border-slate-700 focus:border-amber-400"
                  title="Y position (px from top) where characters walk behind vs in front"
                />
                <span className="text-[10px] text-slate-400">px</span>
              </div>

              {/* Opacity Control for Selected Placements */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/90 px-2 py-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Opacity:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((activePlacement.opacity !== undefined ? activePlacement.opacity : 1) * 100)}
                  onChange={(e) => {
                    const nextVal = parseInt(e.target.value) / 100;
                    handleSelectedPlacementsOpacity(nextVal);
                  }}
                  className="w-16 h-1.5 cursor-pointer accent-cyan-400"
                  title="Adjust opacity of selected placements"
                />
                <span className="font-mono text-xs text-cyan-300 w-8 text-right">
                  {Math.round((activePlacement.opacity !== undefined ? activePlacement.opacity : 1) * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectedPlacementsOpacity(1)}
                  className="rounded p-0.5 text-[10px] text-slate-400 hover:text-white"
                  title="Reset to 100%"
                >
                  100%
                </button>
              </div>

              {/* Duplicate */}
              <button
                type="button"
                onClick={() => {
                  const dup: PlacedAsset = {
                    ...activePlacement,
                    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    x: activePlacement.x + activePlacement.width,
                    y: activePlacement.y,
                  };
                  setPlacements((prev) => [...prev, dup]);
                  setSelectedPlacementId(dup.id);
                }}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-200 hover:bg-slate-700 transition"
                title="Duplicate placement (Ctrl+D)"
              >
                Duplicate
              </button>

              {/* Replace */}
              <button
                type="button"
                onClick={handleReplaceSelected}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-cyan-300 hover:bg-slate-700 transition"
                title="Replace with another tile or object"
              >
                Replace
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => {
                  setPlacements((prev) => prev.filter((p) => p.id !== activePlacement.id));
                  setSelectedPlacementId(null);
                }}
                className="rounded-lg border border-red-500/40 bg-red-950/40 px-2.5 py-1 text-red-300 hover:bg-red-900/60 transition"
                title="Delete placement (Del)"
              >
                Delete
              </button>

              {/* Cancel */}
              <button
                type="button"
                onClick={() => setSelectedPlacementId(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
                title="Deselect (Esc)"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Selection Context Bar for Blocked Areas */}
          {selectedBlockedId && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-xl border border-red-500/50 bg-slate-900/95 px-4 py-2 shadow-2xl backdrop-blur-xs text-xs z-20">
              <span className="font-semibold text-red-300">
                Blocked Collision Area
              </span>
              <button
                type="button"
                onClick={() => {
                  setBlockedAreas((prev) => prev.filter((b) => b.id !== selectedBlockedId));
                  setSelectedBlockedId(null);
                }}
                className="rounded-lg bg-red-600 px-2.5 py-1 font-bold text-white hover:bg-red-500 transition"
              >
                Remove Blocked Area
              </button>
              <button
                type="button"
                onClick={() => setSelectedBlockedId(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick HUD Navigation Stats */}
          <div className="pointer-events-none absolute bottom-3 left-4 flex items-center gap-2 rounded-lg bg-slate-900/80 px-2.5 py-1 font-mono text-[11px] text-slate-400 backdrop-blur-xs border border-slate-800/80">
            <span>Tiles: {placements.length}</span>
            <span>&middot;</span>
            <span>Blocked: {blockedAreas.length}</span>
            <span>&middot;</span>
            <span>Zoom: {camera.zoom.toFixed(1)}x</span>
            <span>&middot;</span>
            <span>Pan: Middle click or Space+Drag</span>
          </div>
        </div>

        {/* Right Dock: Dedicated Layers Panel */}
        <div className="relative z-10 w-72 shrink-0 border-l border-slate-800 bg-[#0d1424] shadow-xl">
          <LayersPanel
            layers={layers}
            activeLayerId={activeLayerId}
            onSelectLayer={handleSelectLayer}
            onAddLayer={handleAddLayer}
            onRenameLayer={handleRenameLayer}
            onToggleVisible={handleToggleVisible}
            onToggleLock={handleToggleLock}
            onMoveLayer={handleMoveLayer}
            onDeleteLayer={handleDeleteLayer}
            onChangeOpacity={handleLayerOpacityChange}
            placements={placements}
            blockedCount={blockedAreas.length}
          />
        </div>
      </div>

      {/* Tiles & Objects Selection Modal */}
      <AssetPickerModal
        isOpen={isAssetPickerOpen}
        onClose={() => {
          setIsAssetPickerOpen(false);
          setIsReplacingPlacement(false);
        }}
        assets={assets}
        isLoading={assetsLoading}
        error={assetsError}
        onSelectAsset={handleSelectAsset}
        selectedAssetId={activeAsset?.id || null}
        onRefresh={loadAssets}
      />

      {/* Saved Maps Modal */}
      <SavedMapsModal
        isOpen={isSavedMapsOpen}
        onClose={() => setIsSavedMapsOpen(false)}
        onLoadMap={handleLoadMapById}
        currentMapId={mapId}
      />
    </div>
  );
}
