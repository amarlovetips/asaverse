"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import PixelHero from "@/components/PixelHero";
import { createClient } from "@/lib/supabase";
import { readDesignSidePixels } from "@/lib/character-design-json";
import { EQUIPMENT_CATEGORY_LABELS, EQUIPMENT_RARITIES, isEquipmentCategory, type EquipmentPixelMap, type EquipmentRarity } from "./types";

const ICON_SIZE = 16;
const ICON_CELL = 10;
const ICON_PALETTE = ["#171923", "#ffffff", "#e63946", "#f4a261", "#e9c46a", "#2a9d8f", "#4168d9", "#794bd0", "#d65b82", "#4ae08e", "#38d9ee", "#888888"];

type DesignRow = { id: string; design_name: string; category: string; canvas_width: number; canvas_height: number; pixel_data: unknown; is_published: boolean };
type EffectRow = { rarity: string; power: number; xp: number; protection: number; icon_pixel_data: EquipmentPixelMap };
type Draft = { rarity: EquipmentRarity; power: number; xp: number; protection: number; icon: EquipmentPixelMap };

const defaultDraft: Draft = { rarity: "common", power: 0, xp: 0, protection: 0, icon: {} };

function toDraft(row: EffectRow | null): Draft {
  return row ? {
    rarity: (EQUIPMENT_RARITIES as readonly string[]).includes(row.rarity) ? row.rarity as EquipmentRarity : "common",
    power: row.power ?? 0, xp: row.xp ?? 0, protection: row.protection ?? 0,
    icon: row.icon_pixel_data || {},
  } : { ...defaultDraft };
}

function EquipmentIconEditor({ pixels, tool, color, onChange }: {
  pixels: EquipmentPixelMap; tool: "paint" | "erase"; color: string;
  onChange: (pixels: EquipmentPixelMap) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const working = useRef<EquipmentPixelMap>(pixels);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const extent = ICON_SIZE * ICON_CELL;

  useEffect(() => {
    working.current = pixels;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, extent, extent);
    context.fillStyle = "#141b26";
    context.fillRect(0, 0, extent, extent);
    for (const [key, fill] of Object.entries(pixels)) {
      const [x, y] = key.split(",").map(Number);
      if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < ICON_SIZE && y >= 0 && y < ICON_SIZE) {
        context.fillStyle = fill;
        context.fillRect(x * ICON_CELL, y * ICON_CELL, ICON_CELL, ICON_CELL);
      }
    }
    context.strokeStyle = "rgba(203, 213, 225, 0.12)";
    context.lineWidth = 0.5;
    context.beginPath();
    for (let index = 0; index <= ICON_SIZE; index++) {
      const coordinate = index * ICON_CELL + 0.5;
      context.moveTo(coordinate, 0);
      context.lineTo(coordinate, extent);
      context.moveTo(0, coordinate);
      context.lineTo(extent, coordinate);
    }
    context.stroke();
  }, [pixels, extent]);

  function paint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(ICON_SIZE - 1, Math.floor((event.clientX - rect.left) / rect.width * ICON_SIZE)));
    const y = Math.max(0, Math.min(ICON_SIZE - 1, Math.floor((event.clientY - rect.top) / rect.height * ICON_SIZE)));
    const key = `${x},${y}`;
    if (tool === "erase") {
      if (!(key in working.current)) return;
      working.current = { ...working.current };
      delete working.current[key];
    } else {
      if (working.current[key] === color) return;
      working.current = { ...working.current, [key]: color };
    }
    dirty.current = true;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    context.fillStyle = tool === "erase" ? "#141b26" : color;
    context.fillRect(x * ICON_CELL, y * ICON_CELL, ICON_CELL, ICON_CELL);
  }

  function finish() {
    if (!drawing.current) return;
    drawing.current = false;
    if (dirty.current) { onChange(working.current); dirty.current = false; }
  }

  return <canvas ref={canvasRef} width={extent} height={extent}
    onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); drawing.current = true; paint(event); }}
    onPointerMove={event => { if (drawing.current) paint(event); }}
    onPointerUp={finish} onPointerCancel={finish}
    aria-label="Equipment effect icon editor"
    className="touch-none rounded border border-slate-700 [image-rendering:pixelated]"
    style={{ width: 128, height: 128, cursor: "crosshair" }} />;
}

export default function EquipmentEffectsWorkspace() {
  const [designs, setDesigns] = useState<DesignRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [iconTool, setIconTool] = useState<"paint" | "erase">("paint");
  const [iconColor, setIconColor] = useState(ICON_PALETTE[7]);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const db = createClient();
      const { data: rows, error } = await db.from("equipment_designs")
        .select("id,design_name,category,canvas_width,canvas_height,pixel_data,is_published")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const designRows = (rows || []) as DesignRow[];
      setDesigns(designRows);
      const { data: effects, error: effectsError } = await db.from("equipment_effects")
        .select("equipment_design_id,rarity,power,xp,protection,icon_pixel_data");
      if (effectsError) throw effectsError;
      const byDesign = new Map<string, EffectRow>();
      for (const row of (effects || []) as Array<EffectRow & { equipment_design_id: string }>)
        byDesign.set(row.equipment_design_id, row);
      setDrafts(Object.fromEntries(designRows.map(row => [row.id, toDraft(byDesign.get(row.id) || null)])));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load equipment effects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts(old => ({ ...old, [id]: { ...(old[id] || defaultDraft), ...patch } }));
    setSaved(old => ({ ...old, [id]: "" }));
  }

  async function saveEffect(design: DesignRow) {
    const draft = drafts[design.id] || defaultDraft;
    setBusy(design.id); setMessage("");
    try {
      const db = createClient();
      const { data: { user }, error: authError } = await db.auth.getUser();
      if (authError || !user) throw Error("Please sign in to save effects.");
      const { data: admin, error: adminError } = await db.from("admin_users")
        .select("role,is_active").eq("user_id", user.id).maybeSingle();
      if (adminError || admin?.role !== "admin" || !admin.is_active) throw Error("Admin permission denied.");
      const { error } = await db.from("equipment_effects").upsert({
        equipment_design_id: design.id,
        rarity: draft.rarity,
        power: Math.max(0, Math.round(draft.power)),
        xp: Math.max(0, Math.round(draft.xp)),
        protection: Math.max(0, Math.round(draft.protection)),
        icon_pixel_data: draft.icon,
        icon_canvas_size: ICON_SIZE,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "equipment_design_id" });
      if (error) throw error;
      setSaved(old => ({ ...old, [design.id]: "Saved" }));
    } catch (e) { setMessage(e instanceof Error ? e.message : "Save failed."); }
    finally { setBusy(null); }
  }

  const input = "w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-400";
  return <div className="h-full min-h-0 overflow-y-auto p-5 text-[#d9e0e9]">
    <div className="mx-auto max-w-5xl space-y-4">
      <header>
        <p className="text-xs text-slate-500">Equipment / Effects</p>
        <h1 className="mt-1 text-2xl font-bold">Equipment Effects</h1>
        <p className="mt-1 text-sm text-slate-400">Rarity, power, XP, protection, and custom icons per equipment design. Additional gameplay mechanics can be added to this system later.</p>
      </header>

      {message && <p role="status" className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">{message}</p>}
      {loading && <p className="text-sm text-slate-400">Loading equipment effects…</p>}

      <div className="space-y-3">
        {designs.map(design => {
          const draft = drafts[design.id] || defaultDraft;
          return <article key={design.id} className="flex flex-wrap gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="grid size-24 shrink-0 place-items-center rounded-lg bg-[radial-gradient(ellipse_at_center,#173040,#080c13_72%)]">
              <PixelHero pixelData={readDesignSidePixels(design.pixel_data, "front", design.canvas_width)}
                canvasWidth={design.canvas_width} canvasHeight={design.canvas_height} size={80}/>
            </div>
            <div className="min-w-48 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-semibold">{design.design_name}</h2>
                <span className="text-[11px] text-slate-400">{isEquipmentCategory(design.category) ? EQUIPMENT_CATEGORY_LABELS[design.category] : design.category}</span>
                <span className={`rounded px-2 py-0.5 text-[10px] ${design.is_published ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700/60 text-slate-300"}`}>{design.is_published ? "Published" : "Draft"}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400">Rarity
                  <select value={draft.rarity} onChange={event => updateDraft(design.id, { rarity: event.target.value as EquipmentRarity })}
                    className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-400">
                    {EQUIPMENT_RARITIES.map(rarity => <option key={rarity} value={rarity}>{rarity}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400">Power
                  <input type="number" min={0} value={draft.power} onChange={event => updateDraft(design.id, { power: Number(event.target.value) || 0 })} className={input}/>
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400">XP
                  <input type="number" min={0} value={draft.xp} onChange={event => updateDraft(design.id, { xp: Number(event.target.value) || 0 })} className={input}/>
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400">Protection
                  <input type="number" min={0} value={draft.protection} onChange={event => updateDraft(design.id, { protection: Number(event.target.value) || 0 })} className={input}/>
                </label>
                <button type="button" onClick={() => void saveEffect(design)} disabled={busy === design.id}
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
                  {busy === design.id ? "Saving…" : "Save Effect"}
                </button>
                {saved[design.id] && <span className="text-[11px] text-emerald-300">{saved[design.id]}</span>}
              </div>
              <p className="text-[10px] text-slate-500">Effects are stored per equipment design. Future gameplay mechanics extend this record.</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-300">Custom Icon</p>
              <EquipmentIconEditor pixels={draft.icon} tool={iconTool} color={iconColor}
                onChange={pixels => updateDraft(design.id, { icon: pixels })}/>
              <div className="flex flex-wrap items-center gap-1">
                <button type="button" onClick={() => setIconTool("paint")} className={`rounded border px-2 py-1 text-[10px] ${iconTool === "paint" ? "border-cyan-400 text-cyan-200" : "border-slate-700 text-slate-400"}`}>Paint</button>
                <button type="button" onClick={() => setIconTool("erase")} className={`rounded border px-2 py-1 text-[10px] ${iconTool === "erase" ? "border-cyan-400 text-cyan-200" : "border-slate-700 text-slate-400"}`}>Erase</button>
                <button type="button" onClick={() => updateDraft(design.id, { icon: {} })} className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-400">Clear</button>
              </div>
              <div className="flex flex-wrap gap-1">
                {ICON_PALETTE.map(value => <button key={value} type="button" title={value} aria-label={`Icon color ${value}`} onClick={() => { setIconColor(value); setIconTool("paint"); }}
                  className={`size-4 rounded-sm border ${iconColor === value ? "border-white ring-1 ring-cyan-400" : "border-slate-600"}`} style={{ backgroundColor: value }}/>)}
              </div>
            </div>
          </article>;
        })}
      </div>

      {!loading && !message && designs.length === 0 && <p className="rounded-lg border border-slate-800 p-8 text-center text-sm text-slate-500">No equipment designs yet. Create one in Equipment Studio first.</p>}
    </div>
  </div>;
}
