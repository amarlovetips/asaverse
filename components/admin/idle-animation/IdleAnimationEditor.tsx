"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CharacterItem, IdleFrameData } from "./types";
import { getIdlePartSlot } from "./parts";
import { createClient } from "@/lib/supabase";
import IdlePartSelector from "./IdlePartSelector";
import IdleCharacterPreview from "./IdleCharacterPreview";
import IdlePixelBoard from "./IdlePixelBoard";
import IdlePixelToolSelector, { type IdlePixelTool } from "./IdlePixelToolSelector";
import IdleShapeSelector, { type IdlePixelShape } from "./IdleShapeSelector";
import IdleColorPalette from "./IdleColorPalette";
import IdlePixelMoveControls, { type PixelCoordinate } from "./IdlePixelMoveControls";
import IdleBodyOverlayToggle from "./IdleBodyOverlayToggle";
import IdleHistoryControls from "./IdleHistoryControls";
import IdleZoomControls from "./IdleZoomControls";
import { extractDesignPixels, mergeIdleFrames, readEmbeddedIdleFrames } from "@/lib/character-design-json";
import { ArrowLeft } from "lucide-react";

function emptyFrames(item: CharacterItem): IdleFrameData[] {
  return Array.from({ length: 3 }, () => ({ pixelData: { ...item.pixel_data } }));
}

function parseFrame(value: unknown, fallback: IdleFrameData): IdleFrameData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return fallback;
  const source = value as Record<string, unknown>;
  const rawPixels = source.pixelData;
  const pixelData = typeof rawPixels === "object" && rawPixels !== null && !Array.isArray(rawPixels)
    ? Object.fromEntries(Object.entries(rawPixels).filter(([coordinate, color]) => {
      const [x, y] = coordinate.split(",").map(Number);
      return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < 64 && y >= 0 && y < 64 && typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color);
    })) as Record<string, string>
    : fallback.pixelData;
  return { pixelData };
}

function framesMatch(expected: IdleFrameData[], actual: IdleFrameData[] | null) {
  if (!actual || actual.length !== 3 || expected.length !== 3) return false;
  return expected.every((frame, index) => {
    const expectedEntries = Object.entries(frame.pixelData).sort(([a], [b]) => a.localeCompare(b));
    const actualEntries = Object.entries(actual[index].pixelData).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(expectedEntries) === JSON.stringify(actualEntries);
  });
}

export default function IdleAnimationEditor({ item, items, onBack }: { item: CharacterItem; items: CharacterItem[]; onBack: () => void }) {
  const [frames, setFrames] = useState<IdleFrameData[]>(() => emptyFrames(item));
  const [activeFrame, setActiveFrame] = useState(0);
  const [color, setColor] = useState("");
  const [tool, setTool] = useState<IdlePixelTool>("paint");
  const [shape, setShape] = useState<IdlePixelShape>("freehand");
  const [selectedPixels, setSelectedPixels] = useState<PixelCoordinate[]>([]);
  const [previewPartIds, setPreviewPartIds] = useState<string[]>([]);
  const [showBody, setShowBody] = useState(true);
  const [showFace, setShowFace] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sqlNeeded, setSqlNeeded] = useState(false);
  const [historyCounts, setHistoryCounts] = useState({ undo: [0, 0, 0], redo: [0, 0, 0] });
  const undoHistory = useRef<Record<number, Record<string, string>[]>>({ 0: [], 1: [], 2: [] });
  const redoHistory = useRef<Record<number, Record<string, string>[]>>({ 0: [], 1: [], 2: [] });

  function refreshHistoryCounts() {
    setHistoryCounts({
      undo: [0, 1, 2].map(frame => undoHistory.current[frame].length),
      redo: [0, 1, 2].map(frame => redoHistory.current[frame].length),
    });
  }

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        if (item.idle_frames?.length === 3) {
          setFrames(item.idle_frames.map(frame => ({ pixelData: { ...frame.pixelData } })));
          setMessage("Saved frame data loaded from this item's JSON.");
          return;
        }
        const { data, error } = await createClient().from("character_idle_animations")
          .select("frame_number,frame_data").eq("character_design_id", item.id).order("frame_number");
        if (error) throw error;
        if (!alive) return;
        if (!data?.length) return;
        const loaded = emptyFrames(item);
        for (const row of data as { frame_number: number; frame_data: unknown }[]) {
          if (row.frame_number >= 1 && row.frame_number <= 3) loaded[row.frame_number - 1] = parseFrame(row.frame_data, loaded[row.frame_number - 1]);
        }
        setFrames(loaded);
        setMessage("Saved frame data loaded.");
      } catch (cause) {
        if (!alive) return;
        setSqlNeeded(true);
        setMessage(cause instanceof Error ? cause.message : "Frame data could not be loaded. Check Supabase access.");
      }
    })();
    return () => { alive = false; };
  }, [item]);

  function updatePixels(pixelData: Record<string, string>) {
    setFrames(current => current.map((frame, index) => index === activeFrame ? { ...frame, pixelData } : frame));
  }

  function commitPixels(pixelData: Record<string, string>) {
    undoHistory.current[activeFrame] = [...undoHistory.current[activeFrame], { ...frames[activeFrame].pixelData }].slice(-100);
    redoHistory.current[activeFrame] = [];
    refreshHistoryCounts();
    updatePixels(pixelData);
  }

  function undo() {
    const history = undoHistory.current[activeFrame];
    if (!history.length) return;
    const previous = history[history.length - 1];
    undoHistory.current[activeFrame] = history.slice(0, -1);
    redoHistory.current[activeFrame] = [...redoHistory.current[activeFrame], { ...frames[activeFrame].pixelData }];
    refreshHistoryCounts();
    updatePixels(previous);
    setSelectedPixels([]);
  }

  function redo() {
    const history = redoHistory.current[activeFrame];
    if (!history.length) return;
    const next = history[history.length - 1];
    redoHistory.current[activeFrame] = history.slice(0, -1);
    undoHistory.current[activeFrame] = [...undoHistory.current[activeFrame], { ...frames[activeFrame].pixelData }].slice(-100);
    refreshHistoryCounts();
    updatePixels(next);
    setSelectedPixels([]);
  }

  function moveSelectedPixels(dx: number, dy: number): boolean {
    if (!selectedPixels.length) return false;
    const data = frames[activeFrame].pixelData;
    const selectedKeys = new Set(selectedPixels.map(point => point.x + "," + point.y));
    const destinations = selectedPixels.map(point => ({ x: point.x + dx, y: point.y + dy }));
    if (destinations.some(point => point.x < 0 || point.y < 0 || point.x >= item.canvas_width || point.y >= item.canvas_height)) return false;
    if (destinations.some(point => data[point.x + "," + point.y] && !selectedKeys.has(point.x + "," + point.y))) return false;
    const moved = { ...data };
    const colors = selectedPixels.map(point => data[point.x + "," + point.y]);
    for (const point of selectedPixels) delete moved[point.x + "," + point.y];
    destinations.forEach((point, index) => { moved[point.x + "," + point.y] = colors[index]; });
    commitPixels(moved);
    setSelectedPixels(destinations);
    return true;
  }

  function toggleItem(selected: CharacterItem) {
    setPreviewPartIds(current => {
      if (current.includes(selected.id)) return current.filter(id => id !== selected.id);
      const slot = getIdlePartSlot(selected);
      return [...current.filter(id => {
        const existing = items.find(itemData => itemData.id === id);
        return !slot || !existing || getIdlePartSlot(existing) !== slot;
      }), selected.id];
    });
  }

  async function saveFrames() {
    setBusy(true);
    setMessage("");
    try {
      const db = createClient();
      const { data: auth, error: authError } = await db.auth.getUser();
      if (authError || !auth.user) throw new Error("Please sign in again.");
      const { data: admin, error: adminError } = await db.from("admin_users").select("role,is_active")
        .eq("user_id", auth.user.id).maybeSingle();
      if (adminError || admin?.role !== "admin" || !admin.is_active) throw new Error("Admin permission denied.");
      const { data: existing, error: readError } = await db.from("character_designs")
        .select("pixel_data").eq("id", item.id).maybeSingle();
      if (readError) throw readError;
      if (!existing) throw new Error("This item was not found in the database.");
      const currentPixels = extractDesignPixels(existing.pixel_data, item.canvas_width);
      const pixelData = mergeIdleFrames(existing.pixel_data, currentPixels, frames);
      const { data, error } = await db.from("character_designs")
        .update({ pixel_data: pixelData, updated_at: new Date().toISOString() })
        .eq("id", item.id).select("id,pixel_data").maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("The design was not updated in the database. Check admin access or the RLS policy.");
      const savedFrames = readEmbeddedIdleFrames(data.pixel_data);
      if (!framesMatch(frames, savedFrames)) throw new Error("The three frames did not match the database after saving. Please try again.");
      setSqlNeeded(false);
      setMessage("All three frames were saved to this item's JSON and verified.");
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "Frame save failed.";
      setSqlNeeded(/character_idle_animations|relation|schema cache|does not exist/i.test(detail));
      setMessage(detail);
    } finally {
      setBusy(false);
    }
  }

  const current = frames[activeFrame];
  const suggestedColors = useMemo(() => {
    const used = new Set<string>();
    for (const savedItem of items) for (const value of Object.values(savedItem.pixel_data || {})) {
      if (/^#[0-9a-f]{6}$/i.test(value)) used.add(value.toLowerCase());
    }
    for (const value of Object.values(current.pixelData)) if (/^#[0-9a-f]{6}$/i.test(value)) used.add(value.toLowerCase());
    return [...used];
  }, [items, current.pixelData]);
  const activeColor = color || suggestedColors[0] || "";
  const defaultForSlot = (slot: "body" | "face") => items.find(saved => getIdlePartSlot(saved) === slot && saved.is_default_base)
    || items.find(saved => getIdlePartSlot(saved) === slot);
  const baseBody = defaultForSlot("body");
  const baseFace = defaultForSlot("face");
  // The active body/face art is already on the canvas; do not draw its default overlay underneath it.
  const bodyPixels = getIdlePartSlot(item) === 'body' ? {} : extractDesignPixels(baseBody?.pixel_data, item.canvas_width);
  const facePixels = getIdlePartSlot(item) === 'face' ? {} : extractDesignPixels(baseFace?.pixel_data, item.canvas_width);

  return <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden bg-[#0b1017] p-2 text-slate-100 sm:p-3">
    <div className="flex min-h-10 shrink-0 items-center gap-2 overflow-x-auto rounded-lg border border-slate-800 bg-[#111821] px-2 py-1.5">
        <button type="button" onClick={onBack} title="Back to Character Idle list" aria-label="Back to Character Idle list"
          className="grid size-8 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"><ArrowLeft size={16} /></button>
        <IdleHistoryControls canUndo={historyCounts.undo[activeFrame] > 0} canRedo={historyCounts.redo[activeFrame] > 0} onUndo={undo} onRedo={redo} />
        <IdleShapeSelector activeShape={shape} onSelect={setShape} />
        <span className="h-6 w-px shrink-0 bg-slate-700" />
        <IdleColorPalette colors={suggestedColors} selectedColor={activeColor} onSelect={setColor} />
        <span className="h-6 w-px shrink-0 bg-slate-700" />
        <IdlePixelMoveControls selectedPixels={selectedPixels} onMove={moveSelectedPixels} onDeselect={() => setSelectedPixels([])} />
        <span className="h-6 w-px shrink-0 bg-slate-700" />
        <IdleBodyOverlayToggle bodyChecked={showBody} faceChecked={showFace}
          onBodyChange={setShowBody} onFaceChange={setShowFace} />
        <span className="h-6 w-px shrink-0 bg-slate-700" />
        <IdleZoomControls zoom={zoom} onChange={setZoom} />
    </div>

    {(message || sqlNeeded) && <p role={sqlNeeded ? "alert" : "status"} className="shrink-0 break-words rounded-md border border-slate-800 bg-[#111821] px-3 py-1.5 text-[10px] text-slate-300">
      {message}{sqlNeeded ? " · Check the table or permissions required to load existing frames from Supabase." : ""}
    </p>}

    <main className="grid min-h-0 flex-1 grid-cols-[42px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_minmax(128px,30vh)] gap-2 lg:grid-cols-[46px_minmax(0,1fr)_250px] lg:grid-rows-[minmax(0,1fr)]">
      <div className="row-span-1 min-h-0"><IdlePixelToolSelector activeTool={tool} onSelect={setTool} /></div>
      <div className="min-h-0 overflow-hidden rounded-lg border border-slate-800 bg-[#111821] p-1.5 sm:p-2">
        <IdlePixelBoard key={`${item.id}-${activeFrame}`} size={item.canvas_width} zoom={zoom} onZoomChange={setZoom} pixels={current.pixelData}
          bodyPixels={bodyPixels} facePixels={facePixels} showBody={showBody} showFace={showFace}
          color={activeColor} tool={tool} shape={shape}
          selectedPixels={selectedPixels} onSelectPixels={setSelectedPixels} onMoveSelection={moveSelectedPixels} onPixelsChange={commitPixels} />
      </div>
      <aside className="col-span-2 grid min-h-0 grid-cols-[minmax(112px,0.55fr)_minmax(0,1fr)] gap-2 overflow-hidden rounded-lg border border-slate-800 bg-[#111821] p-2 lg:col-span-1 lg:grid-cols-1 lg:grid-rows-[auto_minmax(0,1fr)]">
        <IdleCharacterPreview items={items} target={item} frames={frames} activeFrame={activeFrame} selectedIds={previewPartIds}
          onSelectFrame={frame => { setActiveFrame(frame); setSelectedPixels([]); }} onSave={() => void saveFrames()}
          saving={busy} size={208} />
        <IdlePartSelector items={items} selectedIds={previewPartIds} onToggle={toggleItem} />
      </aside>
    </main>
  </div>;
}
