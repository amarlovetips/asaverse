"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";

type Design = {
  format?: string;
  design?: {
    design_name?: string;
    design_type?: string;
    canvas_width?: number;
    canvas_height?: number;
    pixel_data?: Record<string, string>;
  };
};
type Character = { url: string; data: Design | null; error?: string };

function PixelPreview({ data }: { data: Design["design"] }) {
  const width = data?.canvas_width || 64;
  const height = data?.canvas_height || 64;
  const pixels = data?.pixel_data || {};
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-24 rounded bg-slate-950" shapeRendering="crispEdges">
      {Object.entries(pixels).map(([point, color]) => {
        const [x, y] = point.split(",").map(Number);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !/^#[0-9a-f]{6}$/i.test(color)) return null;
        return <rect key={point} x={x} y={y} width="1" height="1" fill={color} />;
      })}
    </svg>
  );
}

export default function GitHubCharacterWorkspace() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/github-characters.json", { cache: "no-store" });
      if (!response.ok) throw Error("Could not load character list.");
      const config = await response.json();
      const urls: string[] = Array.isArray(config.links) ? config.links : [];
      const results = await Promise.all(urls.map(async (url): Promise<Character> => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw Error("Fetch failed");
          const data = await res.json() as Design;
          if (!data.design?.pixel_data) throw Error("Not a supported character JSON");
          return { url, data };
        } catch {
          return { url, data: null, error: "Could not load character JSON" };
        }
      }));
      setCharacters(results);

      const db = createClient();
      const { data: auth } = await db.auth.getUser();
      if (!auth.user) throw Error("Please sign in.");
      const { data: admin, error: adminError } = await db.from("admin_users")
        .select("role,is_active").eq("user_id", auth.user.id).maybeSingle();
      if (adminError || admin?.role !== "admin" || !admin.is_active)
        throw Error("Admin permission denied.");
      const { data: setting, error } = await db.from("game_settings")
        .select("setting_value").eq("setting_key", "play_github_characters_enabled").maybeSingle();
      if (error) throw error;
      if (setting) setEnabled(setting.setting_value === "true");
      else setMessage("Setting missing. Run the setup SQL first.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load settings.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggle() {
    setBusy(true);
    setMessage("");
    try {
      const db = createClient();
      const { data: auth } = await db.auth.getUser();
      if (!auth.user) throw Error("Please sign in.");
      const { data: admin, error: adminError } = await db.from("admin_users")
        .select("role,is_active").eq("user_id", auth.user.id).maybeSingle();
      if (adminError || admin?.role !== "admin" || !admin.is_active)
        throw Error("Admin permission denied.");
      const next = !enabled;
      const { error } = await db.from("game_settings").upsert({
        setting_key: "play_github_characters_enabled",
        setting_value: String(next),
        updated_at: new Date().toISOString()
      }, { onConflict: "setting_key" });
      if (error) throw error;
      setEnabled(next);
      setMessage(next ? "GitHub characters enabled." : "GitHub characters disabled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save setting.");
    } finally {
      setBusy(false);
    }
  }

  const groups = characters.reduce<Record<string, Character[]>>((result, item) => {
    const category = item.data?.design?.design_type || "Uncategorized";
    (result[category] ||= []).push(item);
    return result;
  }, {});

  return (
    <div className="h-full space-y-4 overflow-y-auto p-5 text-slate-100">
      <div>
        <p className="text-xs text-slate-500">Character Studio / GitHub Character</p>
        <h2 className="mt-2 text-xl font-semibold">GitHub Characters</h2>
        <p className="mt-1 text-sm text-slate-400">Pixel previews grouped by design type. Links are kept hidden.</p>
      </div>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900 p-4">
        <div>
          <h3 className="font-semibold">GitHub Character Source</h3>
          <p className="text-xs text-slate-400">ON/OFF is stored in Supabase.</p>
        </div>
        <button type="button" disabled={busy} onClick={() => void toggle()}
          aria-pressed={enabled}
          className={`rounded px-4 py-2 text-sm font-semibold disabled:opacity-50 ${enabled ? "bg-emerald-700" : "bg-slate-700"}`}>
          {busy ? "Loading..." : enabled ? "ON · Click to disable" : "OFF · Click to enable"}
        </button>
      </section>

      {Object.entries(groups).map(([category, items]) => (
        <section key={category} className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-4">
          <div className="flex justify-between gap-2">
            <h3 className="font-semibold capitalize">{category}</h3>
            <span className="text-xs text-slate-400">{items.length} designs</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <div key={`${item.url}-${index}`} className="flex items-center gap-3 rounded border border-slate-800 p-3">
                {item.data?.design ? <PixelPreview data={item.data.design} /> :
                  <div className="flex h-24 w-24 items-center justify-center rounded bg-slate-950 text-xs text-red-400">Load failed</div>}
                <div className="min-w-0">
                  <p className="break-words font-medium">{item.data?.design?.design_name || `Character ${index + 1}`}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.data?.design?.canvas_width || "?"} × {item.data?.design?.canvas_height || "?"}
                  </p>
                  {item.error && <p className="mt-1 text-xs text-red-400">{item.error}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      {characters.length === 0 && <p className="text-sm text-slate-500">No character links found in the JSON config.</p>}
      {message && <p role="status" className="text-sm text-slate-300">{message}</p>}
    </div>
  );
}
