"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import PixelHero from "@/components/PixelHero";
import { createClient } from "@/lib/supabase";
import { readDesignSidePixels } from "@/lib/character-design-json";
import { adminMenuHref } from "../menu-config";
import { EQUIPMENT_CATEGORY_LABELS, isEquipmentCategory } from "./types";
import EquipmentAnimationEditor from "./animation/EquipmentAnimationEditor";

type Row = { id: string; design_name: string; category: string; canvas_width: number; canvas_height: number; pixel_data: unknown; is_published: boolean };

export default function EquipmentAnimationWorkspace({ routeRemainder = [] }: { routeRemainder?: string[] }) {
  const selectedId = routeRemainder[0] && routeRemainder[0] !== "new" ? routeRemainder[0] : null;
  const listHref = adminMenuHref("Equipment", "Animation");
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const db = createClient();
      const { data, error } = await db.from("equipment_designs")
        .select("id,design_name,category,canvas_width,canvas_height,pixel_data,is_published")
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

  if (selectedId) {
    return <EquipmentAnimationEditor key={selectedId} designId={selectedId}
      onBack={() => window.history.pushState(null, "", listHref)}/>;
  }

  return <div className="h-full min-h-0 overflow-y-auto p-5 text-[#d9e0e9]">
    <div className="mx-auto max-w-6xl space-y-4">
      <header>
        <p className="text-xs text-slate-500">Equipment / Animation</p>
        <h1 className="mt-1 text-2xl font-bold">Equipment Animation</h1>
        <p className="mt-1 text-sm text-slate-400">Create equipment-specific animation frames. Select a design to open its editor.</p>
      </header>

      {message && <p role="status" className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">{message}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map(item => <article key={item.id} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
          <button type="button" onClick={() => window.history.pushState(null, "", `${listHref}/${encodeURIComponent(item.id)}`)}
            className="block w-full text-left hover:bg-slate-800/70">
            <div className="grid aspect-square place-items-center bg-[radial-gradient(ellipse_at_center,#173040,#080c13_72%)] p-4">
              <PixelHero pixelData={readDesignSidePixels(item.pixel_data, "front", item.canvas_width)}
                canvasWidth={item.canvas_width} canvasHeight={item.canvas_height} size={140}/>
            </div>
            <div className="space-y-1 p-3">
              <h3 className="truncate text-sm font-semibold" title={item.design_name}>{item.design_name}</h3>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{isEquipmentCategory(item.category) ? EQUIPMENT_CATEGORY_LABELS[item.category] : item.category}</span>
                <span className={item.is_published ? "text-emerald-300" : "text-slate-500"}>{item.is_published ? "Published" : "Draft"}</span>
              </div>
              <p className="text-[10px] text-slate-600">Click to edit animation frames</p>
            </div>
          </button>
        </article>)}
      </div>

      {!loading && !message && items.length === 0 && <p className="rounded-lg border border-slate-800 p-8 text-center text-sm text-slate-500">No equipment designs yet. Create one in Equipment Studio first.</p>}
      {loading && <p className="text-sm text-slate-400">Loading equipment designs…</p>}
    </div>
  </div>;
}
