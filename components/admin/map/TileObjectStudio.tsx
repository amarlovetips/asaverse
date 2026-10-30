"use client";

import { useEffect, useRef } from "react";
import PixelArtEditorView from "./tile-object-studio/PixelArtEditorView";
import { usePixelArtEditorController } from "./tile-object-studio/usePixelArtEditorController";
import { fetchTileObjectById } from "./lib/tileObjectStorage";

export default function TileObjectStudio({
  routeRemainder = [],
}: {
  routeRemainder?: string[];
}) {
  const selectedDesignId =
    routeRemainder[0] && routeRemainder[0] !== "new"
      ? decodeURIComponent(routeRemainder[0])
      : null;

  const controller = usePixelArtEditorController({
    categories: ["tiles", "object", "tree", "water", "stone", "terrain", "decoration", "buildings", "others"],
  });

  const { s } = controller;
  const lastLoadedId = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedDesignId) {
      if (lastLoadedId.current) {
        lastLoadedId.current = null;
        s.setActiveDesignId(null);
      }
      return;
    }

    if (lastLoadedId.current === selectedDesignId) return;

    let live = true;
    async function loadTargetDesign() {
      try {
        const design = await fetchTileObjectById(selectedDesignId!);
        if (live && design) {
          lastLoadedId.current = design.id;
          s.loadDesign({
            id: design.id,
            design_name: design.name,
            design_type: design.category,
            canvas_width: design.canvas_width,
            canvas_height: design.canvas_height,
            pixel_data: {
              pixels: design.pixel_data,
              base_pixels: design.base_pixels,
              text_layers: design.text_layers,
            },
            palette: design.palette,
          });
        }
      } catch (err) {
        // Surface the real Supabase error so the editor doesn't open with a
        // blank/preview-less design. The caller (parent workspace) will display it.
        throw err;
      }
    }

    void loadTargetDesign();
    return () => {
      live = false;
    };
  }, [selectedDesignId, s]);

  return <PixelArtEditorView vm={controller} />;
}
