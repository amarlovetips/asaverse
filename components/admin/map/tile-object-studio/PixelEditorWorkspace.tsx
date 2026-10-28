"use client";

import type { usePixelArtEditorController } from "./usePixelArtEditorController";
import ReferenceToolRail from "./ReferenceToolRail";
import PixelEditorHeader from "./PixelEditorHeader";
import PixelEditorCanvasSurface from "./PixelEditorCanvasSurface";
import PixelEditorSidebar from "./PixelEditorSidebar";

type Props = { vm: ReturnType<typeof usePixelArtEditorController> };

export default function PixelEditorWorkspace({ vm }: Props) {
  const { s, panel } = vm;
  return <div className="flex min-h-0 flex-1">
    <ReferenceToolRail tool={s.tool} imageActive={panel === "image"} imageAvailable={!!vm.image.url} onSelect={vm.selectTool} onImageControls={() => vm.setPanel("image")}/>
    <section className="flex min-w-0 flex-1 flex-col bg-[#090e15]"><PixelEditorHeader vm={vm}/><PixelEditorCanvasSurface vm={vm}/>
      <footer className="flex shrink-0 items-center justify-between border-t border-slate-800 bg-[#111925] px-3 py-2 text-[10px] text-slate-500">
        <span>{s.part} · {s.side.toUpperCase()} ARTBOARD</span><span>Drag middle mouse to pan · Shift constrains shapes · Ctrl/Cmd+Z undo</span>
      </footer>
    </section>
    <PixelEditorSidebar vm={vm}/>
  </div>;
}



