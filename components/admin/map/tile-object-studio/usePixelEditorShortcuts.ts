"use client";

import { useEffect } from "react";
import type { ReferenceTool } from "./ReferenceToolRail";
import type { usePixelEditorState } from "./usePixelEditorState";

type State = ReturnType<typeof usePixelEditorState>;

export function usePixelEditorShortcuts(s: State, imageAvailable: boolean, onImageControls: () => void, onToolChange: () => void) {
  useEffect(() => {
    function handle(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable)) return;
      const key = event.key.toLowerCase(), mod = event.ctrlKey || event.metaKey;
      if (mod && key === "z") { event.preventDefault(); if (event.shiftKey) s.redo(); else s.undo(); return; }
      if (mod && key === "y") { event.preventDefault(); s.redo(); return; }
      if (s.tool === "select" && mod && key === "a") { event.preventDefault(); s.selectAll(); return; }
      if (s.tool === "select" && mod && event.shiftKey && key === "i") { event.preventDefault(); s.invertSelection(); return; }
      if (s.tool === "select" && mod && key === "c") { event.preventDefault(); s.copySelectionPixels(); return; }
      if (s.tool === "select" && mod && key === "x") { event.preventDefault(); s.copySelectionPixels(true); return; }
      if (s.tool === "select" && mod && key === "v") { event.preventDefault(); s.pasteSelectionPixels(); return; }
      if (s.tool === "select" && event.key === "Escape") { event.preventDefault(); s.clearSelection(); return; }
      if (s.tool === "select" && event.key === "Delete" && s.selection) { event.preventDefault(); s.deleteSelection(); return; }
      if (s.tool === "select" && event.shiftKey && key === "h") { event.preventDefault(); s.transformSelectionPixels("horizontal"); return; }
      if (s.tool === "select" && event.shiftKey && key === "v") { event.preventDefault(); s.transformSelectionPixels("vertical"); return; }
      if (s.tool === "select" && key === "r") { event.preventDefault(); s.transformSelectionPixels(event.shiftKey ? "counterclockwise" : "clockwise"); return; }
      if (key === "i" && imageAvailable) { event.preventDefault(); onImageControls(); return; }
      if (s.selection && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault(); const n = event.shiftKey ? 10 : 1;
        s.moveSelectionBy(event.key === "ArrowLeft" ? -n : event.key === "ArrowRight" ? n : 0, event.key === "ArrowUp" ? -n : event.key === "ArrowDown" ? n : 0); return;
      }
      const shortcuts: Record<string, ReferenceTool> = { v: "select", w: "magic", b: "pencil", e: "eraser", g: "fill", l: "line", u: "rectangle", o: "circle", p: "polygon", t: "text", f: "filter", d: "gradient", c: "crop", k: "perspective" };
      if (shortcuts[key]) { event.preventDefault(); s.setTool(shortcuts[key]); onToolChange(); }
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [s, imageAvailable, onImageControls, onToolChange]);
}



