"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePixelDrawing } from "./usePixelDrawing";
import { applyColorFilter, boundsBetween, floodFillPixels, gradientPixels, linePixels, polygonPixels, shapePixels, textPixels, type PixelPoint } from "../pixel-art-utils";
import { createClient } from "../../../lib/supabase";
import { readDesignSidePixels, readDesignTextLayers, type PixelTextLayer } from "../../../lib/character-design-json";

export const ARTBOARDS = ["body", "face", "facial-hair", "hair", "body-back", "face-back", "facial-hair-back", "hair-back", "clothing", "outfit", "clothing-back", "outfit-back", "back-side"];
type Pixels = Record<string,string>;
export type SelectionBounds = {x:number;y:number;width:number;height:number};
export type SelectionKind = "region"|"magic"|"text";

function textBounds(layer:PixelTextLayer):SelectionBounds{return {x:layer.x,y:layer.y,width:Math.max(1,(layer.text.length*6-1)*layer.scale),height:7*layer.scale};}
function fitTextLayer(layer:PixelTextLayer,size:number):PixelTextLayer{const bounds=textBounds(layer);return {...layer,x:Math.max(0,Math.min(Math.max(0,size-bounds.width),layer.x)),y:Math.max(0,Math.min(Math.max(0,size-bounds.height),layer.y))};}

function keysInBounds(pixels:Pixels,bounds:SelectionBounds){return Object.keys(pixels).filter(key=>{const [x,y]=key.split(",").map(Number);return x>=bounds.x&&y>=bounds.y&&x<bounds.x+bounds.width&&y<bounds.y+bounds.height;});}
function boundsForKeys(keys:string[]):SelectionBounds|null{if(!keys.length)return null;const points=keys.map(key=>key.split(",").map(Number));const xs=points.map(([x])=>x),ys=points.map(([,y])=>y);const x=Math.min(...xs),y=Math.min(...ys);return {x,y,width:Math.max(...xs)-x+1,height:Math.max(...ys)-y+1};}
function movePixelKeys(original:Pixels,keys:string[],dx:number,dy:number,size:number){
 const selected=new Set(keys),next:Pixels={};
 for(const [key,color] of Object.entries(original))if(!selected.has(key))next[key]=color;
 for(const key of keys){const color=original[key];if(!color)continue;const [x,y]=key.split(",").map(Number),nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<size&&ny<size)next[`${nx},${ny}`]=color;}
 return next;
}
function moveSelectionPixels(original:Pixels,bounds:SelectionBounds,dx:number,dy:number,size:number){return movePixelKeys(original,keysInBounds(original,bounds),dx,dy,size);}

function composeText(pixels:Pixels,layers:PixelTextLayer[],size:number){
 return layers.reduce((result,layer)=>({...result,...textPixels(layer.text,layer.x,layer.y,layer.color,size,layer.scale)}),{...pixels});
}

export function usePixelEditorState() {
 const [name,setName]=useState("");
 const [activeDesignId,setActiveDesignId]=useState<string|null>(null);
 const [part,setPartState]=useState("body");
 const [side,setSideState]=useState<"front"|"back">("front");
 const [color,setColor]=useState("#171923");
 const [fillColor,setFillColor]=useState("#171923");
 const [shapeFillColor,setShapeFillColor]=useState<string|null>(null);
 const [borderColor,setBorderColor]=useState("#ffffff");
 const [shapeFilled,setShapeFilled]=useState(true);
 const [size,setSizeState]=useState(32);
 const [tool,setTool]=useState("pencil");
 const [zoom,setZoom]=useState(12);
 const [guide,setGuide]=useState(true);
 const [xy,setXy]=useState("0, 0");
 const [recent,setRecent]=useState<string[]>([]);
 const [selection,setSelection]=useState<SelectionBounds|null>(null);
 const [selectionKind,setSelectionKind]=useState<SelectionKind>("region");
 const [selectedPixelKeys,setSelectedPixelKeys]=useState<string[]>([]);
 const [polygonPoints,setPolygonPoints]=useState<PixelPoint[]>([]);
 const [textOrigin,setTextOrigin]=useState<PixelPoint|null>(null);
 const [textLayers,setTextLayers]=useState<PixelTextLayer[]>([]);
 const [activeTextId,setActiveTextId]=useState<string|null>(null);
 const [referencePixels,setReferencePixels]=useState<Pixels>({});
 const [selectionMoving,setSelectionMoving]=useState(false);
 const boards=useRef<Record<string,Pixels>>({});
 const designJson=useRef<unknown>(null);
 const textBoards=useRef<Record<string,PixelTextLayer[]>>({});
 const textMove=useRef<{id:string;point:PixelPoint;x:number;y:number}|null>(null);
 const moveSelectionKeys=useRef<string[]>([]);
 const movingPixels=useRef(false);
 const histories=useRef<Record<string,Pixels[]>>({});
 const gestureStart=useRef<PixelPoint|null>(null);
 const gestureOriginal=useRef<Pixels>({});
 const moveStart=useRef<PixelPoint|null>(null);
 const moveSelectionOrigin=useRef<SelectionBounds|null>(null);
 const selectionDragMoved=useRef(false);
 const [boardPixels,setBoardPixels]=useState<Record<string,Pixels>>({});
 const draw=usePixelDrawing(size,color,tool);
 const renderedPixels=useMemo(()=>textLayers.reduce((pixels,layer)=>({...pixels,...textPixels(layer.text,layer.x,layer.y,layer.color,size,layer.scale)}),{...draw.pixels}),[draw.pixels,textLayers,size]);

 useEffect(()=>{let live=true;async function loadBase(){try{const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user)return;const {data,error}=await db.from("character_designs").select("pixel_data").eq("user_id",user.id).eq("design_type","base-body").eq("is_default_base",true).maybeSingle();if(live&&!error&&data){const pixels=(data.pixel_data||{}) as Pixels;boards.current["base-body"]=pixels;setBoardPixels(old=>({...old,"base-body":pixels}));}}catch{}}void loadBase();return()=>{live=false;};},[]);

 function writePixels(pixels:Pixels){boards.current[part]=pixels;setBoardPixels(old=>({...old,[part]:pixels}));draw.setPixels(pixels);}
 function remember(){draw.remember();histories.current[part]=[...draw.history,draw.pixels].slice(-30);}
 function setPart(v:string){
  const category=v.endsWith("-back")?v.slice(0,-5):v;
  if(!["body","face","facial-hair","hair","clothing","outfit"].includes(category)&&v!=="back-side")return;
  const target=v.endsWith("-back")||v==="back-side"?v:(side==="back"?`${v}-back`:v);
  if(target!==part){setActiveDesignId(null);designJson.current=null;setReferencePixels({});}
  boards.current[part]=draw.pixels;histories.current[part]=draw.history;
  textBoards.current[part]=textLayers;
  setBoardPixels(old=>({...old,[part]:draw.pixels}));setTextLayers(textBoards.current[target]||[]);setActiveTextId(null);setPartState(target);
  setSideState(target.endsWith("-back")||target==="back-side"?"back":"front");
  draw.setPixels(boards.current[target]||{});draw.setHistory(histories.current[target]||[]);draw.setFuture([]);setSelection(null);setSelectionKind("region");setSelectedPixelKeys([]);setPolygonPoints([]);
 }
 function setSide(v:"front"|"back"){
  const category=part.endsWith("-back")?part.slice(0,-5):part==="back-side"?"body":part;
  const target=v==="back"?`${category}-back`:category;
  if(target===part)return;
  boards.current[part]=draw.pixels;histories.current[part]=draw.history;
  textBoards.current[part]=textLayers;
  setBoardPixels(old=>({...old,[part]:draw.pixels}));setPartState(target);setSideState(v);setTextLayers(textBoards.current[target]||(designJson.current?readDesignTextLayers(designJson.current,v):[]));setActiveTextId(null);
  const nextPixels=boards.current[target]||(designJson.current?readDesignSidePixels(designJson.current,v,size):{});
  boards.current[target]=nextPixels;setBoardPixels(old=>({...old,[target]:nextPixels}));
  setReferencePixels(v==="back"?(side==="front"?renderedPixels:composeText(readDesignSidePixels(designJson.current,"front",size),readDesignTextLayers(designJson.current,"front"),size)):{});
  if(!textBoards.current[target])textBoards.current[target]=designJson.current?readDesignTextLayers(designJson.current,v):[];
  draw.setPixels(nextPixels);draw.setHistory(histories.current[target]||[]);draw.setFuture([]);setSelection(null);setSelectionKind("region");setSelectedPixelKeys([]);setPolygonPoints([]);
 }
 function changeSize(v:number){if(v===size||![16,32,64].includes(v))return;boards.current[part]={};histories.current[part]=[];textBoards.current[part]=[];setTextLayers([]);setActiveTextId(null);setBoardPixels(old=>({...old,[part]:{}}));setSizeState(v);draw.setPixels({});draw.setHistory([]);draw.setFuture([]);setSelection(null);}
 function setPixels(p:Pixels){writePixels(p);}
 function loadDesign(d:{id:string;design_name:string;design_type:string;canvas_width:number;pixel_data:unknown},requestedSide?:"front"|"back"){
  if(!ARTBOARDS.includes(d.design_type)||![16,32,64].includes(d.canvas_width))return;
  const baseType=d.design_type.replace(/-back$/,""),targetSide=requestedSide||(d.design_type.endsWith("-back")?"back":"front");
  const target=targetSide==="back"?`${baseType}-back`:baseType,pixels=readDesignSidePixels(d.pixel_data,targetSide,d.canvas_width);
  boards.current[part]=draw.pixels;histories.current[part]=draw.history;
  boards.current[target]=pixels;histories.current[target]=[];
  const layers=readDesignTextLayers(d.pixel_data,targetSide);textBoards.current[target]=layers;
  designJson.current=d.pixel_data;
  setBoardPixels(old=>({...old,[part]:draw.pixels,[target]:pixels}));setTextLayers(layers);setActiveTextId(null);setReferencePixels(targetSide==="back"?composeText(readDesignSidePixels(d.pixel_data,"front",d.canvas_width),readDesignTextLayers(d.pixel_data,"front"),d.canvas_width):{});setName(d.design_name);setActiveDesignId(d.id);
  setPartState(target);setSideState(targetSide);setSizeState(d.canvas_width);draw.setPixels(pixels);draw.setHistory([]);draw.setFuture([]);setSelection(null);setSelectionKind("region");setSelectedPixelKeys([]);setPolygonPoints([]);
 }
 function locate(e:React.PointerEvent<HTMLDivElement>){const r=e.currentTarget.getBoundingClientRect();const x=Math.max(0,Math.min(size-1,Math.floor((e.clientX-r.left)/r.width*size)));const y=Math.max(0,Math.min(size-1,Math.floor((e.clientY-r.top)/r.height*size)));setXy(`${x}, ${y}`);return {x,y};}
 function previewShape(start:PixelPoint,end:PixelPoint,constrain=false){
  if(constrain){const span=Math.max(Math.abs(end.x-start.x),Math.abs(end.y-start.y));end={x:start.x+Math.sign(end.x-start.x||1)*span,y:start.y+Math.sign(end.y-start.y||1)*span};}
  if(tool==="gradient")writePixels({...gestureOriginal.current,...gradientPixels(start,end,size,fillColor,borderColor)});
  else if(tool==="perspective"){
   const amount=end.x-start.x,next:Pixels={};
   for(const [key,pixelColor] of Object.entries(gestureOriginal.current)){const [x,y]=key.split(",").map(Number);const nx=Math.max(0,Math.min(size-1,Math.round(x+amount*y/Math.max(1,size-1))));next[`${nx},${y}`]=pixelColor;}
   writePixels(next);
  }else if(tool==="rectangle"||tool==="circle")writePixels({...gestureOriginal.current,...shapePixels(tool,start,end,size,shapeFillColor,borderColor,shapeFillColor!==null)});
  else writePixels({...gestureOriginal.current,...shapePixels(tool,start,end,size,fillColor,borderColor,shapeFilled)});
 }
 function start(e:React.PointerEvent<HTMLDivElement>){
  if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const point=locate(e);
  if(tool==="polygon"){setPolygonPoints(old=>[...old,point]);return;}
  if(tool==="magic"){
   const target=draw.pixels[`${point.x},${point.y}`];setActiveTextId(null);setTextOrigin(null);
   if(!target){setSelection(null);setSelectedPixelKeys([]);return;}
   const keys=Object.entries(draw.pixels).filter(([,value])=>value.toLowerCase()===target.toLowerCase()).map(([key])=>key);
   setSelectedPixelKeys(keys);setSelection(boundsForKeys(keys));setSelectionKind("magic");return;
  }
  const hit=textLayers.find(layer=>{const b=textBounds(layer);return point.x>=b.x&&point.y>=b.y&&point.x<b.x+b.width&&point.y<b.y+b.height;});
  if(hit&&(tool==="select"||tool==="text")){
   if(tool==="select"&&activeTextId===hit.id&&selectionKind==="text"){
    setActiveTextId(null);setSelection(null);setSelectionKind("region");return;
   }
   setActiveTextId(hit.id);setTextOrigin(null);setSelection(textBounds(hit));setSelectionKind("text");setSelectedPixelKeys([]);
   selectionDragMoved.current=false;textMove.current={id:hit.id,point,x:hit.x,y:hit.y};setSelectionMoving(true);draw.setDrawing(true);
   return;
  }
  if(tool==="text"){setActiveTextId(null);setTextOrigin(point);return;}
  if(tool==="filter")return;
  const pixelKey=`${point.x},${point.y}`,selectedHit=selectionKind==="magic"?selectedPixelKeys.includes(pixelKey):!!selection&&point.x>=selection.x&&point.y>=selection.y&&point.x<selection.x+selection.width&&point.y<selection.y+selection.height;
  if(tool==="select"&&selection&&selectedHit){
   setActiveTextId(null);
   selectionDragMoved.current=false;moveStart.current=point;moveSelectionOrigin.current=selection;gestureOriginal.current={...draw.pixels};moveSelectionKeys.current=selectedPixelKeys.length?selectedPixelKeys:keysInBounds(draw.pixels,selection);movingPixels.current=true;setSelectionMoving(true);draw.setDrawing(true);return;
  }
  setActiveTextId(null);setSelectedPixelKeys([]);setSelectionKind("region");
  remember();gestureStart.current=point;gestureOriginal.current={...draw.pixels};draw.setLast("");draw.setPrevious([point.x,point.y]);
  if(tool==="select"||tool==="crop"){setSelection({x:point.x,y:point.y,width:1,height:1});setSelectionKind("region");setSelectedPixelKeys([]);draw.setDrawing(true);return;}
  if(["line","rectangle","circle","gradient","perspective"].includes(tool)){draw.setDrawing(true);previewShape(point,point,e.shiftKey);return;}
  draw.setDrawing(true);draw.paint(point.x,point.y);
 }
 function move(e:React.PointerEvent<HTMLDivElement>){
  const point=locate(e);if(!draw.drawing.current)return;
  if(textMove.current){  const origin=textMove.current;const layer=textLayers.find(item=>item.id===origin.id);if(!layer)return;const x=Math.max(0,Math.min(size-textBounds(layer).width,origin.x+point.x-origin.point.x));const y=Math.max(0,Math.min(size-textBounds(layer).height,origin.y+point.y-origin.point.y));if(x!==origin.x||y!==origin.y)selectionDragMoved.current=true;const next=textLayers.map(item=>item.id===origin.id?{...item,x,y}:item);setTextLayers(next);textBoards.current[part]=next;setSelection(textBounds({...layer,x,y}));return;}
  if(selectionMoving&&moveStart.current&&moveSelectionOrigin.current){
   const origin=moveSelectionOrigin.current;
  if(point.x===moveStart.current.x&&point.y===moveStart.current.y)return;
  if(!selectionDragMoved.current){remember();selectionDragMoved.current=true;}
   const dx=Math.max(-origin.x,Math.min(size-origin.x-origin.width,point.x-moveStart.current.x));
   const dy=Math.max(-origin.y,Math.min(size-origin.y-origin.height,point.y-moveStart.current.y));
   writePixels(moveSelectionPixels(gestureOriginal.current,origin,dx,dy,size));
   setSelection({...origin,x:origin.x+dx,y:origin.y+dy});return;
  }
  if((tool==="select"||tool==="crop")&&gestureStart.current){setSelection(boundsBetween(gestureStart.current,point));return;}
  if(["line","rectangle","circle","gradient","perspective"].includes(tool)&&gestureStart.current){previewShape(gestureStart.current,point,e.shiftKey);return;}
  const previous=draw.previous.current;if(previous&&tool!=="fill")linePixels(previous[0],previous[1],point.x,point.y).forEach(key=>{const [x,y]=key.split(",").map(Number);draw.paint(x,y);});draw.setPrevious([point.x,point.y]);
 }
 function stop(){if(!draw.drawing.current)return;draw.setDrawing(false);draw.setLast("");draw.setPrevious(null);histories.current[part]=draw.history;boards.current[part]=draw.pixels;textBoards.current[part]=textLayers;if(moveSelectionOrigin.current&&!selectionDragMoved.current){setSelection(null);setSelectedPixelKeys([]);setActiveTextId(null);setSelectionKind("region");}setSelectionMoving(false);textMove.current=null;moveStart.current=null;moveSelectionOrigin.current=null;gestureStart.current=null;selectionDragMoved.current=false;}
 function finishPolygon(){if(polygonPoints.length<3)return;remember();writePixels({...draw.pixels,...polygonPixels(polygonPoints,fillColor,borderColor,shapeFilled)});setPolygonPoints([]);}
 function applyText(text:string,scale:number){if(!textOrigin||!text.trim())return;const layer:PixelTextLayer={id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`,text:text.trim(),x:textOrigin.x,y:textOrigin.y,scale:Math.max(1,Math.min(4,scale)),color:fillColor};const next=[...textLayers,layer];textBoards.current[part]=next;setTextLayers(next);setActiveTextId(layer.id);setSelection(textBounds(layer));setTextOrigin(null);}
 function editSelectedText(text:string){if(!activeTextId)return;const next=textLayers.map(layer=>layer.id===activeTextId?fitTextLayer({...layer,text},size):layer);setTextLayers(next);textBoards.current[part]=next;const active=next.find(layer=>layer.id===activeTextId);if(active)setSelection(textBounds(active));}
 function scaleSelectedText(scale:number){if(!activeTextId)return;const next=textLayers.map(layer=>layer.id===activeTextId?fitTextLayer({...layer,scale:Math.max(1,Math.min(4,scale))},size):layer);setTextLayers(next);textBoards.current[part]=next;const active=next.find(layer=>layer.id===activeTextId);if(active)setSelection(textBounds(active));}
 function applyFilter(filter:string){if(!Object.keys(draw.pixels).length)return;remember();const source={...draw.pixels};if(selection){const selected:Pixels={};for(const [key,c] of Object.entries(source)){const [x,y]=key.split(",").map(Number);if(x>=selection.x&&y>=selection.y&&x<selection.x+selection.width&&y<selection.y+selection.height)selected[key]=c;}writePixels({...source,...applyColorFilter(selected,filter)});}else writePixels(applyColorFilter(source,filter));}
 function applyCrop(){if(!selection)return;remember();const next:Pixels={};for(const [key,c] of Object.entries(draw.pixels)){const [x,y]=key.split(",").map(Number);if(x>=selection.x&&y>=selection.y&&x<selection.x+selection.width&&y<selection.y+selection.height)next[`${x-selection.x},${y-selection.y}`]=c;}writePixels(next);setSelection(null);}
 function applyPerspective(amount:number){if(!Object.keys(draw.pixels).length)return;remember();const next:Pixels={};for(const [key,c] of Object.entries(draw.pixels)){const [x,y]=key.split(",").map(Number);const nx=Math.max(0,Math.min(size-1,Math.round(x+amount*y/Math.max(1,size-1))));next[`${nx},${y}`]=c;}writePixels(next);}
 function applySelectionFill(fill:string|null){if(!selection||activeTextId||selectionKind==="magic")return;const x=selection.x+Math.floor(selection.width/2),y=selection.y+Math.floor(selection.height/2);const next=floodFillPixels(draw.pixels,x,y,size,fill,selection);if(next===draw.pixels)return;remember();writePixels(next);}
 function moveSelectionBy(dx:number,dy:number){if(!selection||(!dx&&!dy))return;if(activeTextId){const next=textLayers.map(layer=>layer.id===activeTextId?{...layer,x:Math.max(0,Math.min(size-textBounds(layer).width,layer.x+dx)),y:Math.max(0,Math.min(size-textBounds(layer).height,layer.y+dy))}:layer);setTextLayers(next);textBoards.current[part]=next;const active=next.find(layer=>layer.id===activeTextId);if(active)setSelection(textBounds(active));return;}remember();writePixels(moveSelectionPixels(draw.pixels,selection,dx,dy,size));setSelection({...selection,x:Math.max(0,Math.min(size-selection.width,selection.x+dx)),y:Math.max(0,Math.min(size-selection.height,selection.y+dy))});}
 function deleteSelection(){if(!selection)return;if(activeTextId){const next=textLayers.filter(layer=>layer.id!==activeTextId);setTextLayers(next);textBoards.current[part]=next;setActiveTextId(null);setSelection(null);return;}remember();const next={...draw.pixels};for(const key of Object.keys(next)){const [x,y]=key.split(",").map(Number);if(x>=selection.x&&y>=selection.y&&x<selection.x+selection.width&&y<selection.y+selection.height)delete next[key];}writePixels(next);}
 function undo(){const prior=draw.history.at(-1);if(!prior)return;draw.undo();const h=draw.history.slice(0,-1);histories.current[part]=h;boards.current[part]=prior;setBoardPixels(old=>({...old,[part]:prior}));setSelection(null);}
 function redo(){const next=draw.future.at(-1);if(!next)return;draw.redo();boards.current[part]=next;setBoardPixels(old=>({...old,[part]:next}));}
 return {name,setName,activeDesignId,setActiveDesignId,part,setPart,side,setSide,category:part.endsWith("-back")?part.slice(0,-5):part==="back-side"?"body":part,boardPixels,color,setColor,fillColor,setFillColor,shapeFillColor,setShapeFillColor,borderColor,setBorderColor,shapeFilled,setShapeFilled,size,setSize:changeSize,tool,setTool,zoom,setZoom,guide,setGuide,xy,recent,setRecent,...draw,pixels:renderedPixels,basePixels:draw.pixels,textLayers,activeText: textLayers.find(layer=>layer.id===activeTextId)||null,activeTextId,editSelectedText,scaleSelectedText,referencePixels,setPixels,loadDesign,undo,redo,setHistory:draw.setHistory,start,move,stop,selection,selectionKind,clearSelection:()=>{setSelection(null);setActiveTextId(null);setSelectedPixelKeys([]);setSelectionKind("region");},moveSelectionBy,deleteSelection,applySelectionFill,selectionMoving,polygonPoints,finishPolygon,textOrigin,applyText,applyFilter,applyCrop,applyPerspective};
}
