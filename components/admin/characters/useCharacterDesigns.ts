"use client";
import { useState, useCallback } from "react";
import { createClient } from "../../../lib/supabase";
import type { Design } from "./components/DesignList";
import { mergeDesignPixels } from "@/lib/character-design-json";
import { getCharacterDesignSlot } from "@/lib/character-design-defaults";

export function useCharacterDesigns() {
  const [items, setItems] = useState<Design[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const run = useCallback(async (
    task: (db: ReturnType<typeof createClient>) => Promise<void>
  ): Promise<boolean> => {
    setBusy(true);
    try {
      const db = createClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw Error("Please sign in.");
      const { data: admin, error: check } = await db.from("admin_users")
        .select("role,is_active").eq("user_id", user.id).maybeSingle();
      if (check || admin?.role !== "admin" || !admin.is_active)
        throw Error("Admin permission denied.");
      await task(db);
      setMessage("Operation completed.");
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Operation failed.");
      return false;
    } finally { setBusy(false); }
  }, []);

  const load = () => run(async db => {
    const { data, error } = await db.from("character_designs")
      .select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    setItems((data || []) as Design[]);
  });

  const toggle = (d: Design) => run(async db => {
    if (d.is_default_base && d.is_published)
      throw Error("Remove this design as the default before unpublishing it.");
    const { error } = await db.from("character_designs")
      .update({ is_published: !d.is_published }).eq("id", d.id);
    if (error) throw error;
    setItems(old => old.map(x => x.id === d.id
      ? { ...x, is_published: !d.is_published } : x));
  });

  const remove = (d: Design) => run(async db => {
    const { error } = await db.from("character_designs").delete().eq("id", d.id);
    if (error) throw error;
    setItems(old => old.filter(x => x.id !== d.id));
  });

  const setDefault = (d: Design) => run(async db => {
    if (d.design_type.toLowerCase().endsWith("-back"))
      throw Error("Choose the front design as the default.");
    const slot = getCharacterDesignSlot(d.design_type);
    if (!slot) throw Error("This design type cannot be used as a character default.");

    if (d.is_default_base) {
      const { error } = await db.from("character_designs")
        .update({ is_default_base: false }).eq("id", d.id);
      if (error) throw error;
      setItems(old => old.map(x => x.id === d.id
        ? { ...x, is_default_base: false } : x));
      return;
    }

    const existingDefaults = items.filter(x =>
      x.id !== d.id && x.is_default_base && getCharacterDesignSlot(x.design_type) === slot
    );
    if (existingDefaults.length) {
      const { error } = await db.from("character_designs")
        .update({ is_default_base: false })
        .in("id", existingDefaults.map(x => x.id));
      if (error) throw error;
    }

    const { error } = await db.from("character_designs")
      .update({ is_default_base: true, is_published: true }).eq("id", d.id);
    if (error) throw error;
    setItems(old => old.map(x => getCharacterDesignSlot(x.design_type) === slot
      ? { ...x, is_default_base: x.id === d.id, is_published: x.id === d.id ? true : x.is_published }
      : x));
  });
  const saveSide = async (
    d: Design, side: "front" | "back", pixels: Record<string, string>
  ): Promise<boolean> => {
    const type = d.design_type.replace(/-back$/, "");
    const targetType = side === "back" ? `${type}-back` : type;
    const existing = items.find(x => x.design_type === targetType);

    return run(async db => {
      if (existing) {
        const { error } = await db.from("character_designs")
          .update({
            pixel_data: mergeDesignPixels(existing.pixel_data, pixels), canvas_width: 64, canvas_height: 64,
            updated_at: new Date().toISOString()
          }).eq("id", existing.id);
        if (error) throw error;
        setItems(old => old.map(x => x.id === existing.id
          ? { ...x, pixel_data: { ...mergeDesignPixels(x.pixel_data, pixels) } as Record<string, string>, canvas_width: 64 } : x));
      } else {
        const { data, error } = await db.from("character_designs")
          .insert({
            user_id: d.user_id, design_name: d.design_name,
            design_type: targetType, canvas_width: 64, canvas_height: 64,
            pixel_data: mergeDesignPixels(null, pixels), palette: d.palette || [],
            is_published: false, is_default_base: false
          }).select("*").single();
        if (error) throw error;
        setItems(old => [data as Design, ...old]);
      }
    });
  };

  const savePosition = (d: Design, x: number, y: number) => run(async db => {
    const { error } = await db.from("character_designs")
      .update({
        position_x: x, position_y: y,
        updated_at: new Date().toISOString()
      }).eq("id", d.id);
    if (error) throw error;
    setItems(old => old.map(item => item.id === d.id
      ? { ...item, position_x: x, position_y: y } : item));
  });

  return { items, busy, message, load, toggle, remove, saveSide, savePosition, setDefault };
}
