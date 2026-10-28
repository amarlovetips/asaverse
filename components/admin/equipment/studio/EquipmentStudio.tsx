"use client";

import { useEffect, useRef } from "react";
import ReferenceToolRail from "../../pixel-art/ReferenceToolRail";
import PixelEditorCanvasSurface from "../../pixel-art/PixelEditorCanvasSurface";
import ConfirmDialog from "../../pixel-art/ConfirmDialog";
import { usePixelArtEditorController } from "../../pixel-art/usePixelArtEditorController";
import { createClient } from "../../../../lib/supabase";
import { isEquipmentCategory } from "../types";
import EquipmentTopMenu from "./EquipmentTopMenu";
import EquipmentHeader from "./EquipmentHeader";
import EquipmentSidebar from "./EquipmentSidebar";

export default function EquipmentStudio({ routeRemainder = [] }: { routeRemainder?: string[] }) {
  const vm = usePixelArtEditorController({ categories: ["head", "clothing", "relic"] });
  const { s, panel, setPanel } = vm;
  const loadId = routeRemainder[0] && routeRemainder[0] !== "new" ? routeRemainder[0] : null;
  const loadedId = useRef<string | null>(null);

  useEffect(() => {
    if (!loadId || loadedId.current === loadId) return;
    let live = true;
    (async () => {
      try {
        const db = createClient();
        const { data, error } = await db.from("equipment_designs")
          .select("id,design_name,category,canvas_width,canvas_height,pixel_data")
          .eq("id", loadId).maybeSingle();
        if (!live || error || !data || !isEquipmentCategory(data.category)) return;
        loadedId.current = loadId;
        s.loadDesign({
          id: data.id, design_name: data.design_name, design_type: data.category,
          canvas_width: data.canvas_width, canvas_height: data.canvas_height, pixel_data: data.pixel_data,
        });
      } catch { /* panel shows errors on save; load failures simply keep the empty board */ }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadId]);

  return <>
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#0b1018] text-sm text-slate-200 shadow-2xl shadow-black/30">
      <EquipmentTopMenu onAddImage={vm.image.add} onExtract={vm.image.extract} onUndo={s.undo} onRedo={s.redo}
        canUndo={s.history.length > 0} canRedo={s.future.length > 0} onClear={() => vm.setConfirmClear(true)}
        onSave={() => setPanel("save")} onLoad={() => setPanel("load")} onPublish={() => setPanel("publish")}
        onExport={() => setPanel("export")} onHistory={() => setPanel("history")} onPaste={() => s.pasteSelectionPixels()}/>
      <div className="flex min-h-0 flex-1">
        <ReferenceToolRail tool={s.tool} imageActive={panel === "image"} imageAvailable={!!vm.image.url} onSelect={vm.selectTool} onImageControls={() => setPanel("image")}/>
        <section className="flex min-w-0 flex-1 flex-col bg-[#090e15]"><EquipmentHeader vm={vm}/><PixelEditorCanvasSurface vm={vm}/>
          <footer className="flex shrink-0 items-center justify-between border-t border-slate-800 bg-[#111925] px-3 py-2 text-[10px] text-slate-500">
            <span>EQUIPMENT · {s.category.toUpperCase()} · {s.side.toUpperCase()} ARTBOARD</span><span>Drag middle mouse to pan · Shift constrains shapes · Ctrl/Cmd+Z undo</span>
          </footer>
        </section>
        <EquipmentSidebar vm={vm}/>
      </div>
    </div>
    <ConfirmDialog open={vm.confirmClear} title="Clear All Drawing Pixels?" message="This will remove all drawing pixels. This action can be undone."
      onCancel={() => vm.setConfirmClear(false)} onConfirm={() => { s.remember(); s.setPixels({}); s.clearSelection(); vm.setConfirmClear(false); }}/>
  </>;
}
