"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eraser, Plus, Redo2, Trash2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { adminMenuHref } from "../menu-config";
import { getAssetDataUrl } from "./lib/assetRenderer";
import { deleteSelectionPixels, moveSelectionPixels, selectionPixelsFromRect, transformSelectionPixels } from "./lib/selectionOperations.mjs";
import { fetchAllMapAssets, saveTileObjectAnimation, type AssetRecord } from "./lib/supabaseAssets";

type ToolMode = "paint" | "erase" | "select";

function cloneFrames(frames: Record<string, string>[]): Record<string, string>[] {
  return frames.map((frame) => ({ ...frame }));
}

function normalizeFrames(asset: AssetRecord): Record<string, string>[] {
  const frames = asset.animation?.frames && asset.animation.frames.length > 0 ? asset.animation.frames : [asset.pixel_data || {}];
  return cloneFrames(frames.map((frame) => ({ ...frame })));
}

function parseCellKey(value: string): { x: number; y: number } | null {
  const [x, y] = value.split(",").map(Number);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

export default function TilesObjectsAnimationWorkspace({ routeRemainder = [] }: { routeRemainder?: string[] }) {
  const selectedId = routeRemainder[0] && routeRemainder[0] !== "new" ? decodeURIComponent(routeRemainder[0]) : null;

  if (selectedId) {
    return <AssetAnimationEditorPage selectedId={selectedId} />;
  }

  return <AssetListPage />;
}

function AssetListPage() {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const listHref = adminMenuHref("Map Tools", "Tiles & Objects Animation");

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const items = await fetchAllMapAssets(true);
        if (!alive) return;
        const next = items.filter((asset) => asset.category && asset.category.toLowerCase() !== "map");
        setAssets(next);
      } catch (error) {
        if (alive) setMessage(error instanceof Error ? error.message : "Failed to load assets.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[#070b13] p-5 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">Map Tools</p>
          <h1 className="text-2xl font-black text-white">Tiles &amp; Objects Animation</h1>
          <p className="text-sm text-slate-400">Select a published tile or object to open its dedicated full-page animation editor.</p>
        </header>

        {message ? <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">{message}</div> : null}

        {loading ? (
          <div className="text-sm text-slate-400">Loading published assets…</div>
        ) : assets.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-[#0b1220] p-8 text-center text-sm text-slate-400">No eligible published tiles or objects found.</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {assets.map((asset) => {
              const hasAnimation = Array.isArray(asset.animation?.frames) && asset.animation.frames.length > 1;
              const preview = getAssetDataUrl(asset);
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => window.history.pushState(null, "", `${listHref}/${encodeURIComponent(asset.id)}`)}
                  className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1220] text-left transition hover:border-cyan-500 hover:bg-slate-900"
                >
                  <div className="grid aspect-square place-items-center bg-[radial-gradient(ellipse_at_center,#173040,#080c13_72%)] p-4">
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt={asset.name} className="max-h-20 max-w-20 object-contain" style={{ imageRendering: "pixelated" }} />
                    ) : (
                      <span className="text-[11px] text-slate-500">No art</span>
                    )}
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="truncate text-sm font-bold text-white" title={asset.name}>{asset.name}</h2>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${hasAnimation ? "bg-amber-500/15 text-amber-200" : "bg-slate-700 text-slate-300"}`}>
                        {hasAnimation ? "Animated" : "Static"}
                      </span>
                    </div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">{asset.category}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{asset.canvas_width}×{asset.canvas_height}</span>
                      <span>{asset.is_published ? "Published" : "Saved"}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AssetAnimationEditorPage({ selectedId }: { selectedId: string }) {
  const [asset, setAsset] = useState<AssetRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const listHref = adminMenuHref("Map Tools", "Tiles & Objects Animation");

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        setLoading(true);
        const items = await fetchAllMapAssets();
        if (!live) return;
        const match = items.find((item) => item.id === selectedId);
        if (!match) {
          setMessage("Selected asset could not be found.");
          setAsset(null);
          return;
        }
        setAsset(match);
      } catch (error) {
        if (live) setMessage(error instanceof Error ? error.message : "Failed to load asset.");
      } finally {
        if (live) setLoading(false);
      }
    })();

    return () => { live = false; };
  }, [selectedId]);

  if (loading) {
    return <div className="grid h-full place-items-center bg-[#070b13] text-slate-400">Loading animation editor…</div>;
  }

  if (!asset) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#070b13] text-slate-200">
        <p className="text-lg font-semibold text-white">Asset not found</p>
        <button type="button" onClick={() => window.history.pushState(null, "", listHref)} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500">Back to Asset List</button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#070b13] text-slate-100">
      <div className="min-h-0 flex-1 overflow-hidden">
        <AnimationEditor
          key={asset.id}
          asset={asset}
          onUpdated={(nextAsset) => setAsset(nextAsset)}
        />
      </div>
      {message ? <div className="border-t border-slate-800 px-4 py-2 text-xs text-amber-200">{message}</div> : null}
    </div>
  );
}

function AnimationEditor({ asset, onUpdated }: { asset: AssetRecord; onUpdated: (updated: AssetRecord) => void }) {
  const [frames, setFrames] = useState<Record<string, string>[]>(() => normalizeFrames(asset));
  const [activeFrame, setActiveFrame] = useState(0);
  const [tool, setTool] = useState<ToolMode>("paint");
  const [color, setColor] = useState(asset.palette?.[0] || "#ffffff");
  const [zoom, setZoom] = useState(14);
  const [pan, setPan] = useState({ x: 12, y: 12 });
  const [durationMs, setDurationMs] = useState(asset.animation?.duration_ms ?? 250);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState("");
  const [selection, setSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [selectedPixels, setSelectedPixels] = useState<Array<{ x: number; y: number; color: string }>>([]);
  const [clipboard, setClipboard] = useState<Array<{ x: number; y: number; color: string }>>([]);
  const [customColors, setCustomColors] = useState<string[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<Record<string, string>[][]>([]);
  const redoRef = useRef<Record<string, string>[][]>([]);
  const drawingRef = useRef(false);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const selectionDragRef = useRef<{
    startCell: { x: number; y: number };
    originSelection: { x: number; y: number; width: number; height: number };
    origin: Array<{ x: number; y: number; color: string }>;
    basePixels: Record<string, string>;
    underlayPixels: Array<{ x: number; y: number; color: string }>;
  } | null>(null);
  const selectionUnderlayRef = useRef<Array<{ x: number; y: number; color: string }>>([] as Array<{ x: number; y: number; color: string }>);
  const panOriginRef = useRef<{ x: number; y: number; clientX: number; clientY: number } | null>(null);

  const assetColors = useMemo(() => {
    const colors = new Set<string>();
    Object.values(asset.pixel_data ?? {}).forEach((color) => {
      if (color) colors.add(color);
    });
    return [...colors];
  }, [asset.pixel_data]);

  const palette = useMemo(() => [...new Set([...assetColors, ...customColors])], [assetColors, customColors]);
  const currentPixels = useMemo(() => frames[activeFrame] ?? {}, [activeFrame, frames]);

  const syncSelectionFromRect = useCallback((nextSelection: { x: number; y: number; width: number; height: number } | null) => {
    if (!nextSelection) {
      setSelection(null);
      setSelectedPixels([]);
      return;
    }
    const picked = selectionPixelsFromRect(nextSelection, currentPixels);
    setSelection(nextSelection);
    setSelectedPixels(picked);
  }, [currentPixels]);

  const cancelSelectionDrag = useCallback(() => {
    if (!selectionDragRef.current) return;
    setSelection(selectionDragRef.current.originSelection);
    setSelectedPixels(selectionDragRef.current.origin.map((pixel) => ({ ...pixel })));
    selectionDragRef.current = null;
    drawingRef.current = false;
  }, []);

  const rememberState = useCallback((nextFrames: Record<string, string>[]) => {
    historyRef.current = [...historyRef.current, cloneFrames(frames)].slice(-40);
    redoRef.current = [];
    setFrames(nextFrames);
  }, [frames]);

  const undo = useCallback(() => {
    if (!historyRef.current.length) return;
    const previous = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    redoRef.current = [...redoRef.current, cloneFrames(frames)].slice(-40);
    setFrames(previous);
    setSelection(null);
    setSelectedPixels([]);
  }, [frames]);

  const redo = useCallback(() => {
    if (!redoRef.current.length) return;
    const next = redoRef.current[redoRef.current.length - 1];
    redoRef.current = redoRef.current.slice(0, -1);
    historyRef.current = [...historyRef.current, cloneFrames(frames)].slice(-40);
    setFrames(next);
    setSelection(null);
    setSelectedPixels([]);
  }, [frames]);

  const updateCurrentFrame = useCallback((updater: (pixels: Record<string, string>) => Record<string, string>) => {
    const nextPixels = updater({ ...currentPixels });
    const nextFrames = frames.map((frame, index) => (index === activeFrame ? nextPixels : frame));
    rememberState(nextFrames);
  }, [activeFrame, currentPixels, frames, rememberState]);

  const paintPixel = useCallback((x: number, y: number) => {
    updateCurrentFrame((pixels) => {
      pixels[`${x},${y}`] = color;
      return pixels;
    });
  }, [color, updateCurrentFrame]);

  const erasePixel = useCallback((x: number, y: number) => {
    updateCurrentFrame((pixels) => {
      delete pixels[`${x},${y}`];
      return pixels;
    });
  }, [updateCurrentFrame]);

  const addFrame = useCallback(() => {
    const nextFrames = [...frames, { ...currentPixels }];
    rememberState(nextFrames);
    setActiveFrame(nextFrames.length - 1);
    setPlaying(false);
    setSelection(null);
    setSelectedPixels([]);
  }, [currentPixels, frames, rememberState]);

  const deleteFrame = useCallback(() => {
    if (frames.length <= 1) return;
    const nextFrames = frames.filter((_, index) => index !== activeFrame);
    const nextIndex = Math.min(activeFrame, nextFrames.length - 1);
    rememberState(nextFrames);
    setActiveFrame(nextIndex);
  }, [activeFrame, frames, rememberState]);

  const moveSelected = useCallback((dx: number, dy: number) => {
    if (!selectedPixels.length || !selection) return;
    const baseAfterCut = { ...currentPixels };
    for (const pixel of selectedPixels) delete baseAfterCut[`${pixel.x},${pixel.y}`];
    const result = moveSelectionPixels({
      basePixels: currentPixels,
      selection,
      selectedPixels,
      dx,
      dy,
      canvasWidth: asset.canvas_width,
      canvasHeight: asset.canvas_height,
      underlayPixels: selectionUnderlayRef.current,
    });
    if (!result.moved) return;
    updateCurrentFrame(() => result.pixels);
    const destinationUnderlay = selectionPixelsFromRect(result.selection, baseAfterCut);
    selectionUnderlayRef.current = destinationUnderlay.map((pixel) => ({ ...pixel }));
    setSelection(result.selection);
    setSelectedPixels(result.selectedPixels);
  }, [asset.canvas_height, asset.canvas_width, currentPixels, selectedPixels, selection, updateCurrentFrame]);

  const deleteSelected = useCallback(() => {
    if (!selectedPixels.length) return;
    const next = deleteSelectionPixels(currentPixels, selectedPixels);
    updateCurrentFrame(() => next);
    setSelectedPixels([]);
    setSelection(null);
  }, [currentPixels, selectedPixels, updateCurrentFrame]);

  const copySelection = useCallback(() => {
    if (!selectedPixels.length) return;
    setClipboard(selectedPixels.map((pixel) => ({ ...pixel })));
    setMessage("Selection copied.");
  }, [selectedPixels]);

  const pasteSelection = useCallback(() => {
    if (!clipboard.length) return;
    const next = { ...currentPixels };
    const baseX = selection ? selection.x : 0;
    const baseY = selection ? selection.y : 0;
    const minX = Math.min(...clipboard.map((pixel) => pixel.x));
    const minY = Math.min(...clipboard.map((pixel) => pixel.y));
    const offsetX = baseX - minX;
    const offsetY = baseY - minY;
    for (const pixel of clipboard) {
      const destX = pixel.x + offsetX;
      const destY = pixel.y + offsetY;
      if (destX < 0 || destY < 0 || destX >= asset.canvas_width || destY >= asset.canvas_height) continue;
      next[`${destX},${destY}`] = pixel.color;
    }
    const pasted = clipboard.map((pixel) => ({ x: pixel.x + offsetX, y: pixel.y + offsetY, color: pixel.color }));
    updateCurrentFrame(() => next);
    setSelectedPixels(pasted);
    setSelection({ x: Math.min(...pasted.map((pixel) => pixel.x)), y: Math.min(...pasted.map((pixel) => pixel.y)), width: Math.max(...pasted.map((pixel) => pixel.x)) - Math.min(...pasted.map((pixel) => pixel.x)) + 1, height: Math.max(...pasted.map((pixel) => pixel.y)) - Math.min(...pasted.map((pixel) => pixel.y)) + 1 });
  }, [asset.canvas_height, asset.canvas_width, clipboard, currentPixels, selection, updateCurrentFrame]);

  const flipSelection = useCallback((horizontal: boolean) => {
    if (!selection || !selectedPixels.length) return;
    const mode = horizontal ? "flip-horizontal" : "flip-vertical";
    const result = transformSelectionPixels({
      basePixels: currentPixels,
      selection,
      selectedPixels,
      mode,
      canvasWidth: asset.canvas_width,
      canvasHeight: asset.canvas_height,
    });
    if (!result.changed) return;
    updateCurrentFrame(() => result.pixels);
    setSelectedPixels(result.selectedPixels);
    setSelection(result.selection);
  }, [asset.canvas_height, asset.canvas_width, currentPixels, selectedPixels, selection, updateCurrentFrame]);

  const rotateSelection = useCallback((direction: "left" | "right") => {
    if (!selection || !selectedPixels.length) return;
    const result = transformSelectionPixels({
      basePixels: currentPixels,
      selection,
      selectedPixels,
      mode: direction === "left" ? "rotate-left" : "rotate-right",
      canvasWidth: asset.canvas_width,
      canvasHeight: asset.canvas_height,
    });
    if (!result.changed) return;
    updateCurrentFrame(() => result.pixels);
    setSelectedPixels(result.selectedPixels);
    setSelection(result.selection);
  }, [asset.canvas_height, asset.canvas_width, currentPixels, selectedPixels, selection, updateCurrentFrame]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = (asset.canvas_width + 2) * zoom;
    canvas.height = (asset.canvas_height + 2) * zoom;
    canvas.style.transform = `translate(${pan.x}px, ${pan.y}px)`;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let x = 0; x <= asset.canvas_width; x += 1) {
      const px = x * zoom + zoom;
      ctx.beginPath();
      ctx.moveTo(px, zoom);
      ctx.lineTo(px, zoom + asset.canvas_height * zoom);
      ctx.stroke();
    }
    for (let y = 0; y <= asset.canvas_height; y += 1) {
      const py = y * zoom + zoom;
      ctx.beginPath();
      ctx.moveTo(zoom, py);
      ctx.lineTo(zoom + asset.canvas_width * zoom, py);
      ctx.stroke();
    }
    const current = frames[activeFrame] ?? {};
    Object.entries(current).forEach(([coord, color]) => {
      const parsed = parseCellKey(coord);
      if (!parsed) return;
      ctx.fillStyle = color || "transparent";
      ctx.fillRect(parsed.x * zoom + zoom, parsed.y * zoom + zoom, zoom, zoom);
    });
    if (selectedPixels.length) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      selectedPixels.forEach((pixel) => {
        ctx.fillStyle = pixel.color;
        ctx.fillRect(pixel.x * zoom + zoom, pixel.y * zoom + zoom, zoom, zoom);
      });
      ctx.restore();
    }
    if (selection) {
      const rectX = selection.x * zoom + zoom;
      const rectY = selection.y * zoom + zoom;
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 2;
      ctx.strokeRect(rectX, rectY, selection.width * zoom, selection.height * zoom);
    }
  }, [activeFrame, asset.canvas_height, asset.canvas_width, frames, pan, selectedPixels, selection, zoom]);

  useEffect(() => {
    if (!playing || frames.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveFrame((prev) => (prev + 1) % frames.length);
    }, Math.max(80, durationMs));
    return () => window.clearInterval(timer);
  }, [frames.length, durationMs, playing]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
      if (!selectedPixels.length) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); moveSelected(-1, 0); }
      if (event.key === "ArrowRight") { event.preventDefault(); moveSelected(1, 0); }
      if (event.key === "ArrowUp") { event.preventDefault(); moveSelected(0, -1); }
      if (event.key === "ArrowDown") { event.preventDefault(); moveSelected(0, 1); }
      if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); deleteSelected(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelected, moveSelected, selectedPixels.length]);

  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button === 1) {
      event.preventDefault();
      panOriginRef.current = { x: pan.x, y: pan.y, clientX: event.clientX, clientY: event.clientY };
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const cellX = Math.floor(localX / zoom) - 1;
    const cellY = Math.floor(localY / zoom) - 1;
    if (cellX < 0 || cellY < 0 || cellX >= asset.canvas_width || cellY >= asset.canvas_height) return;

    if (event.button === 0 && tool === "select") {
      if (selection && cellX >= selection.x && cellY >= selection.y && cellX < selection.x + selection.width && cellY < selection.y + selection.height) {
        selectionDragRef.current = {
          startCell: { x: cellX, y: cellY },
          originSelection: { ...selection },
          origin: selectedPixels.map((pixel) => ({ ...pixel })),
          basePixels: { ...currentPixels },
          underlayPixels: selectionUnderlayRef.current.map((pixel) => ({ ...pixel })),
        };
        drawingRef.current = true;
        return;
      }
      selectionStartRef.current = { x: cellX, y: cellY };
      setSelection({ x: cellX, y: cellY, width: 1, height: 1 });
      drawingRef.current = true;
      return;
    }

    if (event.button !== 0) return;
    drawingRef.current = true;
    if (tool === "paint") paintPixel(cellX, cellY);
    if (tool === "erase") erasePixel(cellX, cellY);
  };

  const handleCanvasPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (panOriginRef.current) {
      const dx = event.clientX - panOriginRef.current.clientX;
      const dy = event.clientY - panOriginRef.current.clientY;
      setPan({ x: panOriginRef.current.x + dx, y: panOriginRef.current.y + dy });
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const cellX = Math.floor(localX / zoom) - 1;
    const cellY = Math.floor(localY / zoom) - 1;

    if (selectionDragRef.current) {
      const drag = selectionDragRef.current;
      const deltaX = cellX - drag.startCell.x;
      const deltaY = cellY - drag.startCell.y;
      const previewPixels = drag.origin.map((pixel) => ({ x: pixel.x + deltaX, y: pixel.y + deltaY, color: pixel.color })).filter((pixel) => pixel.x >= 0 && pixel.y >= 0 && pixel.x < asset.canvas_width && pixel.y < asset.canvas_height);
      const nextSelection = {
        x: drag.originSelection.x + deltaX,
        y: drag.originSelection.y + deltaY,
        width: drag.originSelection.width,
        height: drag.originSelection.height,
      };
      setSelection(nextSelection);
      setSelectedPixels(previewPixels);
      return;
    }

    if (!drawingRef.current) return;
    if (tool === "select" && selectionStartRef.current) {
      const start = selectionStartRef.current;
      const minX = Math.min(start.x, cellX);
      const maxX = Math.max(start.x, cellX);
      const minY = Math.min(start.y, cellY);
      const maxY = Math.max(start.y, cellY);
      syncSelectionFromRect({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 });
      return;
    }
    if (tool === "paint") paintPixel(cellX, cellY);
    if (tool === "erase") erasePixel(cellX, cellY);
  };

  const handleCanvasPointerUp = () => {
    if (panOriginRef.current) {
      panOriginRef.current = null;
      return;
    }
    if (selectionDragRef.current) {
      const drag = selectionDragRef.current;
      const deltaX = selection ? selection.x - drag.originSelection.x : 0;
      const deltaY = selection ? selection.y - drag.originSelection.y : 0;
      const result = moveSelectionPixels({
        basePixels: drag.basePixels,
        selection: drag.originSelection,
        selectedPixels: drag.origin,
        dx: deltaX,
        dy: deltaY,
        canvasWidth: asset.canvas_width,
        canvasHeight: asset.canvas_height,
        underlayPixels: drag.underlayPixels,
      });
      if (result.moved) {
        const nextFrames = frames.map((frame, index) => (index === activeFrame ? result.pixels : frame));
        rememberState(nextFrames);
        if (result.selection) {
          const baseAfterCut = { ...drag.basePixels };
          for (const pixel of drag.origin) delete baseAfterCut[`${pixel.x},${pixel.y}`];
          const underlay = selectionPixelsFromRect(result.selection, baseAfterCut);
          selectionUnderlayRef.current = underlay.map((pixel) => ({ ...pixel }));
        }
        setSelection(result.selection);
        setSelectedPixels(result.selectedPixels);
      } else {
        setSelection(drag.originSelection);
        setSelectedPixels(drag.origin.map((pixel) => ({ ...pixel })));
      }
      selectionDragRef.current = null;
      drawingRef.current = false;
      return;
    }
    selectionUnderlayRef.current = [];
    drawingRef.current = false;
    selectionStartRef.current = null;
    if (tool === "select" && selection) {
      syncSelectionFromRect(selection);
    }
  };

  const handleCanvasWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const previousZoom = zoom;
    const targetZoom = Math.min(36, Math.max(8, previousZoom + (event.deltaY < 0 ? 2 : -2)));
    if (targetZoom === previousZoom) return;
    const nextPanX = pan.x - (localX * (targetZoom / previousZoom - 1));
    const nextPanY = pan.y - (localY * (targetZoom / previousZoom - 1));
    setPan({ x: nextPanX, y: nextPanY });
    setZoom(targetZoom);
  };

  const saveAnimation = async () => {
    try {
      const updated = await saveTileObjectAnimation(asset, frames, durationMs);
      onUpdated(updated);
      setMessage("Animation saved to the original asset.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden p-2">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button type="button" onClick={() => window.history.pushState(null, "", adminMenuHref("Map Tools", "Tiles & Objects Animation"))} className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-200 hover:border-slate-600">Back</button>
        <button type="button" onClick={undo} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:border-slate-600" aria-label="Undo"><Undo2 size={15} /></button>
        <button type="button" onClick={redo} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:border-slate-600" aria-label="Redo"><Redo2 size={15} /></button>
        <button type="button" onClick={deleteFrame} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:border-slate-600" aria-label="Delete frame"><Trash2 size={15} /></button>
        <button type="button" onClick={addFrame} className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-500" aria-label="Add frame"><Plus size={14} className="inline" /> Add Frame</button>
        <button type="button" onClick={() => setTool("paint")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tool === "paint" ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}>Paint</button>
        <button type="button" onClick={() => setTool("erase")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tool === "erase" ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}><Eraser size={12} className="inline" /> Erase</button>
        <button type="button" onClick={() => setTool("select")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tool === "select" ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}>Select</button>
        <button type="button" onClick={() => setZoom((value) => Math.min(36, value + 2))} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200"><ZoomIn size={15} /></button>
        <button type="button" onClick={() => setZoom((value) => Math.max(8, value - 2))} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200"><ZoomOut size={15} /></button>
        <div className="flex items-center gap-1 text-xs text-slate-300">
          <label>Color</label>
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-8 w-10 rounded border border-slate-700 bg-slate-900" />
          <button type="button" onClick={() => {
            setCustomColors((current) => (current.includes(color) ? current : [...current, color]));
          }} className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-200">Add</button>
        </div>
        <label className="text-xs text-slate-300">Speed</label>
        <input type="range" min={80} max={1200} step={10} value={durationMs} onChange={(event) => setDurationMs(Number(event.target.value))} />
        <span className="text-xs text-slate-300">{durationMs}ms</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-200">Move Tool</span>
          <button type="button" onClick={() => moveSelected(-1, 0)} className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200" title="Move left">←</button>
          <button type="button" onClick={() => moveSelected(1, 0)} className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200" title="Move right">→</button>
          <button type="button" onClick={() => moveSelected(0, -1)} className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200" title="Move up">↑</button>
          <button type="button" onClick={() => moveSelected(0, 1)} className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200" title="Move down">↓</button>
          <button type="button" onClick={copySelection} className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-200" title="Copy selection">Copy</button>
          <button type="button" onClick={pasteSelection} className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-200" title="Paste selection">Paste</button>
          <button type="button" onClick={() => flipSelection(true)} className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-200" title="Flip horizontal">Flip H</button>
          <button type="button" onClick={() => flipSelection(false)} className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-200" title="Flip vertical">Flip V</button>
          <button type="button" onClick={() => rotateSelection("left")} className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-200" title="Rotate Left 90°">Rotate L</button>
          <button type="button" onClick={() => rotateSelection("right")} className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-200" title="Rotate Right 90°">Rotate R</button>
          <button type="button" onClick={deleteSelected} className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-200" title="Delete selection">Delete</button>
          <button type="button" onClick={() => { setSelectedPixels([]); setSelection(null); }} className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-200" title="Deselect">Deselect</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {[...palette].map((swatch) => (
          <button key={swatch} type="button" onClick={() => setColor(swatch)} className={`h-7 w-7 rounded-sm border ${color === swatch ? "border-cyan-400" : "border-slate-700"}`} style={{ background: swatch }} title={swatch} aria-label={`Color ${swatch}`} />
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_220px] gap-2 overflow-hidden">
        <div className="relative min-h-0 overflow-auto rounded-xl border border-slate-800 bg-[#070b13]">
          <div className="absolute left-2 top-2 z-10 flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/90 px-2 py-1 text-[10px] text-slate-300">
            <span>Frame {activeFrame + 1}</span>
            <span>/</span>
            <span>{frames.length}</span>
            <button type="button" onClick={() => setPlaying((value) => !value)} className="rounded bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700">
              {playing ? "Pause" : "Preview"}
            </button>
          </div>
          <div className="h-full w-full overflow-auto p-2">
            <canvas
              ref={canvasRef}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerLeave={() => {
                if (selectionDragRef.current) {
                  cancelSelectionDrag();
                  return;
                }
                handleCanvasPointerUp();
              }}
              onPointerCancel={cancelSelectionDrag}
              onWheel={handleCanvasWheel}
              className="block cursor-crosshair rounded border border-slate-700 bg-[#0b1220]"
              style={{ width: `${(asset.canvas_width + 2) * zoom}px`, height: `${(asset.canvas_height + 2) * zoom}px`, touchAction: "none" }}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-2 rounded-xl border border-slate-800 bg-[#0b1220] p-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Timeline</div>
          <div className="space-y-2 overflow-y-auto pr-1">
            {frames.map((frame, index) => {
              const active = index === activeFrame;
              const framePreview = getAssetDataUrl({ ...asset, pixel_data: frame, animation: null, updated_at: asset.updated_at });
              return (
                <button
                  key={`${asset.id}-${index}`}
                  type="button"
                  onClick={() => setActiveFrame(index)}
                  className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left transition ${active ? "border-cyan-400 bg-cyan-950/30" : "border-slate-700 bg-slate-900/60"}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-slate-700 bg-[#070b13]">
                    {framePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={framePreview} alt={`Frame ${index + 1}`} className="max-h-10 max-w-10 object-contain" style={{ imageRendering: "pixelated" }} />
                    ) : (
                      <span className="text-[9px] text-slate-500">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-200">Frame {index + 1}</span>
                    <span className="text-[10px] text-slate-400">{Object.keys(frame).length} pixels</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-auto space-y-2 border-t border-slate-800 pt-2">
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <span>Animation state</span>
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-200">{asset.animation && asset.animation.frames.length > 1 ? "Saved" : "New"}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { const next = { ...currentPixels }; Object.keys(next).forEach((key) => delete next[key]); updateCurrentFrame(() => next); }} className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-600">Clear</button>
              <button type="button" onClick={saveAnimation} className="flex-1 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-500">Save</button>
            </div>
            {message ? <div className="text-[11px] text-amber-200">{message}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
