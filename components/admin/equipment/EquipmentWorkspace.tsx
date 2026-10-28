"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import PixelHero from "@/components/PixelHero";
import { createClient } from "@/lib/supabase";
import { readDesignSidePixels } from "@/lib/character-design-json";
import { adminMenuHref } from "../menu-config";
import { EQUIPMENT_CATEGORIES, EQUIPMENT_CATEGORY_LABELS, isEquipmentCategory, type EquipmentCategory } from "./types";

type Row = {
  id: string;
  design_name: string;
  category: string;
  canvas_width: number;
  canvas_height: number;
  pixel_data: unknown;
  is_published: boolean;
  updated_at: string;
};

export default function EquipmentWorkspace() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"All" | EquipmentCategory>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const db = createClient();
      const { data: auth, error: authError } = await db.auth.getUser();
      if (authError || !auth.user) throw new Error("Please sign in to load equipment designs.");
      const { data: admin, error: adminError } = await db.from("admin_users")
        .select("role,is_active").eq("user_id", auth.user.id).maybeSingle();
      if (adminError || admin?.role !== "admin" || !admin.is_active) throw new Error("Admin permission denied.");
      const { data, error } = await db.from("equipment_designs")
        .select("id,design_name,category,canvas_width,canvas_height,pixel_data,is_published,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setItems((data || []) as Row[]);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load equipment designs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => items.filter(item =>
    (filter === "All" || item.category === filter) &&
    (!search.trim() || item.design_name.toLowerCase().includes(search.trim().toLowerCase()))
  ), [items, filter, search]);

  const grouped = useMemo(() => EQUIPMENT_CATEGORIES.map(category => ({
    category, rows: visible.filter(item => item.category === category),
  })).filter(group => group.rows.length > 0), [visible]);

  async function verifyAdmin() {
    const db = createClient();
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) throw Error("Please sign in first.");
    const { data: admin, error: check } = await db.from("admin_users")
      .select("role,is_active").eq("user_id", user.id).maybeSingle();
    if (check || admin?.role !== "admin" || !admin.is_active) throw Error("Admin permission denied.");
    return db;
  }

  async function togglePublish(row: Row) {
    setBusy(true); setMessage("");
    try {
      const db = await verifyAdmin();
      const next = !row.is_published;
      const { error } = await db.from("equipment_designs")
        .update({ is_published: next, updated_at: new Date().toISOString() }).eq("id", row.id);
      if (error) throw error;
      setItems(old => old.map(item => item.id === row.id ? { ...item, is_published: next } : item));
      setMessage(`${row.design_name} ${next ? "published" : "unpublished"}.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Publish update failed."); }
    finally { setBusy(false); }
  }

  async function deleteIds(ids: string[]) {
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} equipment design${ids.length === 1 ? "" : "s"}? Animations and effects for these designs are removed as well.`)) return;
    setBusy(true); setMessage("");
    try {
      const db = await verifyAdmin();
      const { error } = await db.from("equipment_designs").delete().in("id", ids);
      if (error) throw error;
      setItems(old => old.filter(item => !ids.includes(item.id)));
      setSelected(new Set());
      setMessage(`${ids.length} design${ids.length === 1 ? "" : "s"} deleted.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Delete failed."); }
    finally { setBusy(false); }
  }

  function toggleSelected(id: string) {
    setSelected(old => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const studioHref = (id?: string) => `${adminMenuHref("Equipment", "Equipment Studio")}${id ? `/${encodeURIComponent(id)}` : "/new"}`;

  return <div className="h-full min-h-0 overflow-y-auto p-5 text-[#d9e0e9]">
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">Equipment / Catalog</p>
          <h1 className="mt-1 text-2xl font-bold">Equipments</h1>
          <p className="mt-1 text-sm text-slate-400">Headgear, Suits, and Relic pixel equipment designs</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && <button type="button" disabled={busy} onClick={() => void deleteIds([...selected])}
            className="rounded-lg border border-rose-800 px-3 py-2 text-sm text-rose-300 hover:bg-rose-950/40 disabled:opacity-50">
            Delete selected ({selected.size})
          </button>}
          <button type="button" onClick={() => window.history.pushState(null, "", studioHref())}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
            <Plus size={16}/> Add Equipment
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {(["All", ...EQUIPMENT_CATEGORIES] as const).map(category => <button key={category} type="button"
          onClick={() => setFilter(category)} aria-pressed={filter === category}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === category ? "bg-cyan-400 text-slate-950" : "border border-slate-700 bg-slate-900 text-slate-300"}`}>
          {category === "All" ? "All" : EQUIPMENT_CATEGORY_LABELS[category]}
        </button>)}
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search equipment…"
          aria-label="Search equipment designs" className="ml-auto min-w-48 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"/>
      </div>

      {message && <p role="status" className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">{message}</p>}

      {grouped.map(group => <section key={group.category} className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-[.16em] text-cyan-300">{EQUIPMENT_CATEGORY_LABELS[group.category]} ({group.rows.length})</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {group.rows.map(row => {
            const frontPixels = readDesignSidePixels(row.pixel_data, "front", row.canvas_width);
            return <article key={row.id} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
              <div className="relative grid aspect-square place-items-center bg-[radial-gradient(ellipse_at_center,#173040,#080c13_72%)] p-4">
                <PixelHero pixelData={frontPixels} canvasWidth={row.canvas_width} canvasHeight={row.canvas_height} size={140}/>
                <label className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-slate-950/80 px-2 py-1 text-[10px] text-slate-300">
                  <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelected(row.id)} aria-label={`Select ${row.design_name}`}/>
                  Select
                </label>
                <span className={`absolute right-2 top-2 rounded px-2 py-0.5 text-[10px] font-semibold ${row.is_published ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700/60 text-slate-300"}`}>
                  {row.is_published ? "Published" : "Draft"}
                </span>
              </div>
              <div className="space-y-2 p-3">
                <h3 className="truncate text-sm font-semibold" title={row.design_name}>{row.design_name}</h3>
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span>{isEquipmentCategory(row.category) ? EQUIPMENT_CATEGORY_LABELS[row.category] : row.category}</span>
                  <span>{row.canvas_width}×{row.canvas_height}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => window.history.pushState(null, "", studioHref(row.id))}
                    className="rounded border border-slate-700 px-2 py-1 text-[11px] hover:border-cyan-400">Edit</button>
                  <button type="button" disabled={busy} onClick={() => void togglePublish(row)}
                    className="rounded border border-slate-700 px-2 py-1 text-[11px] hover:border-cyan-400 disabled:opacity-50">
                    {row.is_published ? "Unpublish" : "Publish"}
                  </button>
                  <button type="button" disabled={busy} onClick={() => void deleteIds([row.id])}
                    className="ml-auto rounded border border-rose-900/70 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-950/40 disabled:opacity-50">Delete</button>
                </div>
              </div>
            </article>;
          })}
        </div>
      </section>)}

      {!loading && !message && visible.length === 0 && <p className="rounded-lg border border-slate-800 p-8 text-center text-sm text-slate-500">No equipment designs yet. Use Add Equipment to create one in the studio.</p>}
      {loading && <p className="text-sm text-slate-400">Loading equipment designs…</p>}
    </div>
  </div>;
}
