"use client";
import { useState } from "react";
import { createClient } from "../../../../lib/supabase";

type Design = {
  id: string;
  design_name: string;
  design_type: string;
  canvas_width: number;
  canvas_height: number;
  pixel_data: unknown;
  palette: string[];
};

type Props = { onLoad: (d: Design) => void };

export default function LoadDesigns({ onLoad }: Props) {
  const [items, setItems] = useState<Design[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    setMessage("Loading...");
    const db = createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) {
      setMessage("Please sign in first.");
      return;
    }

    const loaded: Design[] = [];

    // Load from map_tiles
    try {
      const { data: tiles } = await db
        .from("map_tiles")
        .select("id, name, category, canvas_width, canvas_height, pixel_data, palette")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (tiles && tiles.length) {
        for (const t of tiles) {
          if (t.category === "map") continue;
          loaded.push({
            id: t.id,
            design_name: t.name,
            design_type: t.category || "tiles",
            canvas_width: t.canvas_width,
            canvas_height: t.canvas_height,
            pixel_data: t.pixel_data,
            palette: t.palette || [],
          });
        }
      }
    } catch (err) {
      console.warn("load map_tiles error:", err);
    }

    // Load from map_objects
    try {
      const { data: objects } = await db
        .from("map_objects")
        .select("id, name, category, canvas_width, canvas_height, pixel_data, palette")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (objects && objects.length) {
        for (const o of objects) {
          if (o.category === "map") continue;
          loaded.push({
            id: o.id,
            design_name: o.name,
            design_type: o.category || "object",
            canvas_width: o.canvas_width,
            canvas_height: o.canvas_height,
            pixel_data: o.pixel_data,
            palette: o.palette || [],
          });
        }
      }
    } catch (err) {
      console.warn("load map_objects error:", err);
    }

    setItems(loaded);
    setMessage(loaded.length ? "" : "No saved tiles or objects found.");
  }

  return (
    <section className="space-y-2">
      <button
        onClick={load}
        className="w-full rounded bg-slate-800 p-2 text-xs font-semibold hover:bg-slate-700 transition"
      >
        Load Saved Tiles &amp; Objects
      </button>
      {message && <p className="text-xs text-slate-400">{message}</p>}
      <div className="max-h-60 space-y-1 overflow-y-auto">
        {items.map((d) => (
          <button
            key={d.id}
            onClick={() => onLoad(d)}
            className="block w-full rounded border border-slate-700 bg-slate-900/60 p-2 text-left text-xs transition hover:border-cyan-500/70 hover:bg-slate-800"
          >
            <div className="font-medium text-slate-200">{d.design_name}</div>
            <div className="text-[10px] text-slate-400">
              {d.design_type} &middot; {d.canvas_width}&times;{d.canvas_height}px
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
