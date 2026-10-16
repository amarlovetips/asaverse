"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { composeWalkingFrame, createWalkingFrameOverlay, extractDesignPixels, getWalkingFrameDurationMs, jsonDataEquals, mergeIdleFrames, mergeWalkingAnimation, readDesignSidePixels, readEmbeddedIdleFrames, readEmbeddedWalkingAnimation, type IdleAnimationFrameJson, type WalkDirection } from "@/lib/character-design-json";
import type { IdlePixelShape } from "../idle-animation/IdleShapeSelector";
import type { IdlePixelTool } from "../idle-animation/IdlePixelToolSelector";
import type { PixelCoordinate } from "../idle-animation/IdlePixelMoveControls";
import { getIdlePartSlot } from "../idle-animation/parts";
import { getCharacterDesignSlot, CHARACTER_VISIBILITY_SLOTS, type CharacterLayerVisibility, type CharacterVisibilitySlot } from "@/lib/character-design-defaults";
import IdlePixelToolSelector from "../idle-animation/IdlePixelToolSelector";
import IdleShapeSelector from "../idle-animation/IdleShapeSelector";
import IdlePixelBoard from "../idle-animation/IdlePixelBoard";
import IdleColorPalette from "../idle-animation/IdleColorPalette";
import IdleZoomControls from "../idle-animation/IdleZoomControls";
import IdlePixelMoveControls from "../idle-animation/IdlePixelMoveControls";
import IdleHistoryControls from "../idle-animation/IdleHistoryControls";
import WalkDirectionSelector from "./WalkDirectionSelector";
import WalkAnimationPreview from "./WalkAnimationPreview";
import WalkLayerVisibilityControls from "./WalkLayerVisibilityControls";
import type { WalkCharacterItem } from "./types";
type Side = "front" | "back";
const baseFrame = (item: WalkCharacterItem, index: number) => item.idle_frames?.length
  ? item.idle_frames[index % item.idle_frames.length].pixelData : item.pixel_data;
const initialFrames = (item: WalkCharacterItem): IdleAnimationFrameJson[] => item.walking_animation
  ? item.walking_animation.frames.map((stored, index) => ({
    pixelData: composeWalkingFrame(baseFrame(item, index), stored, item.walking_animation?.basePose),
  }))
  : Array.from({ length: 6 }, (_, index) => ({ pixelData: { ...baseFrame(item, index) } }));
const encodedFrames = (item: WalkCharacterItem, frames: IdleAnimationFrameJson[]) =>
  frames.map((current, index) => createWalkingFrameOverlay(baseFrame(item, index), current.pixelData));
const sameFrames = (a: IdleAnimationFrameJson[], b: IdleAnimationFrameJson[]) => jsonDataEquals(a, b);
const defaultLayerVisibility = (items: WalkCharacterItem[]): CharacterLayerVisibility =>
  Object.fromEntries(CHARACTER_VISIBILITY_SLOTS.map(slot => [
    slot, items.some(item => (getIdlePartSlot(item) || getCharacterDesignSlot(item.design_type)) === slot && item.is_default_base),
  ])) as CharacterLayerVisibility;
function hasSideNode(item: WalkCharacterItem, side: Side) {
  const value = item.pixel_data_json as Record<string, unknown> | null;
  const sides = value && typeof value === "object" ? value.__sides : null;
  return Boolean(sides && typeof sides === "object" && side in sides);
}
function resolveSideItem(item: WalkCharacterItem, items: WalkCharacterItem[], side: Side, initialSide: Side, baseType: string) {
  const targetType = side === "back" ? `${baseType}-back` : baseType;
  const row = items.find(candidate => candidate.design_type.toLowerCase() === targetType.toLowerCase());
  if (row) return row;
  if (side === initialSide) return item;
  if (!hasSideNode(item, side)) return undefined;
  return {
    ...item, design_type: targetType, pixel_data: readDesignSidePixels(item.pixel_data_json, side, item.canvas_width),
    idle_frames: readEmbeddedIdleFrames(item.pixel_data_json, side, true, item.canvas_width),
    walking_animation: readEmbeddedWalkingAnimation(item.pixel_data_json, side, true, item.canvas_width), walking_side_node: true,
  };
}
export default function WalkAnimationEditor({ item, items, onBack, onSaved }: {
  item: WalkCharacterItem; items: WalkCharacterItem[]; onBack: () => void;
  onSaved: (id: string, json: unknown) => void;
}) {
  const initialSide: Side = item.design_type.toLowerCase().endsWith("-back") ? "back" : "front";
  const [side, setSide] = useState<Side>(initialSide);
  const baseType = item.design_type.replace(/-back$/i, "");
  const activeItem = resolveSideItem(item, items, side, initialSide, baseType);
  const availableSide = (value: Side) => Boolean(resolveSideItem(item, items, value, initialSide, baseType));
  const [frames, setFrames] = useState(initialFrames(item)), [frame, setFrame] = useState(0);
  const [canvasLayers, setCanvasLayers] = useState(() => defaultLayerVisibility(items));
  const [previewLayers, setPreviewLayers] = useState(() => defaultLayerVisibility(items));
  const [directions, setDirections] = useState<WalkDirection[]>(item.walking_animation?.directions || ["south"]);
  const [playing, setPlaying] = useState(false), [playbackKey, setPlaybackKey] = useState(0), [tool, setTool] = useState<IdlePixelTool>("paint");
  const [color, setColor] = useState(() => Object.values(item.pixel_data)[0] || "#ffffff");
  const [shape, setShape] = useState<IdlePixelShape>("freehand"), [selected, setSelected] = useState<PixelCoordinate[]>([]);
  const [zoom, setZoom] = useState(1), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [historyCount, setHistoryCount] = useState({ undo: 0, redo: 0 });
  const undo = useRef<Record<number, IdleAnimationFrameJson[]>>({}), redo = useRef<Record<number, IdleAnimationFrameJson[]>>({});
  const frameRef = useRef(0);
  const json = useRef(item.pixel_data_json);
  const activeSlot = activeItem ? getIdlePartSlot(activeItem) || getCharacterDesignSlot(activeItem.design_type) : null;
  const sideCandidates = items.filter(candidate =>
    candidate.design_type.toLowerCase().endsWith("-back") === (side === "back"));
  const sideItemFor = (slot: "body" | "clothing") =>
    activeSlot === slot ? activeItem : sideCandidates.find(candidate =>
      (getIdlePartSlot(candidate) || getCharacterDesignSlot(candidate.design_type)) === slot && candidate.is_default_base
    ) || sideCandidates.find(candidate =>
      (getIdlePartSlot(candidate) || getCharacterDesignSlot(candidate.design_type)) === slot
    );
  const walkingFor = (slot: "body" | "clothing") => {
    const candidate = sideItemFor(slot);
    if (!candidate) return null;
    const animation = side === "back" && !candidate.design_type.toLowerCase().endsWith("-back")
      ? candidate.back_walking_animation : candidate.walking_animation;
    return candidate.id === activeItem?.id
      ? { ...(animation || { frames: [] }), directions }
      : animation;
  };
  const playbackDuration = getWalkingFrameDurationMs(directions[0], walkingFor("body"), walkingFor("clothing"));
  useEffect(() => { if (!playing) return; const timer = window.setInterval(() => { const next = (frameRef.current + 1) % frames.length; frameRef.current = next; setFrame(next); setHistoryCount({ undo: (undo.current[next] || []).length, redo: (redo.current[next] || []).length }); }, playbackDuration); return () => window.clearInterval(timer); }, [playing, frames.length, playbackKey, playbackDuration]);
  function changePixels(pixelData: Record<string, string>) { undo.current[frame] = [...(undo.current[frame] || []), frames[frame]].slice(-100); redo.current[frame] = []; setHistoryCount({ undo: undo.current[frame].length, redo: 0 }); setFrames(old => old.map((f, i) => i === frame ? { pixelData } : f)); }
  function historyMove(from: typeof undo.current, to: typeof undo.current) { const source = from[frame] || []; if (!source.length) return; const value = source[source.length - 1]; from[frame] = source.slice(0, -1); to[frame] = [...(to[frame] || []), frames[frame]]; setHistoryCount({ undo: (undo.current[frame] || []).length, redo: (redo.current[frame] || []).length }); setFrames(old => old.map((f, i) => i === frame ? value : f)); }
  function selectFrame(next: number) { setPlaying(false); frameRef.current = next; setFrame(next); setHistoryCount({ undo: (undo.current[next] || []).length, redo: (redo.current[next] || []).length }); setSelected([]); }
  function addFrame() {
    setPlaying(false);
    const next = frames.length;
    setFrames(old => [...old, { pixelData: { ...baseFrame(activeItem!, old.length) } }]);
    undo.current = {}; redo.current = {}; frameRef.current = next; setFrame(next);
    setHistoryCount({ undo: 0, redo: 0 }); setSelected([]);
  }
  function deleteFrame() {
    if (frames.length <= 1) return;
    setPlaying(false);
    setFrames(old => old.filter((_, index) => index !== frame));
    const next = Math.min(frame, frames.length - 2); frameRef.current = next; setFrame(next);
    undo.current = {}; redo.current = {}; setHistoryCount({ undo: 0, redo: 0 }); setSelected([]);
  }
  function moveSelection(dx: number, dy: number) { if (!activeItem) return false; const data = frames[frame].pixelData, keys = new Set(selected.map(p => `${p.x},${p.y}`)), targets = selected.map(p => ({ x: p.x + dx, y: p.y + dy })); if (targets.some(p => p.x < 0 || p.y < 0 || p.x >= activeItem.canvas_width || p.y >= activeItem.canvas_height || data[`${p.x},${p.y}`] && !keys.has(`${p.x},${p.y}`))) return false; const next = { ...data }, colors = selected.map(p => data[`${p.x},${p.y}`]); selected.forEach(p => delete next[`${p.x},${p.y}`]); targets.forEach((p, i) => next[`${p.x},${p.y}`] = colors[i]); changePixels(next); setSelected(targets); return true; }
  async function save() {
    if (!activeItem) return;
    setBusy(true); setMessage("");
    try {
      const db = createClient(), { data: { user }, error: authError } = await db.auth.getUser();
      if (authError) throw Error(`Could not verify your sign-in: ${authError.message}`);
      if (!user) throw Error("Please sign in again before saving.");
      const { data: admin, error: adminError } = await db.from("admin_users").select("role,is_active").eq("user_id", user.id).maybeSingle();
      if (adminError) throw Error(`Could not verify admin permission: ${adminError.message}`);
      if (admin?.role !== "admin" || !admin.is_active) throw Error("Admin permission denied. Ask an active administrator to restore access.");
      const sideNode = Boolean(activeItem.walking_side_node);
      const { data: existing, error: readError } = await db.from("character_designs")
        .select("pixel_data").eq("id", activeItem.id).maybeSingle();
      if (readError) throw readError;
      if (!existing) throw Error(`Character design ${activeItem.id} was not found; reload the editor and select an existing design.`);
      const latestJson = existing.pixel_data;
      const existingIdle = readEmbeddedIdleFrames(latestJson, side, sideNode, activeItem.canvas_width);
      const idleFrames = existingIdle?.length ? existingIdle : activeItem.idle_frames;
      const storedFrames = frames.map((current, index) => {
        const oldBase = baseFrame(activeItem, index);
        const newBase = idleFrames?.length ? idleFrames[index % idleFrames.length].pixelData : oldBase;
        const edits = createWalkingFrameOverlay(oldBase, current.pixelData);
        return createWalkingFrameOverlay(newBase, composeWalkingFrame(newBase, edits, "idle-cycle"));
      });
      const withIdle = !sideNode && !existingIdle && activeItem.idle_frames?.length
        ? mergeIdleFrames(latestJson, extractDesignPixels(latestJson, activeItem.canvas_width), activeItem.idle_frames) : latestJson;
      const frameDurationMs = readEmbeddedWalkingAnimation(latestJson, side, sideNode, activeItem.canvas_width)?.frameDurationMs
        ?? activeItem.walking_animation?.frameDurationMs;
      const animation = {
        directions, frames: storedFrames, basePose: "idle-cycle" as const,
        ...(frameDurationMs ? { frameDurationMs } : {}),
      };
      const merged = mergeWalkingAnimation(withIdle, animation, side, sideNode);
      const { data, error } = await db.from("character_designs").update({ pixel_data: merged, updated_at: new Date().toISOString() })
        .eq("id", activeItem.id).select("id,pixel_data").maybeSingle();
      if (error) throw error;
      if (!data) throw Error("The design was not updated. Check that it still exists and that your admin role has permission to edit character designs.");
      const { data: persisted, error: verifyError } = await db.from("character_designs")
        .select("id,pixel_data").eq("id", activeItem.id).maybeSingle();
      if (verifyError) throw Error(`The save completed, but persisted data could not be re-read: ${verifyError.message}`);
      if (!persisted || persisted.id !== activeItem.id)
        throw Error("The save completed, but the design row could not be found during verification. Check database read permissions and reload.");
      if (!jsonDataEquals(merged, persisted.pixel_data))
        throw Error("The persisted design JSON differs from the merged save. Reload the editor before retrying to avoid overwriting newer changes.");
      const verified = readEmbeddedWalkingAnimation(persisted.pixel_data, side, sideNode, activeItem.canvas_width);
      if (!verified || !jsonDataEquals(animation, verified))
        throw Error("The persisted walking animation did not match the submitted frames, directions, or settings. Reload the editor and retry; no success was reported.");
      json.current = persisted.pixel_data;
      onSaved(activeItem.id, persisted.pixel_data);
      setMessage("Walking animation saved and verified.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Walking animation could not be saved."); }
    finally { setBusy(false); }
  }
  const usedColors = [...new Set([...Object.values(frames[frame].pixelData), ...items.flatMap(design => Object.values(design.pixel_data)), "#ffffff", "#171923"])];
  function restart() { frameRef.current = 0; setFrame(0); setPlaying(true); setPlaybackKey(value => value + 1); }
  const savedFrames = activeItem ? initialFrames(activeItem) : [];
  const dirty = Boolean(activeItem && (!sameFrames(frames, savedFrames) ||
    JSON.stringify(directions) !== JSON.stringify(activeItem.walking_animation?.directions || ["south"])));
  function leaveEditor() {
    if (dirty && !window.confirm("Discard unsaved walking animation changes?")) return;
    onBack();
  }
  function changeSide(next: Side) {
    if (next === side || !availableSide(next)) return;
    if (dirty && !window.confirm("Discard unsaved changes before switching sides?")) return;
    const nextItem = resolveSideItem(item, items, next, initialSide, baseType);
    if (!nextItem) return;
    const loaded = initialFrames(nextItem), nextFrame = Math.min(frame, loaded.length - 1);
    setFrames(loaded);
    setDirections(nextItem.walking_animation?.directions || ["south"]);
    setCanvasLayers(defaultLayerVisibility(items));
    setPreviewLayers(defaultLayerVisibility(items));
    frameRef.current = nextFrame;
    setFrame(nextFrame);
    setPlaying(false);
    setSelected([]);
    undo.current = {};
    redo.current = {};
    json.current = nextItem.pixel_data_json;
    setHistoryCount({ undo: 0, redo: 0 });
    setSide(next);
  }
  if (!activeItem) return <div role="status" className="p-6 text-sm text-slate-300">The selected side has no matching character asset.</div>;
  const targetWithAnimation = {
    ...activeItem,
    walking_animation: {
      directions, frames: encodedFrames(activeItem, frames), basePose: "idle-cycle" as const,
      ...(activeItem.walking_animation?.frameDurationMs ? { frameDurationMs: activeItem.walking_animation.frameDurationMs } : {}),
    },
  };
  const sideItems = items.map(design => design.id === activeItem.id ? activeItem : design)
    .filter(design => design.design_type.toLowerCase().endsWith("-back") === (side === "back"));
  const targetSlot = getIdlePartSlot(activeItem) || getCharacterDesignSlot(activeItem.design_type);
  const layerItem = (slot: CharacterVisibilitySlot) => {
    const candidates = sideItems.filter(design => (getIdlePartSlot(design) || getCharacterDesignSlot(design.design_type)) === slot);
    return candidates.find(design => design.is_default_base) || candidates[0] ||
      items.find(design => (getIdlePartSlot(design) || getCharacterDesignSlot(design.design_type)) === slot && design.is_default_base);
  };
  const layerPixels = (slot: CharacterVisibilitySlot) => {
    if (targetSlot === slot) return {};
    const design = layerItem(slot);
    return design ? baseFrame(design, frame) : {};
  };
  const bodyPixels = layerPixels("body"), facePixels = layerPixels("face");
  const extraLayers = (["clothing", "hair", "facialHair"] as const).map(slot => ({
    pixels: layerPixels(slot), visible: canvasLayers[slot],
  }));
  return <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden bg-[#0b1017] p-2 text-slate-100 sm:p-3">
    <header className="flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-[#111821] p-2">
      <button aria-label="Back to Walking Animation list" onClick={leaveEditor} className="grid size-8 place-items-center rounded text-slate-400 hover:bg-slate-800"><ArrowLeft size={16}/></button>
      <strong className="text-xs">{activeItem.design_name} · {activeItem.design_type}</strong><IdleHistoryControls canUndo={historyCount.undo > 0} canRedo={historyCount.redo > 0} onUndo={() => historyMove(undo.current, redo.current)} onRedo={() => historyMove(redo.current, undo.current)}/><IdleShapeSelector activeShape={shape} onSelect={setShape}/>
      <IdleColorPalette colors={usedColors} selectedColor={color} onSelect={setColor}/><IdlePixelMoveControls selectedPixels={selected} onMove={moveSelection} onDeselect={() => setSelected([])}/><IdleZoomControls zoom={zoom} onChange={setZoom}/>
      <div className="flex items-center gap-1" aria-label="Walking animation side">
        {(["front", "back"] as const).map(value => <button key={value} type="button" aria-pressed={side === value} disabled={!availableSide(value)} onClick={() => changeSide(value)}
          className={`rounded border px-2 py-1 text-[10px] font-semibold disabled:opacity-35 ${side === value ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : "border-slate-700 text-slate-400"}`}>
          {value === "front" ? "Front Side" : "Back Side"}
        </button>)}
      </div>
      <WalkLayerVisibilityControls value={canvasLayers} onChange={setCanvasLayers} label="Work canvas layer visibility"/>
    </header>
    <main className="grid min-h-0 flex-1 grid-cols-[42px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_minmax(170px,32vh)] gap-2 lg:grid-cols-[46px_minmax(0,1fr)_270px] lg:grid-rows-[minmax(0,1fr)]">
      <div className="row-span-1"><IdlePixelToolSelector activeTool={tool} onSelect={setTool}/></div>
      <div className="min-h-0 overflow-hidden rounded-lg border border-slate-800 bg-[#111821] p-2"><IdlePixelBoard key={`${activeItem.id}-${frame}`} size={activeItem.canvas_width} zoom={zoom} onZoomChange={setZoom} pixels={frames[frame].pixelData} bodyPixels={bodyPixels} facePixels={facePixels} extraLayers={extraLayers} showPixels={targetSlot && targetSlot !== "hat" ? canvasLayers[targetSlot] : true} showBody={canvasLayers.body} showFace={canvasLayers.face} color={color} tool={tool} shape={shape} selectedPixels={selected} onSelectPixels={setSelected} onMoveSelection={moveSelection} onPixelsChange={changePixels} overlayOpacity={1}/></div>
      <WalkAnimationPreview items={items} target={targetWithAnimation} side={side} directions={directions} visibleLayers={previewLayers} onVisibleLayersChange={setPreviewLayers} frame={frame} count={frames.length} playing={playing} busy={busy} message={message} onSelect={selectFrame} onAdd={addFrame} onDelete={deleteFrame} onPrevious={() => selectFrame((frame + frames.length - 1) % frames.length)} onNext={() => selectFrame((frame + 1) % frames.length)} onPlay={() => setPlaying(value => !value)} onStop={() => selectFrame(0)} onRestart={restart} onSave={() => void save()}/>
    </main>
    <WalkDirectionSelector value={directions} onChange={setDirections}/>
  </div>;
}
