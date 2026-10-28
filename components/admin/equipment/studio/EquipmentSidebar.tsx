"use client";

import type { usePixelArtEditorController } from "../../pixel-art/usePixelArtEditorController";
import FillBorderSwatches from "../../pixel-art/FillBorderSwatches";
import ColorPicker from "../../pixel-art/ColorPicker";
import PixelArtPalette from "../../pixel-art/PixelArtPalette";
import RecentColors from "../../pixel-art/RecentColors";
import ReferenceToolControls from "../../pixel-art/ReferenceToolControls";
import ReferenceImageControls from "../../pixel-art/ReferenceImageControls";
import ExportDesign from "../../pixel-art/ExportDesign";
import ExportPng from "../../pixel-art/ExportPng";
import RecolorSelectionButton from "../../pixel-art/RecolorSelectionButton";
import EquipmentSaveDesign from "./EquipmentSaveDesign";
import EquipmentLoadDesigns from "./EquipmentLoadDesigns";
import EquipmentPublishing from "./EquipmentPublishing";

type Props = { vm: ReturnType<typeof usePixelArtEditorController> };

export default function EquipmentSidebar({ vm }: Props) {
  const { s, panel, setPanel, image } = vm;
  return <aside className="flex w-[270px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-slate-700/80 bg-[#101722] p-3 max-lg:w-[245px] max-sm:w-[215px]">
    <div className="space-y-2"><h3 className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-300">Color System</h3>
      <FillBorderSwatches fill={s.shapeFillColor} border={s.borderColor} active={vm.activeColor} onFill={c => { s.setShapeFillColor(c); if (c) { s.setFillColor(c); s.setColor(c); } }} onBorder={c => { s.setBorderColor(c); s.setColor(c); }} onActive={vm.setActiveColor}/>
      <ColorPicker color={s.color} onChange={vm.chooseColor}/><PixelArtPalette colors={vm.colors} color={s.color} onChange={vm.chooseColor}/>
      <RecentColors colors={s.recent} selected={s.color} onSelect={vm.chooseColor}/>
      <RecolorSelectionButton count={s.selectedPixelCount} color={s.color} onRecolor={() => s.recolorSelection(s.color)}/>
    </div>
    <div className="h-px shrink-0 bg-slate-700"/>
    <section className="space-y-2"><h3 className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-300">Tool Controls · {s.tool}</h3>
      <ReferenceToolControls tool={s.tool} strokeWidth={s.strokeWidth} onStrokeWidthChange={s.setStrokeWidth} selection={s.selection} selectionKind={s.selectionKind}
        polygonCount={s.polygonPoints.length} textOrigin={s.textOrigin} activeText={s.activeText} shapeFilled={s.shapeFilled} shapeFillColor={s.shapeFillColor}
        onApplySelectionFill={s.applySelectionFill} onToggleFilled={() => s.setShapeFilled(v => !v)} onFinishPolygon={s.finishPolygon}
        onClearSelection={s.clearSelection} onDeleteSelection={s.deleteSelection} onSelectAll={s.selectAll} onInvertSelection={s.invertSelection}
        onCopySelection={() => s.copySelectionPixels()} onCutSelection={() => s.copySelectionPixels(true)} onPasteSelection={s.pasteSelectionPixels}
        onTransformSelection={s.transformSelectionPixels} onApplyText={s.applyText} onEditText={s.editSelectedText} onScaleText={s.scaleSelectedText}
        onApplyFilter={s.applyFilter} onApplyCrop={s.applyCrop} onApplyPerspective={s.applyPerspective}/>
    </section>
    {panel === "image" && <ReferenceImageControls name={image.name} url={image.url} visible={image.visible} opacity={image.opacity} scale={image.scale} x={image.x} y={image.y}
      onVisible={() => image.setVisible(v => !v)} onOpacity={image.setOpacity} onScale={image.setScale} onX={image.setX} onY={image.setY} onAdd={image.add}
      onRemove={() => { image.remove(); setPanel("tools"); }}/>}
    {panel === "save" && <EquipmentSaveDesign name={s.name} category={s.category} side={s.side} width={s.size} height={s.height} pixels={s.pixels}
      textLayers={s.textLayers} palette={vm.colors} designId={s.activeDesignId} onSaved={s.setActiveDesignId}/>}
    {panel === "load" && <EquipmentLoadDesigns onLoad={d => { s.loadDesign(d); setPanel("tools"); }}/>}
    {panel === "publish" && <EquipmentPublishing/>}
    {panel === "export" && <div className="space-y-2"><ExportDesign name={s.name} part={s.part} size={s.size} height={s.height} pixels={s.pixels} palette={vm.colors}/><ExportPng name={s.name} size={s.size} height={s.height} pixels={s.pixels} empty="#252b35"/></div>}
    {panel === "history" && <div className="rounded-lg border border-slate-700 bg-[#0c121b] p-3 text-xs text-slate-400">{s.history.length} undo steps · {s.future.length} redo steps</div>}
  </aside>;
}
