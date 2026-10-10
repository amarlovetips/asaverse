"use client";
import { useRef, useState } from "react";
import CharacterComposer from "./composer/CharacterComposer";
import PixelArtCanvas from "./PixelArtCanvas";
import PixelArtPalette from "./PixelArtPalette";
import ColorPicker from "./ColorPicker";
import RecentColors from "./RecentColors";
import ZoomControls from "./ZoomControls";
import HistoryPanel from "./HistoryPanel";
import SaveDesign from "./SaveDesign";
import BaseBodyControls from "./BaseBodyControls";
import LoadDesigns from "./LoadDesigns";
import ExportDesign from "./ExportDesign";
import ExportPng from "./ExportPng";
import CoordinateRuler from "./CoordinateRuler";
import { useCanvasPan } from "./CanvasPan";
import { usePixelEditorState } from "./usePixelEditorState";

const colors=["#171923","#ffffff","#f2c49b","#754631","#392447","#d65b82","#19b9ad","#4168d9","#b8476a","#d69a38","#794bd0","#e6e6ee","#38d9ee","#4ae08e","#000000","#888888"];
const empty="#252b35";

function IconButton({icon,label,onClick,active=false}:{icon:string;label:string;onClick:()=>void;active?:boolean}) {
 return <button type="button" title={label} aria-label={label} onClick={onClick}
  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg ${active?"border-cyan-400 bg-cyan-900/60 text-cyan-200":"border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500 hover:bg-slate-800"}`}>
  {icon}
 </button>;
}

export default function PixelArtEditor() {
 const s=usePixelEditorState(),pan=useCanvasPan();
 const [imageUrl,setImageUrl]=useState<string|null>(null);
 const [imageName,setImageName]=useState("");
 const [imageOpacity,setImageOpacity]=useState(0.45);
 const [imageVisible,setImageVisible]=useState(true);
 const [imageScale,setImageScale]=useState(1);
 const [imageX,setImageX]=useState(0);
 const [imageY,setImageY]=useState(0);
 const [panel,setPanel]=useState("pencil");
 const imageDrag=useRef<{x:number;y:number}|null>(null);

 function imagePointerDown(e:React.PointerEvent<HTMLImageElement>) {
  if(panel!=="image")return;
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.setPointerCapture(e.pointerId);
  imageDrag.current={x:e.clientX,y:e.clientY};
 }

 function imagePointerMove(e:React.PointerEvent<HTMLImageElement>) {
  if(!imageDrag.current||panel!=="image")return;
  e.preventDefault();
  e.stopPropagation();
  const dx=e.clientX-imageDrag.current.x;
  const dy=e.clientY-imageDrag.current.y;
  imageDrag.current={x:e.clientX,y:e.clientY};
  setImageX(v=>v+dx/s.zoom);
  setImageY(v=>v+dy/s.zoom);
 }

 function imagePointerUp(e:React.PointerEvent<HTMLImageElement>) {
  e.stopPropagation();
  imageDrag.current=null;
 }

 const chooseColor=(c:string)=>{
  s.setColor(c);
  s.setRecent((old:string[])=>[c,...old.filter(v=>v!==c)].slice(0,10));
 };

 function addImage(file?:File) {
  if(!file||!file.type.startsWith("image/"))return;
  if(file.size>10*1024*1024){alert("Image must be 10 MB or smaller.");return;}
  const reader=new FileReader();
  reader.onload=()=>{
   if(typeof reader.result==="string"){
    setImageUrl(reader.result);setImageName(file.name);
    setImageVisible(true);setImageScale(1);setImageX(0);setImageY(0);
    setPanel("image");
   }
  };
  reader.readAsDataURL(file);
 }

 return <div className="flex h-[calc(100dvh-66px)] min-h-[500px] overflow-hidden rounded-lg border border-slate-700 bg-[#0b1018] text-sm text-slate-200">
  <aside className="flex w-[104px] shrink-0 flex-col items-center gap-2 overflow-y-auto border-r border-slate-800 bg-[#111925] p-2">
   <div className="text-[10px] font-bold tracking-wider text-cyan-300" title="AsaVerse Pixel Lab">A4</div>
   <input value={s.name} onChange={e=>s.setName(e.target.value)} title="Design name" aria-label="Design name" placeholder="Design name" className="w-full min-w-0 rounded bg-slate-900 px-2 py-2 text-center text-xs outline-none focus:ring-1 focus:ring-cyan-500"/>
   <select title="Design category" aria-label="Design category" value={s.part} onChange={e=>s.setPart(e.target.value)} className="w-full min-w-0 rounded bg-slate-900 px-1 py-2 text-center text-[10px]">
    <option value="body">Body</option>
    <option value="face">Face</option>
    <option value="hair">Hair</option>
    <option value="facial-hair">Facial Hair</option>
   </select>
   <select title="Artboard size" aria-label="Artboard size" value={s.size} onChange={e=>s.setSize(+e.target.value)} className="w-full rounded bg-slate-900 px-1 py-2 text-center text-xs">
    {[16,32,64].map(v=><option key={v} value={v}>{v} × {v}</option>)}
   </select>

   <div className="grid w-full grid-cols-2 justify-items-center gap-2">
    <IconButton icon="✎" label="Pencil" active={s.tool==="pencil"&&panel==="pencil"} onClick={()=>{s.setTool("pencil");setPanel("pencil");}}/>
    <IconButton icon="▱" label="Eraser" active={s.tool==="eraser"&&panel==="eraser"} onClick={()=>{s.setTool("eraser");setPanel("eraser");}}/>
    <IconButton icon="▧" label="Fill" active={s.tool==="fill"&&panel==="fill"} onClick={()=>{s.setTool("fill");setPanel("fill");}}/>
    <IconButton icon="↶" label="Undo" onClick={()=>{s.undo();setPanel("history");}}/>
    <IconButton icon="⌫" label="Clear artboard" onClick={()=>{setPanel("history");if(confirm("Clear all drawing pixels?")){s.remember();s.setPixels({});}}}/>
    <IconButton icon="＋" label="Canvas zoom in" onClick={()=>s.setZoom(z=>Math.min(32,z+2))}/>
    <IconButton icon="−" label="Canvas zoom out" onClick={()=>s.setZoom(z=>Math.max(4,z-2))}/>
    <IconButton icon="⌖" label="Guides" active={s.guide} onClick={()=>{s.setGuide(v=>!v);setPanel("guides");}}/>
    <label title="Add image layer" aria-label="Add image layer" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-lg hover:border-cyan-500">
     ▧<input type="file" accept="image/*" className="hidden" onChange={e=>{addImage(e.currentTarget.files?.[0]);e.currentTarget.value="";}}/>
    </label>
    <IconButton icon="▣" label="Image layer controls" active={panel==="image"} onClick={()=>setPanel("image")}/>
    <IconButton icon="♙" label="Character composer" active={panel==="composer"} onClick={()=>setPanel("composer")}/>
    <IconButton icon="▣" label="Save design" active={panel==="save"} onClick={()=>setPanel("save")}/>
    <IconButton icon="▤" label="Load designs" active={panel==="load"} onClick={()=>setPanel("load")}/>
    <IconButton icon="⇩" label="Export design" active={panel==="export"} onClick={()=>setPanel("export")}/>
    <IconButton icon="♟" label="Base body controls" active={panel==="base"} onClick={()=>setPanel("base")}/>
    <IconButton icon="◷" label="History" active={panel==="history"} onClick={()=>setPanel("history")}/>
   </div>
  </aside>

  <section className="flex min-w-0 flex-1 flex-col bg-[#090e15]">
   <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800 px-3 py-2 text-xs text-slate-400">
    <span>{s.size} × {s.size} · X:{s.xy.split(", ")[0]} Y:{s.xy.split(", ")[1]}</span>
    <span>{s.part} · Single Artboard · {Object.keys(s.pixels).length} px</span>
   </div>
   <div onMouseDown={pan.start} onMouseMove={pan.move} onMouseUp={pan.stop} onMouseLeave={pan.stop}
    onWheel={e=>{e.preventDefault();s.setZoom(z=>Math.max(4,Math.min(32,z+(e.deltaY<0?2:-2))));}}
    className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto p-4">
    <div className="relative shrink-0">
     <CoordinateRuler size={s.size} zoom={s.zoom}/>
     <PixelArtCanvas size={s.size} zoom={s.zoom} pixels={s.pixels} empty={empty} part={s.part} guide={s.guide}
      imageUrl={imageUrl} imageOpacity={imageOpacity} imageVisible={imageVisible}
      imageScale={imageScale} imageX={imageX} imageY={imageY} imageToolActive={panel==="image"} onImagePointerDown={imagePointerDown} onImagePointerMove={imagePointerMove} onImagePointerUp={imagePointerUp}
      onPointerDown={s.start} onPointerMove={s.move} onPointerUp={s.stop}/>
    </div>
   </div>
   <footer className="flex shrink-0 justify-between border-t border-slate-800 bg-[#151c27] px-3 py-2 text-xs text-slate-400">
    <span>{s.name||"Untitled"} / Single Artboard</span><span>{Object.keys(s.pixels).length} pixels</span>
   </footer>
  </section>

  <aside className="flex w-[230px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-slate-800 bg-[#111925] p-3 max-sm:w-[185px]">
   <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Color System</h3>
   <ColorPicker color={s.color} onChange={chooseColor}/>
   <PixelArtPalette colors={colors} color={s.color} onChange={chooseColor}/>
   <RecentColors colors={s.recent} selected={s.color} onSelect={chooseColor}/>

   <div className="my-1 h-px bg-slate-700"/>
   <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Tool Controls</h3>

   {panel==="pencil"&&<div className="rounded border border-slate-700 p-3 text-xs text-slate-300">Pencil selected. Draw on the artboard using the chosen color.</div>}
   {panel==="eraser"&&<div className="rounded border border-slate-700 p-3 text-xs text-slate-300">Eraser selected. Draw over pixels to erase them.</div>}
   {panel==="fill"&&<div className="rounded border border-slate-700 p-3 text-xs text-slate-300">Fill selected. Click the artboard to use the fill tool.</div>}
   {panel==="guides"&&<button onClick={()=>s.setGuide(v=>!v)} className="rounded border border-slate-700 p-2 text-xs">{s.guide?"Hide guides":"Show guides"}</button>}
   {panel==="history"&&<HistoryPanel count={s.history.length} onUndo={s.undo} onClear={()=>{s.remember();s.setPixels({});}}/>}
   {panel==="image"&&<div className="space-y-3 rounded border border-slate-700 p-3">
    <div className="break-all text-xs text-slate-300">{imageName||"No image loaded"}</div>
    {imageUrl?<>
     <button onClick={()=>setImageVisible(v=>!v)} className="w-full rounded border border-slate-700 p-2 text-xs">{imageVisible?"Hide image":"Show image"}</button>
     <label className="block text-xs text-slate-400">Opacity {Math.round(imageOpacity*100)}%
      <input aria-label="Image opacity" type="range" min="0" max="100" value={Math.round(imageOpacity*100)} onChange={e=>setImageOpacity(Number(e.target.value)/100)} className="mt-2 w-full"/>
     </label>
     <div className="space-y-2">
 <label htmlFor="custom-image-zoom" className="flex items-center justify-between text-xs text-slate-400">
  <span>Image zoom</span>
  <span className="flex items-center gap-1">
   <input id="custom-image-zoom" aria-label="Custom image zoom" type="number" min="20" max="1000" step="0.5"
    value={Number((imageScale*100).toFixed(1))}
    onChange={e=>{const v=e.target.value;if(v===""){setImageScale(0.2);return;}const n=Number(v);if(Number.isFinite(n))setImageScale(Math.max(0.2,Math.min(10,n/100)));}}
    className="w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-slate-100"/>
   <span>%</span>
  </span>
 </label>
 <input aria-label="Image zoom slider" type="range" min="20" max="1000" step="0.5"
  value={Number((imageScale*100).toFixed(1))}
  onChange={e=>setImageScale(Number(e.target.value)/100)}
  className="w-full"/>
</div>
     <div className="grid grid-cols-3 gap-2">
      <span/>
      <IconButton icon="↑" label="Move image up" onClick={()=>setImageY(v=>v-2)}/>
      <span/>
      <IconButton icon="←" label="Move image left" onClick={()=>setImageX(v=>v-2)}/>
      <IconButton icon="•" label="Center image" onClick={()=>{setImageX(0);setImageY(0);setImageScale(1);}}/>
      <IconButton icon="→" label="Move image right" onClick={()=>setImageX(v=>v+2)}/>
      <span/>
      <IconButton icon="↓" label="Move image down" onClick={()=>setImageY(v=>v+2)}/>
      <span/>
     </div>
     <div className="text-xs text-slate-500">X: {imageX} · Y: {imageY}</div>
     <button onClick={()=>{setImageUrl(null);setImageName("");}} className="w-full rounded border border-red-900 p-2 text-xs text-red-300">Remove image</button>
    </>:<p className="text-xs text-slate-500">Use the image icon on the left to add a reference image.</p>}
   </div>}
   {panel==="composer"&&<CharacterComposer/>}
   {panel==="save"&&<SaveDesign name={s.name} part={s.part} size={s.size} pixels={s.pixels} palette={colors} designId={s.activeDesignId} onSaved={s.setActiveDesignId}/>}
   {panel==="load"&&<LoadDesigns onLoad={d=>s.loadDesign(d)}/>}
   {panel==="export"&&<div className="space-y-3"><ExportDesign name={s.name} part={s.part} size={s.size} pixels={s.pixels} palette={colors}/><ExportPng name={s.name} size={s.size} pixels={s.pixels} empty={empty}/></div>}
   {panel==="base"&&<BaseBodyControls name={s.name} size={s.size} pixels={s.pixels} palette={colors}/>}
   {panel==="zoom"&&<ZoomControls zoom={s.zoom} setZoom={s.setZoom}/>}
  </aside>
 </div>;
}
