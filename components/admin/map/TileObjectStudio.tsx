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
            pixel_data: { pixels: design.pixel_data },
          });
        }
      } catch (err) {
        console.warn("TileObjectStudio load error:", err);
      }
    }

    void loadTargetDesign();
    return () => {
      live = false;
    };
  }, [selectedDesignId, s]);

  return <PixelArtEditorView vm={controller} />;
}
