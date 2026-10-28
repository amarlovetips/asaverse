"use client";

import type { usePixelArtEditorController } from "./usePixelArtEditorController";
import ConfirmDialog from "./ConfirmDialog";
import EditorTopMenu from "./EditorTopMenu";
import PixelEditorWorkspace from "./PixelEditorWorkspace";

type Props = { vm: ReturnType<typeof usePixelArtEditorController> };

export default function PixelArtEditorView({ vm }: Props) {
  const { s } = vm;
  return <>
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#0b1018] text-sm text-slate-200 shadow-2xl shadow-black/30">
      <EditorTopMenu onAddImage={vm.image.add} onExtract={vm.image.extract} onUndo={s.undo} onRedo={s.redo}
        canUndo={s.history.length > 0} canRedo={s.future.length > 0} onClear={() => vm.setConfirmClear(true)}
        onSave={() => vm.setPanel("save")} onLoad={() => vm.setPanel("load")} onPublish={() => vm.setPanel("publish")}
        onExport={() => vm.setPanel("export")} onHistory={() => vm.setPanel("history")} onBase={() => vm.setPanel("base")}/>
      <PixelEditorWorkspace vm={vm}/>
    </div>
    <ConfirmDialog open={vm.confirmClear} title="Clear All Drawing Pixels?" message="This will remove all drawing pixels. This action can be undone."
      onCancel={() => vm.setConfirmClear(false)} onConfirm={() => { s.remember(); s.setPixels({}); s.clearSelection(); vm.setConfirmClear(false); }}/>
  </>;
}



