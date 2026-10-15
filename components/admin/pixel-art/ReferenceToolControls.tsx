"use client";

import { useState } from "react";
import type { SelectionBounds, SelectionKind } from "./usePixelEditorState";
import type { PixelTextLayer } from "../../../lib/character-design-json";

type Props = {
  tool: string;
  selection: SelectionBounds | null;
  selectionKind: SelectionKind;
  polygonCount: number;
  textOrigin: {x:number;y:number}|null;
  shapeFilled: boolean;
  shapeFillColor: string | null;
  onToggleFilled: () => void;
  onApplySelectionFill: (fill: string | null) => void;
  onFinishPolygon: () => void;
  onClearSelection: () => void;
  onDeleteSelection: () => void;
  activeText: PixelTextLayer | null;
  onApplyText: (text: string, scale: number) => void;
  onEditText: (text: string) => void;
  onScaleText: (scale: number) => void;
  onApplyFilter: (filter: string) => void;
  onApplyCrop: () => void;
  onApplyPerspective: (amount: number) => void;
};

export default function ReferenceToolControls(p: Props) {
  const [draftText, setDraftText] = useState("ASA");
  const [draftScale, setDraftScale] = useState(1);
  const text=p.activeText?.text??draftText,textScale=p.activeText?.scale??draftScale;
  const [perspective, setPerspective] = useState(8);
  const field = "w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400";
  if (p.tool === "line") return <ToolCard title="Line Tool"><p>Drag from the first point to the second. Every pixel between them is drawn automatically.</p></ToolCard>;
  if (p.tool === "rectangle") return <ToolCard title="Rectangle / Square"><p>Drag corner to corner. Hold Shift while drawing for a square. Shapes use the selected fill color; Fill: None draws an outline only.</p></ToolCard>;
  if (p.tool === "circle") return <ToolCard title="Circle / Ellipse"><p>Drag across the bounds to create a pixel ellipse. Hold Shift for a circle. Shapes use the selected fill color; Fill: None draws an outline only.</p></ToolCard>;
  if (p.tool === "polygon") return <div className="space-y-2 rounded-lg border border-slate-700 bg-[#0c121b] p-3 text-xs"><Title>Polygon Tool</Title><p className="text-slate-400">Click each corner, then finish the polygon to close it.</p><p className="text-slate-500">{p.polygonCount} points placed</p><FillToggle filled={p.shapeFilled} onToggle={p.onToggleFilled}/><button type="button" disabled={p.polygonCount < 3} onClick={p.onFinishPolygon} className="w-full rounded-md bg-cyan-500/15 px-3 py-2 font-semibold text-cyan-200 disabled:opacity-40">Finish Polygon</button></div>;
  if (p.tool === "select") return <div className="space-y-2 rounded-lg border border-slate-700 bg-[#0c121b] p-3 text-xs"><Title>Selection Tool</Title><p className="text-slate-400">Drag a region or click existing text to select and move it. Click a selected region again to deselect.</p>{p.activeText&&<TextEditor text={text} scale={textScale} field={field} setText={value=>{setDraftText(value);p.onEditText(value);}} setScale={value=>{setDraftScale(value);p.onScaleText(value);}}/>}{p.selection&&<><p className="font-mono text-slate-500">{p.selection.width} × {p.selection.height} px</p>{!p.activeText&&p.selectionKind!=="magic"&&<button type="button" onClick={()=>p.onApplySelectionFill(p.shapeFillColor)} className="w-full rounded-md border border-cyan-800/70 px-2 py-2 text-cyan-200 hover:bg-cyan-950/30">{p.shapeFillColor===null?"Remove Fill from Selection":"Apply Fill to Selection"}</button>}<div className="grid grid-cols-2 gap-2"><button type="button" onClick={p.onClearSelection} className="rounded-md border border-slate-700 px-2 py-2 text-slate-300 hover:bg-slate-800">Clear</button><button type="button" onClick={p.onDeleteSelection} className="rounded-md border border-rose-900/70 px-2 py-2 text-rose-300 hover:bg-rose-950/30">Delete</button></div></>}</div>;
  if (p.tool === "text") return <div className="space-y-2 rounded-lg border border-slate-700 bg-[#0c121b] p-3 text-xs"><Title>Pixel Text</Title><p className="text-slate-400">Click blank canvas to add text. Select existing text to edit or move it.</p><TextEditor text={text} scale={textScale} field={field} setText={value=>{setDraftText(value);if(p.activeText)p.onEditText(value);}} setScale={value=>{setDraftScale(value);if(p.activeText)p.onScaleText(value);}}/><p className="text-[10px] text-slate-500">5×7 pixel font · each font pixel scales from 1× to 4×</p><button type="button" disabled={!p.textOrigin||!text.trim()} onClick={()=>p.onApplyText(text,textScale)} className="w-full rounded-md bg-cyan-500/15 px-3 py-2 font-semibold text-cyan-200 disabled:opacity-40">Place Text</button></div>;
  if (p.tool === "filter") return null;
  if (p.tool === "gradient") return <ToolCard title="Gradient Tool"><p>Drag to blend the active Fill and Border colors along a line.</p></ToolCard>;
  if (p.tool === "crop") return <div className="space-y-2 rounded-lg border border-slate-700 bg-[#0c121b] p-3 text-xs"><Title>Crop Tool</Title><p className="text-slate-400">Drag to define a crop area. Pixels outside it are removed; the artboard dimensions stay the same.</p>{p.selection&&<><p className="font-mono text-slate-500">{p.selection.width} × {p.selection.height} px</p><button type="button" onClick={p.onApplyCrop} className="w-full rounded-md bg-cyan-500/15 px-3 py-2 font-semibold text-cyan-200">Crop Selection</button></>}</div>;
  if (p.tool === "perspective") return <div className="space-y-2 rounded-lg border border-slate-700 bg-[#0c121b] p-3 text-xs"><Title>Perspective Tool</Title><p className="text-slate-400">Skew rows progressively across the artboard.</p><label className="block text-slate-400">Horizontal skew: {perspective}px<input className="mt-2 w-full accent-cyan-400" type="range" min="-24" max="24" value={perspective} onChange={e=>setPerspective(Number(e.target.value))} aria-label="Perspective skew"/></label><button type="button" onClick={()=>p.onApplyPerspective(perspective)} className="w-full rounded-md bg-cyan-500/15 px-3 py-2 font-semibold text-cyan-200">Apply Perspective</button></div>;
  if (p.tool === "fill") return <ToolCard title="Fill Tool"><p>Click a region to fill its connected pixels with the active color.</p></ToolCard>;
  if (p.tool === "eraser") return <ToolCard title="Eraser"><p>Drag over pixels to remove them from the artboard.</p></ToolCard>;
  return <ToolCard title="Pencil"><p>Draw pixel by pixel with the active color.</p></ToolCard>;
}

function Title({children}:{children:React.ReactNode}){return <h3 className="font-semibold text-cyan-200">{children}</h3>;}
function TextEditor(p:{text:string;scale:number;field:string;setText:(value:string)=>void;setScale:(value:number)=>void}){return <div className="space-y-2"><input className={p.field} maxLength={10} value={p.text} onChange={e=>p.setText(e.target.value)} aria-label="Pixel text" placeholder="Text"/><label className="block text-[10px] text-slate-400">Pixel size <select className={`${p.field} mt-1`} value={p.scale} onChange={e=>p.setScale(Number(e.target.value))} aria-label="Text pixel size">{[1,2,3,4].map(scale=><option key={scale} value={scale}>{scale}×</option>)}</select></label></div>;}
function ToolCard({title,children}:{title:string;children:React.ReactNode}){return <div className="space-y-2 rounded-lg border border-slate-700 bg-[#0c121b] p-3 text-xs"><Title>{title}</Title><div className="text-slate-400">{children}</div></div>;}
function FillToggle({filled,onToggle}:{filled:boolean;onToggle:()=>void}){return <button type="button" aria-pressed={filled} onClick={onToggle} className="w-full rounded-md border border-slate-700 px-2 py-1.5 text-left text-slate-300">{filled?"● Filled shape":"○ Outline only"}</button>;}
