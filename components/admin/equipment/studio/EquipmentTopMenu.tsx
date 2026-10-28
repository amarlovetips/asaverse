"use client";

import { Download, FolderOpen, History, ImagePlus, Redo2, Save, ScanSearch, ShieldCheck, Trash2, Undo2 } from "lucide-react";

type Props = {
  onAddImage: (file?: File) => void;
  onExtract: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClear: () => void;
  onSave: () => void;
  onLoad: () => void;
  onPublish: () => void;
  onExport: () => void;
  onHistory: () => void;
  onPaste: () => void;
};

export default function EquipmentTopMenu(p: Props) {
  const button = "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-40";
  return <div className="flex h-11 shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-700/80 bg-[#151d29] px-3">
    <span className="mr-2 flex shrink-0 items-center gap-2 border-r border-slate-700 pr-3 text-[10px] font-bold tracking-[.16em] text-cyan-300"><span className="grid size-6 place-items-center rounded bg-cyan-400/10 text-cyan-200">E</span> EQUIPMENT STUDIO</span>
    <label className={button} title="Add reference image"><ImagePlus size={14}/>Add Image<input type="file" accept="image/*" className="hidden" onChange={e=>{p.onAddImage(e.currentTarget.files?.[0]);e.currentTarget.value="";}}/></label>
    <button type="button" className={button} onClick={p.onExtract} title="Convert reference image into pixels"><ScanSearch size={14}/>Extract</button>
    <span className="mx-1 h-5 w-px shrink-0 bg-slate-700"/>
    <button type="button" className={button} onClick={p.onUndo} disabled={!p.canUndo} title="Undo"><Undo2 size={14}/>Undo</button>
    <button type="button" className={button} onClick={p.onRedo} disabled={!p.canRedo} title="Redo"><Redo2 size={14}/>Redo</button>
    <button type="button" className={button} onClick={p.onClear} title="Clear artboard"><Trash2 size={14}/>Clear</button>
    <button type="button" className={button} onClick={p.onPaste} title="Paste copied selection (use the Selection tool for copy/cut)">Paste</button>
    <span className="mx-1 h-5 w-px shrink-0 bg-slate-700"/>
    <button type="button" className={button} onClick={p.onSave} title="Save equipment design"><Save size={14}/>Save</button>
    <button type="button" className={button} onClick={p.onLoad} title="Open equipment design"><FolderOpen size={14}/>Open</button>
    <button type="button" className={button} onClick={p.onPublish} title="Publish equipment design"><ShieldCheck size={14}/>Publish</button>
    <button type="button" className={button} onClick={p.onExport} title="Export image or JSON"><Download size={14}/>Export</button>
    <span className="mx-1 h-5 w-px shrink-0 bg-slate-700"/>
    <button type="button" className={button} onClick={p.onHistory} title="History"><History size={14}/>History</button>
  </div>;
}
