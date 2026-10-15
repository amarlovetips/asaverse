"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { extractDesignPixels, readEmbeddedIdleFrames } from "@/lib/character-design-json";
import type { IdleAnimationFrameJson } from "@/lib/character-design-json";

export type PlayDesign = {
  id: string;
  design_name: string;
  design_type: string;
  canvas_width: number;
  canvas_height: number;
  pixel_data: Record<string, string>;
  idle_frames?: IdleAnimationFrameJson[] | null;
  is_default_base?: boolean;
  position_x?: number;
  position_y?: number;
  source: "supabase" | "github";
};

export function usePlayDesigns() {
  const [designs, setDesigns] = useState<PlayDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const db = createClient();
      const { data: settings, error: settingsError } = await db
        .from("game_settings")
        .select("setting_key,setting_value")
        .in("setting_key", [
          "play_supabase_characters_enabled",
          "play_github_characters_enabled",
        ]);

      if (settingsError) throw settingsError;

      const flags = new Map(
        (settings || []).map((s: { setting_key: string; setting_value: string }) => [s.setting_key, s.setting_value === "true"])
      );
      const result: PlayDesign[] = [];

      if (flags.get("play_supabase_characters_enabled") !== false) {
        const { data, error } = await db
          .from("character_designs")
          .select("id,design_name,design_type,canvas_width,canvas_height,pixel_data,position_x,position_y,is_default_base")
          .eq("is_published", true)
          .order("updated_at", { ascending: false });

        if (error) throw error;

        for (const d of data || []) {
          result.push({ ...d, pixel_data: extractDesignPixels(d.pixel_data, d.canvas_width) || {}, idle_frames: readEmbeddedIdleFrames(d.pixel_data), source: "supabase" });
        }
      }

      if (flags.get("play_github_characters_enabled") === true) {
        const response = await fetch("/github-characters.json", { cache: "no-store" });
        if (!response.ok) throw Error("GitHub character config failed.");

        const config = await response.json();
        const urls: string[] = Array.isArray(config.links) ? config.links : [];

        const remote = await Promise.all(urls.map(async (url, index) => {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw Error(`GitHub design ${index + 1} failed.`);
          const json = await res.json();
          const d = json.design;
          if (!d?.pixel_data) return null;

          return {
            id: `github-${index}-${d.design_name || "design"}`,
            design_name: d.design_name || `GitHub Design ${index + 1}`,
            design_type: d.design_type || "character",
            canvas_width: d.canvas_width || 64,
            canvas_height: d.canvas_height || 64,
            pixel_data: extractDesignPixels(d.pixel_data, d.canvas_width || 64),
            idle_frames: readEmbeddedIdleFrames(d.pixel_data),
            source: "github" as const,
          };
        }));

        result.push(...remote.filter((d): d is NonNullable<typeof d> => d !== null));
      }

      setDesigns(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load character designs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { designs, loading, error, reload: load };
}
