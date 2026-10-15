"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabase";
import { getCharacterDesignSlot } from "@/lib/character-design-defaults";

export type PublishedDesign = {
  id: string;
  design_name: string;
  design_type: string;
  canvas_width: number;
  pixel_data: unknown;
  palette: string[];
  is_published: boolean;
};

const categories = ["All categories", "body", "face", "hair", "facial-hair", "clothing", "outfit"];

export default function BackDesignPicker({
  selectedId, selectedCategory, onSelect,
}: { selectedId: string | null; selectedCategory: string; onSelect: (design: PublishedDesign) => void }) {
  const [items, setItems] = useState<PublishedDesign[]>([]);
  const [filter, setFilter] = useState("All categories");
  const [message, setMessage] = useState("Loading published designs…");

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const db = createClient();
        const { data: { user }, error: authError } = await db.auth.getUser();
        if (authError || !user) throw Error("Please sign in first.");
        const { data: admin, error: adminError } = await db.from("admin_users")
          .select("role,is_active").eq("user_id", user.id).maybeSingle();
        if (adminError || admin?.role !== "admin" || !admin.is_active) throw Error("Admin permission denied.");
        const { data, error } = await db.from("character_designs")
          .select("id,design_name,design_type,canvas_width,pixel_data,palette,is_published")
          .eq("is_published", true).order("design_name", { ascending: true });
        if (error) throw error;
        const fronts = ((data || []) as PublishedDesign[]).filter(d =>
          !d.design_type.toLowerCase().endsWith("-back") &&
          [16, 32, 64].includes(d.canvas_width) &&
          ["body", "face", "facial-hair", "hair", "clothing", "outfit"].includes(d.design_type.toLowerCase())
        );
        if (!live) return;
        setItems(fronts);
        setMessage(fronts.length ? "" : "No published front designs found.");
      } catch (error) {
        if (live) setMessage(error instanceof Error ? error.message : "Could not load published designs.");
      }
    }
    void load();
    return () => { live = false; };
  }, []);

  const visible = useMemo(() => items.filter(d => {
    if (filter === "All categories") return true;
    const slot = getCharacterDesignSlot(d.design_type);
    const category = slot === "facialHair" ? "facial-hair" : slot;
    return category === filter || (filter === "outfit" && d.design_type.toLowerCase() === "outfit");
  }), [items, filter]);

  function choose(id: string) {
    const design = items.find(item => item.id === id);
    if (design) onSelect(design);
  }

  return <div className="flex min-w-0 items-center gap-1.5">
      <label className="sr-only" htmlFor="back-design-filter">Filter by item</label>
      <select id="back-design-filter" value={filter} onChange={e => setFilter(e.target.value)} className="w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 capitalize" aria-label="Filter published designs by item">
        {categories.map(category => <option key={category} value={category}>{category === "All categories" ? category : category.replace("-", " ")}</option>)}
      </select>
      <label className="sr-only" htmlFor="back-design-choice">Published front design</label>
      <select id="back-design-choice" value={selectedId || ""} onChange={e => choose(e.target.value)} className="w-36 min-w-0 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100" aria-label="Choose published front design">
        <option value="">Choose a design…</option>
        {selectedId && items.find(d => d.id === selectedId) && !visible.some(d => d.id === selectedId) && <option value={selectedId}>{items.find(d => d.id === selectedId)?.design_name}</option>}
        {visible.map(d => <option key={d.id} value={d.id}>{d.design_name} · {d.design_type}</option>)}
      </select>
      <label className="sr-only" htmlFor="back-design-category">Detected item category</label>
      <select id="back-design-category" disabled={!selectedId} value={selectedCategory} className="w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs capitalize text-slate-400" aria-label="Detected item category">
        {categories.slice(1).map(category => <option key={category} value={category}>{category.replace("-", " ")}</option>)}
      </select>
      {message && <span role="status" title={message} className="sr-only">{message}</span>}
  </div>;
}
