"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../../lib/supabase";
import { getCharacterDesignSlot } from "@/lib/character-design-defaults";
import { validArtboardDimensions } from "./artboardDimensions";
import type { PublishedDesign } from "./BackDesignPickerTypes";
export function useBackDesignPicker(onSelect: (design: PublishedDesign) => void) {
  const [items, setItems] = useState<PublishedDesign[]>([]), [filter, setFilter] = useState("All categories"), [message, setMessage] = useState("Loading published designs…");
  useEffect(() => {
    let live = true;
    async function load() { try {
      const db = createClient(), { data: { user }, error: authError } = await db.auth.getUser();
      if (authError || !user) throw Error("Please sign in first.");
      const { data: admin, error: adminError } = await db.from("admin_users").select("role,is_active").eq("user_id", user.id).maybeSingle();
      if (adminError || admin?.role !== "admin" || !admin.is_active) throw Error("Admin permission denied.");
      const { data, error } = await db.from("character_designs").select("id,design_name,design_type,canvas_width,canvas_height,pixel_data,palette,is_published").eq("is_published", true).order("design_name", { ascending: true });
      if (error) throw error;
      const fronts = ((data || []) as PublishedDesign[]).filter(d => !d.design_type.toLowerCase().endsWith("-back") && validArtboardDimensions(d.canvas_width, d.canvas_height || d.canvas_width) && ["body", "face", "facial-hair", "hair", "clothing", "outfit"].includes(d.design_type.toLowerCase()));
      if (live) { setItems(fronts); setMessage(fronts.length ? "" : "No published front designs found."); }
    } catch (error) { if (live) setMessage(error instanceof Error ? error.message : "Could not load published designs."); } }
    void load(); return () => { live = false; };
  }, []);
  const visible = useMemo(() => items.filter(d => { if (filter === "All categories") return true; const slot = getCharacterDesignSlot(d.design_type), itemCategory = slot === "facialHair" ? "facial-hair" : slot; return itemCategory === filter || filter === "outfit" && d.design_type.toLowerCase() === "outfit"; }), [items, filter]);
  function choose(id: string) { const design = items.find(item => item.id === id); if (design) onSelect(design); }
  return { items, visible, filter, setFilter, message, choose };
}



