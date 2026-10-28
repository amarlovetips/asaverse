"use client";
import { useState } from "react";
import { createClient } from "../../../../lib/supabase";
import { EQUIPMENT_CATEGORY_LABELS, isEquipmentCategory, type EquipmentDesignForEditor } from "../types";

type Props = { onLoad: (d: EquipmentDesignForEditor) => void };

export default function EquipmentLoadDesigns({ onLoad }: Props) {
  const [items, setItems] = useState<EquipmentDesignForEditor[]>([]);
  const [message, setMessage] = useState("");
  async function load() {
    setMessage("Loading...");
    const db = createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) { setMessage("Please sign in first."); return; }
    const { data, error } = await db.from("equipment_designs")
      .select("id,design_name,category,canvas_width,canvas_height,pixel_data,updated_at")
      .order("updated_at", { ascending: false });
    if (error) { setMessage(error.message); return; }
    type Row = { id: string; design_name: string; category: string; canvas_width: number; canvas_height: number; pixel_data: unknown };
    const rows = ((data || []) as Row[]).filter(row => isEquipmentCategory(row.category)).map(row => ({
      id: row.id, design_name: row.design_name, design_type: row.category,
      canvas_width: row.canvas_width, canvas_height: row.canvas_height, pixel_data: row.pixel_data,
    }));
    setItems(rows);
    setMessage(rows.length ? "" : "No saved equipment designs.");
  }
  return <section className="space-y-2">
    <button onClick={load} className="w-full rounded bg-slate-800 p-2 text-xs">Load Saved Equipment</button>
    {message && <p className="text-xs text-slate-400">{message}</p>}
    {items.map(d => <button key={d.id} onClick={() => onLoad(d)}
      className="block w-full rounded border border-slate-700 p-2 text-left text-xs hover:border-cyan-700">
      {d.design_name} {"\u00B7"} {isEquipmentCategory(d.design_type) ? EQUIPMENT_CATEGORY_LABELS[d.design_type] : d.design_type} {"\u00B7"} {d.canvas_width}px
    </button>)}
  </section>;
}
