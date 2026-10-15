"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Eye, Grid2X2, Minus, Plus, RotateCcw } from "lucide-react";
import PixelArtCanvas from "./PixelArtCanvas";
import ConfirmDialog from "./ConfirmDialog";
import PixelArtPalette from "./PixelArtPalette";
import ColorPicker from "./ColorPicker";
import RecentColors from "./RecentColors";
import SaveDesign from "./SaveDesign";
import DesignPublishing from "./DesignPublishing";
import BaseBodyControls from "./BaseBodyControls";
import LoadDesigns from "./LoadDesigns";
import ExportDesign from "./ExportDesign";
import ExportPng from "./ExportPng";
import CoordinateRuler from "./CoordinateRuler";
import { useCanvasPan } from "./CanvasPan";
import { usePixelEditorState } from "./usePixelEditorState";
import ReferenceToolRail, { type ReferenceTool } from "./ReferenceToolRail";
import EditorTopMenu from "./EditorTopMenu";
import FillBorderSwatches from "./FillBorderSwatches";
import ReferenceToolControls from "./ReferenceToolControls";
import DesignContextPanel from "./DesignContextPanel";
import FilterToolbarControls from "./FilterToolbarControls";

const colors=["#171923","#ffffff","#f2c49b","#754631","#392447","#d65b82","#19b9ad","#4168d9","#b8476a","#d69a38","#794bd0","#e6e6ee","#38d9ee","#4ae08e","#000000","#888888"];
const empty="#252b35";
type Panel = "tools"|"image"|"save"|"load"|"publish"|"export"|"base"|"history";

export default function PixelArtEditor() {
 const s=usePixelEditorState(),pan=useCanvasPan();
 const [confirmClear,setConfirmClear]=useState(false);
 const [imageUrl,setImageUrl]=useState<string|null>(null),[imageName,setImageName]=useState("");
 const [imageOpacity,setImageOpacity]=useState(0.45),[imageVisible,setImageVisible]=useState(true),[imageScale,setImageScale]=useState(1),[imageX,setImageX]=useState(0),[imageY,setImageY]=useState(0);
 const [panel,setPanel]=useState<Panel>("tools"),[activeColor,setActiveColor]=useState<"fill"|"border">("fill");
 const [frontOpacity,setFrontOpacity]=useState(0.28),[filter,setFilter]=useState("grayscale");
 const zoom=s.zoom,setZoom=s.setZoom;
 const imageDrag=useRef<{x:number;y:number}|null>(null);
 const viewport=useRef<HTMLDivElement>(null);
 const zoomAnchor=useRef<{clientX:number;clientY:number;canvasX:number;canvasY:number}|null>(null);

 useLayoutEffect(()=>{
  const anchor=zoomAnchor.current,scrollport=viewport.current;
  if(!anchor||!scrollport)return;
  const artboard=scrollport.querySelector<HTMLElement>("[data-artboard]");
  if(!artboard)return;
  const rect=artboard.getBoundingClientRect();
  scrollport.scrollLeft+=rect.left+anchor.canvasX*s.zoom-anchor.clientX;
  scrollport.scrollTop+=rect.top+anchor.canvasY*s.zoom-anchor.clientY;
  zoomAnchor.current=null;
 },[s.zoom]);

 useEffect(()=>{
  const scrollport=viewport.current;
  if(!scrollport)return;
  function handleWheel(e:WheelEvent){
   e.preventDefault();
   e.stopPropagation();
   if(e.deltaY===0)return;
   const nextZoom=Math.max(4,Math.min(32,zoom+(e.deltaY<0?2:-2)));
   if(nextZoom===zoom)return;
   const artboard=viewport.current?.querySelector<HTMLElement>("[data-artboard]");
   if(artboard){
    const rect=artboard.getBoundingClientRect();
    zoomAnchor.current={clientX:e.clientX,clientY:e.clientY,canvasX:(e.clientX-rect.left)/zoom,canvasY:(e.clientY-rect.top)/zoom};
   }
   setZoom(nextZoom);
  }
  scrollport.addEventListener("wheel",handleWheel,{passive:false});
  return ()=>scrollport.removeEventListener("wheel",handleWheel);
 },[zoom,setZoom]);

 function chooseColor(c:string){s.setColor(c);if(activeColor==="fill"){s.setFillColor(c);s.setShapeFillColor(c);}else s.setBorderColor(c);s.setRecent((old:string[])=>[c,...old.filter(v=>v!==c)].slice(0,10));}
 function addImage(file?:File){
  if(!file||!file.type.startsWith("image/"))return;
  if(file.size>10*1024*1024){alert("Image must be 10 MB or smaller.");return;}
  const reader=new FileReader();reader.onload=()=>{if(typeof reader.result==="string"){setImageUrl(reader.result);setImageName(file.name);setImageVisible(true);setImageScale(1);setImageX(0);setImageY(0);setPanel("image");}};reader.readAsDataURL(file);
 }
 function extractImage(){
  if(!imageUrl){setPanel("image");return;}
  const image=new window.Image();
  image.onload=()=>{
   const canvas=document.createElement("canvas");canvas.width=s.size;canvas.height=s.size;
   const ctx=canvas.getContext("2d");if(!ctx)return;
   ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,s.size,s.size);
   const data=ctx.getImageData(0,0,s.size,s.size).data,next:Record<string,string>={};
   for(let y=0;y<s.size;y++)for(let x=0;x<s.size;x++){
    const i=(y*s.size+x)*4;if(data[i+3]<36)continue;
    const rgb=`#${[data[i],data[i+1],data[i+2]].map(v=>v.toString(16).padStart(2,"0")).join("")}`;next[`${x},${y}`]=rgb;
   }
   s.remember();s.setPixels(next);s.clearSelection();s.setTool("pencil");setPanel("tools");
  };
  image.onerror=()=>alert("Could not read the reference image.");image.src=imageUrl;
 }
 function imagePointerDown(e:React.PointerEvent<HTMLImageElement>){if(panel!=="image")return;e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);imageDrag.current={x:e.clientX,y:e.clientY};}
 function imagePointerMove(e:React.PointerEvent<HTMLImageElement>){if(!imageDrag.current||panel!=="image")return;e.preventDefault();e.stopPropagation();const dx=e.clientX-imageDrag.current.x,dy=e.clientY-imageDrag.current.y;imageDrag.current={x:e.clientX,y:e.clientY};setImageX(v=>v+dx/s.zoom);setImageY(v=>v+dy/s.zoom);}
 function imagePointerUp(e:React.PointerEvent<HTMLImageElement>){e.stopPropagation();imageDrag.current=null;}

 useEffect(()=>{
  function keys(e:KeyboardEvent){
   const target=e.target as HTMLElement|null;if(target&&["INPUT","TEXTAREA","SELECT"].includes(target.tagName))return;
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();if(e.shiftKey)s.redo();else s.undo();return;}
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();s.redo();return;}
   if(s.selection&&["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)){e.preventDefault();const amount=e.shiftKey?10:1;s.moveSelectionBy(e.key==="ArrowLeft"?-amount:e.key==="ArrowRight"?amount:0,e.key==="ArrowUp"?-amount:e.key==="ArrowDown"?amount:0);return;}
   if(e.key==="Delete"&&s.selection){e.preventDefault();s.deleteSelection();return;}
   const shortcuts:Record<string,ReferenceTool>={v:"select",b:"pencil",e:"eraser",g:"fill",l:"line",u:"rectangle",o:"circle",p:"polygon",t:"text",f:"filter",d:"gradient",c:"crop",k:"perspective"};
   const tool=shortcuts[e.key.toLowerCase()];if(tool){s.setTool(tool);setPanel("tools");}
  }
  window.addEventListener("keydown",keys);return()=>window.removeEventListener("keydown",keys);
 },[s]);

 const toolSelect=(tool:ReferenceTool)=>{s.setTool(tool);setPanel("tools");};
 return <>
  <div className="flex h-[calc(100dvh-66px)] min-h-[520px] flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#0b1018] text-sm text-slate-200 shadow-2xl shadow-black/30">
   <EditorTopMenu onAddImage={addImage} onExtract={extractImage} onUndo={s.undo} onRedo={s.redo} canUndo={s.history.length>0} canRedo={s.future.length>0} onClear={()=>setConfirmClear(true)} onSave={()=>setPanel("save")} onLoad={()=>setPanel("load")} onPublish={()=>setPanel("publish")} onExport={()=>setPanel("export")} onHistory={()=>setPanel("history")} onBase={()=>setPanel("base")}/>
   <div className="flex min-h-0 flex-1">
    <ReferenceToolRail tool={s.tool} onSelect={toolSelect}/>
    <section className="flex min-w-0 flex-1 flex-col bg-[#090e15]">
     <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-800/80 bg-[#0d141e] px-3 py-2">
      <div className="flex rounded-md border border-slate-700 bg-slate-950 p-0.5"><button type="button" onClick={()=>s.setSide("front")} className={`rounded px-2 py-1 text-[10px] ${s.side==="front"?"bg-cyan-500/20 text-cyan-200":"text-slate-500"}`}>Front</button><button type="button" onClick={()=>s.setSide("back")} className={`rounded px-2 py-1 text-[10px] ${s.side==="back"?"bg-cyan-500/20 text-cyan-200":"text-slate-500"}`}>Back</button></div>
      <DesignContextPanel name={s.name} setName={s.setName} category={s.category} setCategory={s.setPart} side={s.side} selectedId={s.activeDesignId} onSelectBackDesign={d=>s.loadDesign(d,"back")}/>
      {s.side==="back"&&<label title="Front reference opacity" className="flex items-center gap-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-[10px] text-slate-400"><Eye size={13}/><input type="range" min="0.05" max="0.8" step="0.01" value={frontOpacity} onChange={e=>setFrontOpacity(Number(e.target.value))} className="w-16 accent-cyan-400" aria-label="Front reference opacity"/><span className="w-7 text-right">{Math.round(frontOpacity*100)}%</span></label>}
      <select aria-label="Artboard size" value={s.size} onChange={e=>s.setSize(+e.target.value)} className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs">{[16,32,64].map(v=><option key={v} value={v}>{v} × {v}</option>)}</select>
      <span className="hidden h-5 w-px bg-slate-700 lg:block"/>
      <button type="button" title="Zoom out" aria-label="Zoom out" onClick={()=>s.setZoom(Math.max(4,s.zoom-2))} className="grid size-7 place-items-center rounded border border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500"><Minus size={13}/></button>
      <span className="w-10 text-center font-mono text-[10px] text-slate-400">{Math.round(s.zoom/12*100)}%</span>
      <button type="button" title="Zoom in" aria-label="Zoom in" onClick={()=>s.setZoom(Math.min(32,s.zoom+2))} className="grid size-7 place-items-center rounded border border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500"><Plus size={13}/></button>
      <button type="button" title="Reset zoom" aria-label="Reset zoom" onClick={()=>s.setZoom(12)} className="grid size-7 place-items-center rounded border border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500"><RotateCcw size={12}/></button>
      <button type="button" title="Toggle guides" aria-label="Toggle guides" aria-pressed={s.guide} onClick={()=>s.setGuide(v=>!v)} className={`grid size-7 place-items-center rounded border ${s.guide?"border-cyan-500/50 bg-cyan-500/10 text-cyan-200":"border-slate-700 bg-slate-900 text-slate-400"}`}><Grid2X2 size={13}/></button>
      {s.tool==="filter"&&<FilterToolbarControls value={filter} onChange={setFilter} onApply={()=>s.applyFilter(filter)}/>}
      <span className="ml-auto font-mono text-[10px] text-slate-500">X {s.xy.split(", ")[0]} · Y {s.xy.split(", ")[1]}</span>
     </div>
     <div ref={viewport} onPointerDown={pan.start} onPointerMove={pan.move} onPointerUp={pan.stop} onPointerCancel={pan.stop} onLostPointerCapture={pan.stop} className="min-h-0 min-w-0 flex-1 overflow-auto bg-[radial-gradient(ellipse_at_center,#182331_0%,#090e15_70%)]">
      <div className="grid place-items-center" style={{width:s.size*s.zoom+72,height:s.size*s.zoom+68,minWidth:"100%",minHeight:"100%"}}>
       <div className="relative shrink-0 pl-8 pt-7"><CoordinateRuler size={s.size} zoom={s.zoom}/><PixelArtCanvas size={s.size} zoom={s.zoom} pixels={s.pixels} empty={empty} part={s.part} guide={s.guide} selection={s.selection} referencePixels={s.side==="back"?s.referencePixels:{}} referenceOpacity={frontOpacity} imageUrl={imageUrl} imageOpacity={imageOpacity} imageVisible={imageVisible} imageScale={imageScale} imageX={imageX} imageY={imageY} imageToolActive={panel==="image"} onImagePointerDown={imagePointerDown} onImagePointerMove={imagePointerMove} onImagePointerUp={imagePointerUp} onPointerDown={s.start} onPointerMove={s.move} onPointerUp={s.stop}/></div>
      </div>
     </div>
     <footer className="flex shrink-0 items-center justify-between border-t border-slate-800 bg-[#111925] px-3 py-2 text-[10px] text-slate-500"><span>{s.part} · {s.side.toUpperCase()} ARTBOARD</span><span>Drag middle mouse to pan · Shift constrains shapes · Ctrl/Cmd+Z undo</span></footer>
    </section>
    <aside className="flex w-[270px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-slate-700/80 bg-[#101722] p-3 max-lg:w-[245px] max-sm:w-[215px]">
     <div className="space-y-2"><h3 className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-300">Color System</h3><FillBorderSwatches fill={s.shapeFillColor} border={s.borderColor} active={activeColor} onFill={c=>{s.setShapeFillColor(c);if(c){s.setFillColor(c);s.setColor(c);}}} onBorder={c=>{s.setBorderColor(c);s.setColor(c);}} onActive={setActiveColor}/><ColorPicker color={s.color} onChange={chooseColor}/><PixelArtPalette colors={colors} color={s.color} onChange={chooseColor}/><RecentColors colors={s.recent} selected={s.color} onSelect={chooseColor}/></div>
     <div className="h-px shrink-0 bg-slate-700"/>
     <div className="space-y-2"><div className="flex items-center justify-between"><h3 className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-300">Tool Controls</h3><span className="rounded bg-slate-800 px-2 py-1 text-[9px] capitalize text-slate-400">{s.tool}</span></div><ReferenceToolControls tool={s.tool} selection={s.selection} selectionKind={s.selectionKind} polygonCount={s.polygonPoints.length} textOrigin={s.textOrigin} activeText={s.activeText} shapeFilled={s.shapeFilled} shapeFillColor={s.shapeFillColor} onApplySelectionFill={s.applySelectionFill} onToggleFilled={()=>s.setShapeFilled(v=>!v)} onFinishPolygon={s.finishPolygon} onClearSelection={s.clearSelection} onDeleteSelection={s.deleteSelection} onApplyText={s.applyText} onEditText={s.editSelectedText} onScaleText={s.scaleSelectedText} onApplyFilter={s.applyFilter} onApplyCrop={s.applyCrop} onApplyPerspective={s.applyPerspective}/></div>
     {panel==="image"&&<ImageControls imageName={imageName} imageUrl={imageUrl} imageVisible={imageVisible} imageOpacity={imageOpacity} imageScale={imageScale} imageX={imageX} imageY={imageY} setImageVisible={setImageVisible} setImageOpacity={setImageOpacity} setImageScale={setImageScale} setImageX={setImageX} setImageY={setImageY} onRemove={()=>{setImageUrl(null);setImageName("");}}/>}
     {panel==="save"&&<SaveDesign name={s.name} part={s.category} side={s.side} size={s.size} pixels={s.pixels} basePixels={s.basePixels} textLayers={s.textLayers} palette={colors} designId={s.activeDesignId} onSaved={s.setActiveDesignId}/>}
     {panel==="load"&&<LoadDesigns onLoad={d=>{s.loadDesign(d);setPanel("tools");}}/>}
     {panel==="publish"&&<DesignPublishing/>}
     {panel==="export"&&<div className="space-y-2"><ExportDesign name={s.name} part={s.part} size={s.size} pixels={s.pixels} palette={colors}/><ExportPng name={s.name} size={s.size} pixels={s.pixels} empty={empty}/></div>}
     {panel==="base"&&<BaseBodyControls name={s.name} size={s.size} pixels={s.pixels} palette={colors}/>}
     {panel==="history"&&<div className="rounded-lg border border-slate-700 bg-[#0c121b] p-3 text-xs text-slate-400">{s.history.length} undo steps · {s.future.length} redo steps</div>}
    </aside>
   </div>
  </div>
  <ConfirmDialog open={confirmClear} title="Clear All Drawing Pixels?" message="This will remove all drawing pixels. This action can be undone." onCancel={()=>setConfirmClear(false)} onConfirm={()=>{s.remember();s.setPixels({});s.clearSelection();setConfirmClear(false);}}/>
 </>;
}

function ImageControls(p:{imageName:string;imageUrl:string|null;imageVisible:boolean;imageOpacity:number;imageScale:number;imageX:number;imageY:number;setImageVisible:(v:(n:boolean)=>boolean)=>void;setImageOpacity:(v:number)=>void;setImageScale:(v:number)=>void;setImageX:(v:(n:number)=>number)=>void;setImageY:(v:(n:number)=>number)=>void;onRemove:()=>void}){
 return <section className="space-y-3 rounded-lg border border-slate-700 bg-[#0c121b] p-3"><h3 className="text-xs font-semibold text-cyan-200">Reference Image</h3><p className="break-all text-[10px] text-slate-400">{p.imageName||"No image loaded"}</p>{p.imageUrl&&<><button type="button" onClick={()=>p.setImageVisible(v=>!v)} className="w-full rounded border border-slate-700 p-2 text-xs">{p.imageVisible?"Hide Image":"Show Image"}</button><Range label="Opacity" value={p.imageOpacity} min={0} max={1} step={0.01} onChange={p.setImageOpacity}/><Range label="Scale" value={p.imageScale} min={0.2} max={10} step={0.05} onChange={p.setImageScale}/><div className="grid grid-cols-3 gap-1 justify-items-center"><span/><ArrowButton label="Move image up" icon={<ArrowUp size={14}/>} onClick={()=>p.setImageY(v=>v-2)}/><span/><ArrowButton label="Move image left" icon={<ArrowLeft size={14}/>} onClick={()=>p.setImageX(v=>v-2)}/><button type="button" title="Center image" onClick={()=>{p.setImageX(()=>0);p.setImageY(()=>0);p.setImageScale(1);}} className="grid size-8 place-items-center rounded border border-slate-700 text-slate-300 hover:border-cyan-500"><RotateCcw size={13}/></button><ArrowButton label="Move image right" icon={<ArrowRight size={14}/>} onClick={()=>p.setImageX(v=>v+2)}/><span/><ArrowButton label="Move image down" icon={<ArrowDown size={14}/>} onClick={()=>p.setImageY(v=>v+2)}/><span/></div><p className="font-mono text-[10px] text-slate-500">X {p.imageX.toFixed(0)} · Y {p.imageY.toFixed(0)}</p><button type="button" onClick={p.onRemove} className="w-full rounded border border-rose-900/70 p-2 text-xs text-rose-300">Remove Image</button></>}</section>;
}
function Range(p:{label:string;value:number;min:number;max:number;step:number;onChange:(v:number)=>void}){return <label className="block text-[10px] text-slate-400">{p.label}<span className="float-right font-mono">{Math.round(p.value*100)}%</span><input type="range" min={p.min} max={p.max} step={p.step} value={p.value} onChange={e=>p.onChange(Number(e.target.value))} className="mt-1 w-full accent-cyan-400"/></label>;}
function ArrowButton(p:{label:string;icon:React.ReactNode;onClick:()=>void}){return <button type="button" title={p.label} aria-label={p.label} onClick={p.onClick} className="grid size-8 place-items-center rounded border border-slate-700 text-slate-300 hover:border-cyan-500">{p.icon}</button>;}
