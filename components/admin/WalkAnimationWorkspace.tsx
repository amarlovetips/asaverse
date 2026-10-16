"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PixelHero from "@/components/PixelHero";
import { createClient } from "@/lib/supabase";
import IdleAnimationEditor from "./idle-animation/IdleAnimationEditor";
import type { CharacterItem } from "./idle-animation/types";
import { extractDesignPixels, readDesignSidePixels, readEmbeddedIdleFrames, readEmbeddedWalkingAnimation } from "@/lib/character-design-json";
import { adminMenuHref } from "./menu-config";
import WalkAnimationEditor from "./walk-animation/WalkAnimationEditor";
import type { WalkCharacterItem } from "./walk-animation/types";

const idleCategories = ["All", "Body", "Face", "Hair", "Facial Hair", "Clothing"] as const;
type AnimationTab = "walk" | "idle";
type Category = typeof idleCategories[number];

function categoryFor(type: string): Exclude<Category, "All"> | "Other" {
  const value = type.toLowerCase().replace(/-back$/, "");
  if (/facial[-_ ]?hair|beard|mustache/.test(value)) return "Facial Hair";
  if (/hair/.test(value)) return "Hair";
  if (/face|head/.test(value)) return "Face";
  if (/cloth|outfit|suit|dress|clothing/.test(value)) return "Clothing";
  if (/body|base/.test(value)) return "Body";
  return "Other";
}

export default function WalkAnimationWorkspace({ routeRemainder = [] }: { routeRemainder?: string[] }) {
  const [items, setItems] = useState<CharacterItem[]>([]);
  const activeTab: AnimationTab = routeRemainder[0] === "character-idle" ? "idle" : "walk";
  const selectedIdleItemId = activeTab === "idle" ? routeRemainder[1] || null : null;
  const selectedWalkItemId = routeRemainder[0] === "walking-animation" ? routeRemainder[1] || null : null;
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const routeKey = routeRemainder.join("/");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const db = createClient();
      const { data: auth, error: authError } = await db.auth.getUser();
      if (authError || !auth.user) throw new Error("Please sign in to load saved character items.");
      const { data: admin, error: adminError } = await db.from("admin_users")
        .select("role,is_active").eq("user_id", auth.user.id).maybeSingle();
      if (adminError || admin?.role !== "admin" || !admin.is_active) throw new Error("Admin permission denied.");
      const { data, error } = await db.from("character_designs")
        .select("id,design_name,design_type,canvas_width,canvas_height,pixel_data,updated_at,is_default_base,position_x,position_y")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as Array<Omit<CharacterItem, "pixel_data" | "idle_frames" | "pixel_data_json"> & { pixel_data: unknown }>;
      const loaded = rows.map(row => ({
        ...row,
        pixel_data: extractDesignPixels(row.pixel_data, row.canvas_width),
        pixel_data_json: row.pixel_data,
        idle_frames: readEmbeddedIdleFrames(row.pixel_data, "front", false, row.canvas_width),
        walking_animation: readEmbeddedWalkingAnimation(row.pixel_data, "front", false, row.canvas_width),
        back_pixel_data: readDesignSidePixels(row.pixel_data, "back", row.canvas_width),
        back_idle_frames: readEmbeddedIdleFrames(row.pixel_data, "back", true, row.canvas_width),
        back_walking_animation: readEmbeddedWalkingAnimation(row.pixel_data, "back", true, row.canvas_width),
      })) as WalkCharacterItem[];
      const missingIdleIds = loaded.filter(item => !item.idle_frames?.length).map(item => item.id);
      let legacyIdleWarning = "";
      if (missingIdleIds.length) {
        const { data: legacyFrames, error: legacyError } = await db.from("character_idle_animations")
          .select("character_design_id,frame_number,frame_data").in("character_design_id", missingIdleIds).order("frame_number");
        if (legacyError) legacyIdleWarning = `Legacy idle frames could not be loaded: ${legacyError.message}`;
        else {
          const byItem = new Map<string, Array<{ frame_number: number; frame_data: unknown }>>();
          for (const frame of (legacyFrames || []) as Array<{ character_design_id: string; frame_number: number; frame_data: unknown }>) {
            byItem.set(frame.character_design_id, [...(byItem.get(frame.character_design_id) || []), frame]);
          }
          for (const design of loaded) {
            const saved = byItem.get(design.id);
            if (!saved?.length) continue;
            const count = Math.max(3, ...saved.map(frame => frame.frame_number));
            const frames = Array.from({ length: count }, () => ({ pixelData: { ...design.pixel_data } }));
            for (const entry of saved) {
              const data = entry.frame_data as { pixelData?: unknown } | null;
              if (entry.frame_number > 0 && entry.frame_number <= count)
                frames[entry.frame_number - 1] = { pixelData: extractDesignPixels(data?.pixelData, design.canvas_width) };
            }
            design.idle_frames = frames;
          }
        }
      }
      setItems(loaded);
      if (legacyIdleWarning) setMessage(legacyIdleWarning);
      if (!data?.length) setMessage("No saved character items yet. Create and save art in Pixel Art Studio.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not load character items.");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadItems(); }, [loadItems, routeKey]);

  const visibleItems = useMemo(() => items.filter(item => {
    const category = categoryFor(item.design_type);
    const walkCategory = category === "Body" ? "Body" : category === "Clothing" ? "Clothing / Outfit" : null;
    const matchesCategory = activeTab === "idle"
      ? (selectedCategory === "All" || category === selectedCategory)
      : (walkCategory !== null && (!["Body", "Clothing / Outfit"].includes(selectedCategory) || walkCategory === selectedCategory));
    const query = search.trim().toLowerCase();
    return matchesCategory && (!query || `${item.design_name} ${item.design_type}`.toLowerCase().includes(query));
  }), [items, selectedCategory, search, activeTab]);

  const selectedItem = items.find(item => item.id === selectedIdleItemId);
  const selectedWalkItem = items.find(item => item.id === selectedWalkItemId && ["Body", "Clothing"].includes(categoryFor(item.design_type))) as WalkCharacterItem | undefined;
  if (activeTab === "idle" && selectedItem) {
    return <IdleAnimationEditor key={selectedItem.id} item={selectedItem} items={items} onBack={() => {
      window.history.pushState(null, "", `${adminMenuHref("Character Studio", "Walk Animations")}/character-idle`);
    }} />;
  }
  if (selectedWalkItem) return <WalkAnimationEditor key={`${selectedWalkItem.id}:${selectedWalkItem.updated_at}`} item={selectedWalkItem} items={items as WalkCharacterItem[]}
    onBack={() => window.history.pushState(null, "", adminMenuHref("Character Studio", "Walk Animations"))}
    onSaved={(id, pixelData) => setItems(old => old.map(item => item.id === id ? {
      ...item, pixel_data_json: pixelData,
      walking_animation: readEmbeddedWalkingAnimation(pixelData, "front", false, item.canvas_width),
      idle_frames: readEmbeddedIdleFrames(pixelData, "front", false, item.canvas_width),
      back_pixel_data: readDesignSidePixels(pixelData, "back", item.canvas_width),
      back_idle_frames: readEmbeddedIdleFrames(pixelData, "back", true, item.canvas_width),
      back_walking_animation: readEmbeddedWalkingAnimation(pixelData, "back", true, item.canvas_width),
    } : item))} />;
  const categories = activeTab === "idle" ? idleCategories : ["Body", "Clothing / Outfit"];

  return <div className="h-full overflow-y-auto bg-[#10151d] p-4 text-slate-100 sm:p-6">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">Character Studio / Animation</p>
          <h2 className="mt-1 text-2xl font-bold">Walk Animations</h2>
          <p className="mt-1 text-sm text-slate-400">{activeTab === "walk" ? "Walk Animation" : "Character Idle"} · Character item saved in Pixel Art Studio</p>
        </div>
        <button type="button" onClick={() => void loadItems()} disabled={loading}
          className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm hover:border-cyan-400 disabled:opacity-50">
          {loading ? "Loading…" : "Refresh items"}
        </button>
      </header>

      <div role="tablist" aria-label="Character animation type" className="flex w-fit gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
        {(["walk", "idle"] as const).map(tab => <button key={tab} type="button" role="tab" id={`${tab}-animation-tab`} aria-controls="character-items-panel" aria-selected={activeTab === tab}
          onClick={() => { setSelectedCategory("All"); window.history.pushState(null, "", tab === "walk" ? adminMenuHref("Character Studio", "Walk Animations")
            : `${adminMenuHref("Character Studio", "Walk Animations")}/character-idle`); }}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${activeTab === tab ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:text-white"}`}>
          {tab === "walk" ? "Walk Animation" : "Character Idle"}
        </button>)}
      </div>
      <section role="tabpanel" id="character-items-panel" aria-labelledby={`${activeTab}-animation-tab`} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {categories.map(category => <button key={category} type="button" onClick={() => setSelectedCategory(category === "All" ? "All" : category)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selectedCategory === category ? "bg-cyan-400 text-slate-950" : "border border-slate-700 bg-slate-900 text-slate-300"}`}>
            {category}
          </button>)}
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search saved items…"
            aria-label="Search saved character items" className="ml-auto min-w-48 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400" />
        </div>

        {message && <p role="status" className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">{message}</p>}
        {!loading && visibleItems.length > 0 && <p className="text-xs text-slate-500">Showing {visibleItems.length} of {items.length} saved items</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visibleItems.map(item => <article key={item.id} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
            <button type="button" onClick={() => window.history.pushState(null, "", activeTab === "idle"
              ? `${adminMenuHref("Character Studio", "Walk Animations")}/character-idle/${encodeURIComponent(item.id)}`
              : `${adminMenuHref("Character Studio", "Walk Animations")}/walking-animation/${encodeURIComponent(item.id)}`)}
              className="block w-full text-left cursor-pointer hover:bg-slate-800/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">
              <div className="grid aspect-square place-items-center bg-[radial-gradient(ellipse_at_center,#173040,#080c13_72%)] p-4">
                <PixelHero pixelData={item.pixel_data} canvasWidth={item.canvas_width} canvasHeight={item.canvas_height} size={160} />
              </div>
              <div className="space-y-1 p-3">
                <h3 className="truncate text-sm font-semibold" title={item.design_name}>{item.design_name}</h3>
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span className="capitalize">{item.design_type.replaceAll("-", " ")}</span>
                  <span>{item.canvas_width}×{item.canvas_height}</span>
                </div>
                  <p className="text-[10px] text-slate-600">{activeTab === "idle" ? "Click to edit 3 frames" : `${(item as WalkCharacterItem).walking_animation?.frames.length || 6} walking frames · Click to edit`}</p>
              </div>
            </button>
          </article>)}
        </div>
        {!loading && !message && visibleItems.length === 0 && <p className="rounded-lg border border-slate-800 p-8 text-center text-sm text-slate-500">No character items match this filter.</p>}
      </section>
    </div>
  </div>;
}
