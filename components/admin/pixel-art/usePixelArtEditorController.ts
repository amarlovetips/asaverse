"use client";

import { useState } from "react";
import { usePixelEditorState } from "./usePixelEditorState";
import { useReferenceImage } from "./useReferenceImage";
import { usePixelEditorShortcuts } from "./usePixelEditorShortcuts";
import type { ReferenceTool } from "./ReferenceToolRail";

export type EditorPanel = "tools" | "image" | "save" | "load" | "publish" | "export" | "base" | "history";
const colors = ["#171923", "#ffffff", "#f2c49b", "#754631", "#392447", "#d65b82", "#19b9ad", "#4168d9", "#b8476a", "#d69a38", "#794bd0", "#e6e6ee", "#38d9ee", "#4ae08e", "#000000", "#888888"];

export function usePixelArtEditorController() {
  const s = usePixelEditorState();
  const [confirmClear, setConfirmClear] = useState(false), [panel, setPanel] = useState<EditorPanel>("tools");
  const [colorLayer, setColorLayer] = useState<{ scope: string; layer: "fill" | "border" }>({ scope: "", layer: "border" });
  const scope = `${s.part}:${s.side}`;
  if (colorLayer.scope !== scope) setColorLayer({ scope, layer: "border" });
  const activeColor = colorLayer.scope === scope ? colorLayer.layer : "border";
  function setActiveColor(layer: "fill" | "border") { setColorLayer({ scope, layer }); }
  const [frontOpacity, setFrontOpacity] = useState(0.28);
  const [filter, setFilter] = useState("grayscale");
  const image = useReferenceImage(s.size, s.height, pixels => { s.remember(); s.setPixels(pixels); s.clearSelection(); s.setTool("pencil"); setPanel("tools"); }, () => setPanel("image"));
  usePixelEditorShortcuts(s, !!image.url, () => setPanel("image"), () => setPanel("tools"));
  function chooseColor(value: string) { s.setColor(value); if (activeColor === "fill") { s.setFillColor(value); s.setShapeFillColor(value); } else s.setBorderColor(value); s.setRecent(old => [value, ...old.filter(item => item !== value)].slice(0, 10)); }
  function selectTool(tool: ReferenceTool) { s.setTool(tool); setPanel("tools"); }
  return { s, image, panel, setPanel, confirmClear, setConfirmClear, activeColor, setActiveColor, frontOpacity, setFrontOpacity, filter, setFilter, colors, chooseColor, selectTool };
}
