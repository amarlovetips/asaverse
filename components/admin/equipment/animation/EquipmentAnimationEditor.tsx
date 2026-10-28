"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Pause, Play, Plus, Square, Trash2 } from "lucide-react";
import PixelHero from "@/components/PixelHero";
import { createClient } from "@/lib/supabase";
import { readDesignSidePixels } from "@/lib/character-design-json";
import { EQUIPMENT_CATEGORY_LABELS, isEquipmentCategory, type EquipmentAnimationFrame, type EquipmentPixelMap } from "../types";
import EquipmentFrameBoard from "./EquipmentFrameBoard";

const PALETTE = ["#171923", "#ffffff", "#f2c49b", "#754631", "#d65b82", "#19b9ad", "#4168d9", "#d69a38", "#794bd0", "#38d9ee", "#4ae08e", "#888888"];

type DesignInfo = { design_name: string; category: string; canvas_width: number; canvas_height: number; pixels: EquipmentPixelMap };

export default function EquipmentAnimationEditor({ designId, onBack }: { designId: string; onBack: () => void }) {
  const [design, setDesign] = useState<DesignInfo | null>(null);
  const [frames, setFrames] = useState<EquipmentAnimationFrame[]>([]);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(420);
  const [tool, setTool] = useState<"paint" | "erase" | "select">("paint");
  const [color, setColor] = useState(PALETTE[0]);
  const [zoom, setZoom] = useState(8);
  const [selected, setSelected] = useState<{ x: number; y: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const undoStack = useRef<EquipmentAnimationFrame[][]>([]);
  const redoStack = useRef<EquipmentAnimationFrame[][]>([]);
  const [historyCount, setHistoryCount] = useState({ undo: 0, redo: 0 });
  const frameRef = useRef(0);

  const load = useCallback(async () => {
    setMessage("");
    try {
      const db = createClient();
      const { data: row, error } = await db.from("equipment_designs")
        .select("design_name,category,canvas_width,canvas_height,pixel_data")
        .eq("id", designId).maybeSingle();
      if (error) throw error;
      if (!row) { setMessage("Equipment design not found."); return; }
      const info: DesignInfo = {
        design_name: row.design_name, category: row.category,
        canvas_width: row.canvas_width, canvas_height: row.canvas_height,
        pixels: readDesignSidePixels(row.pixel_data, "front", row.canvas_width),
      };
      setDesign(info);
      const { data: animation, error: animationError } = await db.from("equipment_animations")
        .select("frames,frame_duration_ms").eq("equipment_design_id", designId).maybeSingle();
      if (animationError) throw animationError;
      const savedFrames = Array.isArray(animation?.frames) && animation.frames.length
        ? animation.frames as EquipmentAnimationFrame[]
        : Array.from({ length: 6 }, () => ({ pixelData: { ...info.pixels } }));
      undoStack.current = [];
      redoStack.current = [];
      setHistoryCount({ undo: 0, redo: 0 });
      setFrames(savedFrames);
      setDurationMs(animation?.frame_duration_ms || 420);
      frameRef.current = 0;
      setFrame(0);
      setSelected([]);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not load the animation."); }
  }, [designId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const timer = window.setInterval(() => {
      const next = (frameRef.current + 1) % frames.length;
      frameRef.current = next;
      setFrame(next);
      setSelected([]);
    }, Math.max(80, durationMs));
    return () => window.clearInterval(timer);
  }, [playing, frames.length, durationMs]);

  const size = design?.canvas_width || 32;

  function remember(next: EquipmentAnimationFrame[]) {
    undoStack.current = [...undoStack.current, frames].slice(-50);
    redoStack.current = [];
    setHistoryCount({ undo: undoStack.current.length, redo: 0 });
    setFrames(next);
  }

  function historyMove(direction: "undo" | "redo") {
    const from = direction === "undo" ? undoStack.current : redoStack.current;
    if (!from.length) return;
    const value = from[from.length - 1];
    const rest = from.slice(0, -1);
    const target = [...(direction === "undo" ? redoStack.current : undoStack.current), frames];
    if (direction === "undo") { undoStack.current = rest; redoStack.current = target; }
    else { redoStack.current = rest; undoStack.current = target; }
    setHistoryCount({ undo: undoStack.current.length, redo: redoStack.current.length });
    setFrames(value);
    const next = Math.min(frameRef.current, value.length - 1);
    frameRef.current = next;
    setFrame(next);
  }

  function changeFramePixels(nextPixels: EquipmentPixelMap) {
    remember(frames.map((entry, index) => index === frame ? { pixelData: nextPixels } : entry));
  }

  function selectFrame(next: number) {
    setPlaying(false);
    frameRef.current = next;
    setFrame(next);
    setSelected([]);
  }

  function addFrame() {
    setPlaying(false);
    const next = frames.length;
    remember([...frames, { pixelData: { ...(frames[frame]?.pixelData || design?.pixels || {}) } }]);
    frameRef.current = next;
    setFrame(next);
    setSelected([]);
  }

  function deleteFrame() {
    if (frames.length <= 1) return;
    setPlaying(false);
    const kept = frames.filter((_, index) => index !== frame);
    remember(kept);
    const next = Math.min(frame, kept.length - 1);
    frameRef.current = next;
    setFrame(next);
    setSelected([]);
  }

  async function save() {
    setBusy(true); setMessage("");
    try {
      const db = createClient();
      const { data: { user }, error: authError } = await db.auth.getUser();
      if (authError || !user) throw Error("Please sign in to save the animation.");
      const { data: admin, error: adminError } = await db.from("admin_users")
        .select("role,is_active").eq("user_id", user.id).maybeSingle();
      if (adminError || admin?.role !== "admin" || !admin.is_active) throw Error("Admin permission denied.");
      const { error } = await db.from("equipment_animations").upsert({
        equipment_design_id: designId,
        frames: frames.map(entry => ({ pixelData: entry.pixelData })),
        frame_duration_ms: Math.max(80, Math.round(durationMs)),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "equipment_design_id" });
      if (error) throw error;
      setMessage("Equipment animation saved.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Save failed."); }
    finally { setBusy(false); }
  }

  if (!design) return <div className="grid h-full place-items-center p-6 text-sm text-slate-400">{message || "Loading equipment animation…"}</div>;
  const button = "inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1.5 text-[11px] text-slate-200 hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-40";
  return <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4 text-[#d9e0e9]">
    <header className="flex shrink-0 flex-wrap items-center gap-2">
      <button type="button" onClick={onBack} aria-label="Back to equipment animations"
        className="grid size-8 place-items-center rounded text-slate-400 hover:bg-slate-800"><ArrowLeft size={16}/></button>
      <div>
        <p className="text-xs text-slate-500">Equipment / Animation</p>
        <h1 className="text-lg font-bold">{design.design_name} · {isEquipmentCategory(design.category) ? EQUIPMENT_CATEGORY_LABELS[design.category] : design.category}</h1>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <button type="button" className={button} disabled={historyCount.undo === 0} onClick={() => historyMove("undo")} title="Undo">Undo</button>
        <button type="button" className={button} disabled={historyCount.redo === 0} onClick={() => historyMove("redo")} title="Redo">Redo</button>
        <button type="button" className={button} onClick={addFrame} title="Add frame"><Plus size={13}/> Add Frame</button>
        <button type="button" className={button} disabled={frames.length <= 1} onClick={deleteFrame} title="Delete frame"><Trash2 size={13}/> Delete Frame</button>
        <button type="button" onClick={() => void save()} disabled={busy}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Saving…" : "Save Animation"}</button>
      </div>
    </header>

    <div className="flex min-h-0 flex-1 gap-3">
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto rounded-lg border border-slate-800 bg-[#0d141e] p-4">
        <EquipmentFrameBoard key={`${designId}-${frame}`} size={size} zoom={zoom} pixels={frames[frame]?.pixelData || {}}
          tool={tool} color={color} onPixelsChange={changeFramePixels} selected={selected} onSelect={setSelected}/>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          {(["paint", "erase", "select"] as const).map(value => <button key={value} type="button" onClick={() => { setTool(value); setSelected([]); }}
            className={`rounded border px-3 py-1.5 text-[11px] font-semibold capitalize ${tool === value ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : "border-slate-700 text-slate-400"}`}>{value}</button>)}
          <span className="mx-1 h-5 w-px bg-slate-700"/>
          {PALETTE.map(value => <button key={value} type="button" title={value} aria-label={`Choose ${value}`} onClick={() => setColor(value)}
            className={`size-5 rounded-sm border ${color === value ? "border-white ring-1 ring-cyan-400" : "border-slate-600"}`} style={{ backgroundColor: value }}/>)}
          <input type="color" value={color} onChange={event => setColor(event.target.value)} aria-label="Custom color"
            className="size-6 cursor-pointer rounded border border-slate-600 bg-transparent"/>
          <span className="mx-1 h-5 w-px bg-slate-700"/>
          <button type="button" className={button} onClick={() => setZoom(value => Math.max(2, value - 2))}>Zoom −</button>
          <span className="w-10 text-center font-mono text-[10px] text-slate-400">{Math.round(zoom / 8 * 100)}%</span>
          <button type="button" className={button} onClick={() => setZoom(value => Math.min(16, value + 2))}>Zoom +</button>
          <button type="button" className={button} onClick={() => setZoom(8)}>Reset</button>
        </div>
      </section>

      <aside className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto rounded-lg border border-slate-800 bg-[#111821] p-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-300">Preview & Frames</h2>
        <div className="grid place-items-center rounded-lg bg-[radial-gradient(ellipse_at_center,#173040,#080c13_72%)] p-3">
          <PixelHero pixelData={frames[frame]?.pixelData || {}} canvasWidth={size} canvasHeight={size} size={148}/>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <button type="button" className={button} onClick={() => selectFrame((frame + frames.length - 1) % frames.length)} aria-label="Previous frame">‹</button>
          <button type="button" className={button} onClick={() => setPlaying(value => !value)} aria-label={playing ? "Pause preview" : "Play preview"}>
            {playing ? <Pause size={13}/> : <Play size={13}/>} {playing ? "Pause" : "Play"}
          </button>
          <button type="button" className={button} onClick={() => { setPlaying(false); selectFrame(0); }} aria-label="Stop preview"><Square size={12}/></button>
          <button type="button" className={button} onClick={() => selectFrame((frame + 1) % frames.length)} aria-label="Next frame">›</button>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-slate-400">Frame duration
          <input type="number" min={80} step={20} value={durationMs} onChange={event => setDurationMs(Math.max(80, Number(event.target.value) || 420))}
            className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white outline-none focus:border-cyan-400"/> ms
        </label>
        <div className="flex flex-wrap gap-1.5">
          {frames.map((entry, index) => <button key={index} type="button" onClick={() => selectFrame(index)} aria-label={`Select frame ${index + 1}`} aria-pressed={frame === index}
            className={`grid size-12 place-items-center rounded border bg-[#0b1018] ${frame === index ? "border-cyan-400" : "border-slate-700"}`}>
            <PixelHero pixelData={entry.pixelData} canvasWidth={size} canvasHeight={size} size={40}/>
          </button>)}
        </div>
        <p className="text-[10px] text-slate-500">{frames.length} frames · frame {frame + 1} · {selected.length} pixels selected</p>
        {message && <p role="status" className="break-words text-xs text-slate-300">{message}</p>}
      </aside>
    </div>
  </div>;
}
