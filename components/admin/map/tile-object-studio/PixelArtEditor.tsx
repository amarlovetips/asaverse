"use client";

import PixelArtEditorView from "./PixelArtEditorView";
import { usePixelArtEditorController } from "./usePixelArtEditorController";

export default function PixelArtEditor() {
  const controller = usePixelArtEditorController();
  return <PixelArtEditorView vm={controller}/>;
}



