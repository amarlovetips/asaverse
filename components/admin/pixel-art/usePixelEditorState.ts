"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePixelDrawing } from "./usePixelDrawing";
import { applyColorFilter, boundsBetween, gradientPixels, linePixels, polygonPixels, type PixelPoint } from "../pixel-art-utils";
import { strokePixels } from "./strokePixels";
import { recolorSelectionPixels } from "./selectionPixels";
import { copySelection, pasteSelection, selectionPixelKeys, type SelectionBuffer } from "./selectionOperations";
import { transformSelection } from "./transformSelection";
import type { SelectionBounds, SelectionKind } from "./SelectionBounds";
import { floodFillSelection } from "./selectionFloodFill";
import { magicWandPixelKeys } from "./magicWandSelection";
import { validArtboardDimensions } from "./artboardDimensions";
import { artboardTextPixels, fillArtboard, readArtboardSide } from "./rectPixelOperations";
import { createClient } from "../../../lib/supabase";
import { readDesignTextLayers, type PixelTextLayer } from "../../../lib/character-design-json";

export const ARTBOARDS = ["body", "face", "facial-hair", "hair", "body-back", "face-back", "facial-hair-back", "hair-back", "clothing", "outfit", "clothing-back", "outfit-back", "back-side"];
type Pixels = Record<string,string>;
export type { SelectionBounds, SelectionKind } from "./SelectionBounds";

function textBounds(layer:PixelTextLayer):SelectionBounds{return {x:layer.x,y:layer.y,width:Math.max(1,(layer.text.length*6-1)*layer.scale),height:7*layer.scale};}
function fitTextLayer(layer:PixelTextLayer,width:number,height:number):PixelTextLayer{const bounds=textBounds(layer);return {...layer,x:Math.max(0,Math.min(Math.max(0,width-bounds.width),layer.x)),y:Math.max(0,Math.min(Math.max(0,height-bounds.height),layer.y))};}

function keysInBounds(pixels:Pixels,bounds:SelectionBounds){return Object.keys(pixels).filter(key=>{const [x,y]=key.split(",").map(Number);return x>=bounds.x&&y>=bounds.y&&x<bounds.x+bounds.width&&y<bounds.y+bounds.height;});}
function boundsForKeys(keys:string[]):SelectionBounds|null{if(!keys.length)return null;const points=keys.map(key=>key.split(",").map(Number));const xs=points.map(([x])=>x),ys=points.map(([,y])=>y);const x=Math.min(...xs),y=Math.min(...ys);return {x,y,width:Math.max(...xs)-x+1,height:Math.max(...ys)-y+1};}
function movePixelKeys(original:Pixels,keys:string[],dx:number,dy:number,width:number,height:number){
 const selected=new Set(keys),next:Pixels={};
 for(const [key,color] of Object.entries(original))if(!selected.has(key))next[key]=color;
 for(const key of keys){const color=original[key];if(!color)continue;const [x,y]=key.split(",").map(Number),nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<width&&ny<height)next[`${nx},${ny}`]=color;}
 return next;
}

function composeText(pixels:Pixels,layers:PixelTextLayer[],width:number,height:number){
 return layers.reduce((result,layer)=>({...result,...artboardTextPixels(layer.text,layer.x,layer.y,layer.color,width,height,layer.scale)}),{...pixels});
}

export type PixelEditorOptions = { categories?: string[] };
const CHARACTER_CATEGORIES = ["body", "face", "facial-hair", "hair", "clothing", "outfit"];

export function usePixelEditorState(options?: PixelEditorOptions) {
 const allowedCategories = options?.categories ?? CHARACTER_CATEGORIES;
 const [name,setName]=useState("");
 const [activeDesignId,setActiveDesignId]=useState<string|null>(null);
 const [part,setPartState]=useState("body");
 const [side,setSideState]=useState<"front"|"back">("front");
 const [color,setColor]=useState("#171923");
 const [fillColor,setFillColor]=useState("#171923");
 const [shapeFillColor,setShapeFillColor]=useState<string|null>(null);
 const [borderColor,setBorderColor]=useState("#ffffff");
 const [shapeFilled,setShapeFilled]=useState(true);
 const [strokeWidth,setStrokeWidth]=useState(1);
 const [size,setSizeState]=useState(32);
 const [height,setHeight]=useState(32);
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
 const gestureSelection=useRef<{bounds:SelectionBounds;mask:Set<string>|null}|null>(null);
 const moveStart=useRef<PixelPoint|null>(null);
 const moveSelectionOrigin=useRef<SelectionBounds|null>(null);
 const clipboard=useRef<{buffer:SelectionBuffer;origin:SelectionBounds}|null>(null);
 const selectionDragMoved=useRef(false);
 const [boardPixels,setBoardPixels]=useState<Record<string,Pixels>>({});
 const draw=usePixelDrawing(size,color,tool,height);
 const renderedPixels=useMemo(()=>textLayers.reduce((pixels,layer)=>({...pixels,...artboardTextPixels(layer.text,layer.x,layer.y,layer.color,size,height,layer.scale)}),{...draw.pixels}),[draw.pixels,textLayers,size,height]);

 useEffect(()=>{if(options?.categories)return;let live=true;async function loadBase(){try{const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user)return;const {data,error}=await db.from("character_designs").select("pixel_data").eq("user_id",user.id).eq("design_type","base-body").eq("is_default_base",true).maybeSingle();if(live&&!error&&data){const pixels=(data.pixel_data||{}) as Pixels;boards.current["base-body"]=pixels;setBoardPixels(old=>({...old,"base-body":pixels}));}}catch{}}void loadBase();return()=>{live=false;};},[options?.categories]);

 function writePixels(pixels:Pixels){boards.current[part]=pixels;setBoardPixels(old=>({...old,[part]:pixels}));draw.setPixels(pixels);}
 function editAllowed(x:number,y:number){
  const active=gestureSelection.current;if(!active)return true;
  const {bounds,mask}=active,key=`${x},${y}`;
  return x>=bounds.x&&y>=bounds.y&&x<bounds.x+bounds.width&&y<bounds.y+bounds.height&&(!mask||mask.has(key));
 }
 function paintPoint(x:number,y:number){
  const active=gestureSelection.current;
  if(tool==="fill"&&active){writePixels(floodFillSelection(draw.pixels,x,y,size,color,active.bounds,active.mask?[...active.mask]:undefined,height));return;}
  if(editAllowed(x,y))draw.paint(x,y);
 }
 function writeGesturePixels(pixels:Pixels){
  const active=gestureSelection.current;if(!active){writePixels(pixels);return;}
  const next={...gestureOriginal.current};
  for(const [key,value] of Object.entries(pixels)){const [x,y]=key.split(",").map(Number);if(editAllowed(x,y))next[key]=value;}
  writePixels(next);
 }
 function remember(){draw.remember();histories.current[part]=[...draw.history,draw.pixels].slice(-30);}
 function setPart(v:string){
  const category=v.endsWith("-back")?v.slice(0,-5):v;
  if(!allowedCategories.includes(category)&&v!=="back-side")return;
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
  const nextPixels=boards.current[target]||(designJson.current?readArtboardSide(designJson.current,v,size,height):{});
  boards.current[target]=nextPixels;setBoardPixels(old=>({...old,[target]:nextPixels}));
  setReferencePixels(v==="back"?(side==="front"?renderedPixels:composeText(readArtboardSide(designJson.current,"front",size,height),readDesignTextLayers(designJson.current,"front"),size,height)):{});
  if(!textBoards.current[target])textBoards.current[target]=designJson.current?readDesignTextLayers(designJson.current,v):[];
  draw.setPixels(nextPixels);draw.setHistory(histories.current[target]||[]);draw.setFuture([]);setSelection(null);setSelectionKind("region");setSelectedPixelKeys([]);setPolygonPoints([]);
 }
 function changeArtboardSize(width:number,nextHeight:number):boolean{
  if(!validArtboardDimensions(width,nextHeight))return false;
  if(width===size&&nextHeight===height)return true;
  if((Object.keys(draw.pixels).length||textLayers.length)&&!globalThis.confirm("Changing artboard size clears the current artwork. Continue?"))return false;
  boards.current[part]={};histories.current[part]=[];textBoards.current[part]=[];setTextLayers([]);setActiveTextId(null);
  setBoardPixels(old=>({...old,[part]:{}}));setSizeState(width);setHeight(nextHeight);setActiveDesignId(null);
  draw.setPixels({});draw.setHistory([]);draw.setFuture([]);setSelection(null);setSelectedPixelKeys([]);setSelectionKind("region");return true;
 }
 function changeSize(v:number){return changeArtboardSize(v,v);}
 function setPixels(p:Pixels){writePixels(p);}
 function loadDesign(d:{id:string;design_name:string;design_type:string;canvas_width:number;canvas_height?:number;pixel_data:unknown},requestedSide?:"front"|"back"){
  const designHeight=d.canvas_height||d.canvas_width;
  const typeAllowed = options?.categories ? true : ARTBOARDS.includes(d.design_type);
  if(!typeAllowed||!validArtboardDimensions(d.canvas_width,designHeight))return;
  const baseType=d.design_type.replace(/-back$/,""),targetSide=requestedSide||(d.design_type.endsWith("-back")?"back":"front");
  const target=targetSide==="back"?`${baseType}-back`:baseType,pixels=readArtboardSide(d.pixel_data,targetSide,d.canvas_width,designHeight);
  boards.current[part]=draw.pixels;histories.current[part]=draw.history;
  boards.current[target]=pixels;histories.current[target]=[];
  const layers=readDesignTextLayers(d.pixel_data,targetSide);textBoards.current[target]=layers;
  designJson.current=d.pixel_data;
  setBoardPixels(old=>({...old,[part]:draw.pixels,[target]:pixels}));setTextLayers(layers);setActiveTextId(null);setReferencePixels(targetSide==="back"?composeText(readArtboardSide(d.pixel_data,"front",d.canvas_width,designHeight),readDesignTextLayers(d.pixel_data,"front"),d.canvas_width,designHeight):{});setName(d.design_name);setActiveDesignId(d.id);
  setPartState(target);setSideState(targetSide);setSizeState(d.canvas_width);setHeight(designHeight);draw.setPixels(pixels);draw.setHistory([]);draw.setFuture([]);setSelection(null);setSelectionKind("region");setSelectedPixelKeys([]);setPolygonPoints([]);
 }
 function locate(e:React.PointerEvent<HTMLDivElement>){const r=e.currentTarget.getBoundingClientRect();const x=Math.max(0,Math.min(size-1,Math.floor((e.clientX-r.left)/r.width*size)));const y=Math.max(0,Math.min(height-1,Math.floor((e.clientY-r.top)/r.height*height)));setXy(`${x}, ${y}`);return {x,y};}
 function previewShape(start:PixelPoint,end:PixelPoint,constrain=false){
  if(constrain){const span=Math.max(Math.abs(end.x-start.x),Math.abs(end.y-start.y));end={x:start.x+Math.sign(end.x-start.x||1)*span,y:start.y+Math.sign(end.y-start.y||1)*span};}
  if(tool==="gradient")writeGesturePixels({...gestureOriginal.current,...gradientPixels(start,end,size,fillColor,borderColor)});
  else if(tool==="perspective"){
   const amount=end.x-start.x,next:Pixels={};
   for(const [key,pixelColor] of Object.entries(gestureOriginal.current)){const [x,y]=key.split(",").map(Number);const nx=Math.max(0,Math.min(size-1,Math.round(x+amount*y/Math.max(1,height-1))));next[`${nx},${y}`]=pixelColor;}
   writeGesturePixels(next);
  }else if(["line","rectangle","circle"].includes(tool))writeGesturePixels({...gestureOriginal.current,...strokePixels(tool,start,end,size,shapeFillColor,borderColor,shapeFillColor!==null,strokeWidth,height)});
  else writeGesturePixels({...gestureOriginal.current,...strokePixels(tool,start,end,size,fillColor,borderColor,shapeFilled,strokeWidth,height)});
 }
 function start(e:React.PointerEvent<HTMLDivElement>){
  if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const point=locate(e);
  if(tool==="polygon"){setPolygonPoints(old=>[...old,point]);return;}
  if(tool==="magic"){
   const keys=magicWandPixelKeys(draw.pixels,size,height,point.x,point.y);setActiveTextId(null);setTextOrigin(null);
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
  const constrain=selection&&!activeTextId&&!["select","crop","text","filter","polygon"].includes(tool);
  gestureSelection.current=constrain?{bounds:selection,mask:selectionKind==="magic"?new Set(selectedPixelKeys):null}:null;
  if(constrain&&!editAllowed(point.x,point.y))return;
  setActiveTextId(null);if(!constrain){setSelectedPixelKeys([]);setSelectionKind("region");}
  remember();gestureStart.current=point;gestureOriginal.current={...draw.pixels};draw.setLast("");draw.setPrevious([point.x,point.y]);
  if(tool==="select"||tool==="crop"){setSelection({x:point.x,y:point.y,width:1,height:1});setSelectionKind("region");setSelectedPixelKeys([]);draw.setDrawing(true);return;}
  if(["line","rectangle","circle","gradient","perspective"].includes(tool)){draw.setDrawing(true);previewShape(point,point,e.shiftKey);return;}
  draw.setDrawing(true);paintPoint(point.x,point.y);
 }
 function move(e:React.PointerEvent<HTMLDivElement>){
  const point=locate(e);if(!draw.drawing.current)return;
  if(textMove.current){  const origin=textMove.current;const layer=textLayers.find(item=>item.id===origin.id);if(!layer)return;const x=Math.max(0,Math.min(size-textBounds(layer).width,origin.x+point.x-origin.point.x));const y=Math.max(0,Math.min(height-textBounds(layer).height,origin.y+point.y-origin.point.y));if(x!==origin.x||y!==origin.y)selectionDragMoved.current=true;const next=textLayers.map(item=>item.id===origin.id?{...item,x,y}:item);setTextLayers(next);textBoards.current[part]=next;setSelection(textBounds({...layer,x,y}));return;}
  if(selectionMoving&&moveStart.current&&moveSelectionOrigin.current){
   const origin=moveSelectionOrigin.current;
  if(point.x===moveStart.current.x&&point.y===moveStart.current.y)return;
  if(!selectionDragMoved.current){remember();selectionDragMoved.current=true;}
   const movable=selectionKind==="magic"?boundsForKeys(moveSelectionKeys.current)||origin:origin;
   const dx=Math.max(-movable.x,Math.min(size-movable.x-movable.width,point.x-moveStart.current.x));
   const dy=Math.max(-movable.y,Math.min(height-movable.y-movable.height,point.y-moveStart.current.y));
   writePixels(movePixelKeys(gestureOriginal.current,moveSelectionKeys.current,dx,dy,size,height));
   if(selectionKind==="magic"){
    const moved=moveSelectionKeys.current.map(key=>{const [x,y]=key.split(",").map(Number);return `${x+dx},${y+dy}`;});
    setSelectedPixelKeys(moved);setSelection(boundsForKeys(moved));
   }else setSelection({...origin,x:origin.x+dx,y:origin.y+dy});
   return;
  }
  if((tool==="select"||tool==="crop")&&gestureStart.current){setSelection(boundsBetween(gestureStart.current,point));return;}
  if(["line","rectangle","circle","gradient","perspective"].includes(tool)&&gestureStart.current){previewShape(gestureStart.current,point,e.shiftKey);return;}
  const previous=draw.previous.current;if(previous&&tool!=="fill")linePixels(previous[0],previous[1],point.x,point.y).forEach(key=>{const [x,y]=key.split(",").map(Number);paintPoint(x,y);});draw.setPrevious([point.x,point.y]);
 }
 function stop(){if(!draw.drawing.current)return;draw.setDrawing(false);draw.setLast("");draw.setPrevious(null);histories.current[part]=draw.history;boards.current[part]=draw.pixels;textBoards.current[part]=textLayers;if(moveSelectionOrigin.current&&!selectionDragMoved.current){setSelection(null);setSelectedPixelKeys([]);setActiveTextId(null);setSelectionKind("region");}setSelectionMoving(false);textMove.current=null;moveStart.current=null;moveSelectionOrigin.current=null;gestureStart.current=null;gestureSelection.current=null;selectionDragMoved.current=false;}
 function finishPolygon(){if(polygonPoints.length<3)return;remember();writePixels({...draw.pixels,...polygonPixels(polygonPoints,fillColor,borderColor,shapeFilled)});setPolygonPoints([]);}
 function applyText(text:string,scale:number){if(!textOrigin||!text.trim())return;const layer:PixelTextLayer={id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`,text:text.trim(),x:textOrigin.x,y:textOrigin.y,scale:Math.max(1,Math.min(4,scale)),color:fillColor};const next=[...textLayers,layer];textBoards.current[part]=next;setTextLayers(next);setActiveTextId(layer.id);setSelection(textBounds(layer));setTextOrigin(null);}
 function editSelectedText(text:string){if(!activeTextId)return;const next=textLayers.map(layer=>layer.id===activeTextId?fitTextLayer({...layer,text},size,height):layer);setTextLayers(next);textBoards.current[part]=next;const active=next.find(layer=>layer.id===activeTextId);if(active)setSelection(textBounds(active));}
 function scaleSelectedText(scale:number){if(!activeTextId)return;const next=textLayers.map(layer=>layer.id===activeTextId?fitTextLayer({...layer,scale:Math.max(1,Math.min(4,scale))},size,height):layer);setTextLayers(next);textBoards.current[part]=next;const active=next.find(layer=>layer.id===activeTextId);if(active)setSelection(textBounds(active));}
 function applyFilter(filter:string){if(!Object.keys(draw.pixels).length)return;remember();const source={...draw.pixels};if(selection){const selected:Pixels={};
  if(selectionKind==="magic"){for(const key of selectedPixelKeys)if(source[key]!==undefined)selected[key]=source[key];}
  else for(const [key,c] of Object.entries(source)){const [x,y]=key.split(",").map(Number);if(x>=selection.x&&y>=selection.y&&x<selection.x+selection.width&&y<selection.y+selection.height)selected[key]=c;}
  writePixels({...source,...applyColorFilter(selected,filter)});
 }else writePixels(applyColorFilter(source,filter));}
 function applyCrop(){if(!selection)return;remember();const next:Pixels={};for(const [key,c] of Object.entries(draw.pixels)){const [x,y]=key.split(",").map(Number);if(x>=selection.x&&y>=selection.y&&x<selection.x+selection.width&&y<selection.y+selection.height)next[`${x-selection.x},${y-selection.y}`]=c;}writePixels(next);setSelection(null);}
 function applyPerspective(amount:number){if(!Object.keys(draw.pixels).length)return;remember();const next:Pixels={};for(const [key,c] of Object.entries(draw.pixels)){const [x,y]=key.split(",").map(Number);const nx=Math.max(0,Math.min(size-1,Math.round(x+amount*y/Math.max(1,height-1))));next[`${nx},${y}`]=c;}writePixels(next);}
 function applySelectionFill(fill:string|null){if(!selection||activeTextId||selectionKind==="magic")return;const x=selection.x+Math.floor(selection.width/2),y=selection.y+Math.floor(selection.height/2);const next=fillArtboard(draw.pixels,x,y,size,height,fill,selection);if(next===draw.pixels)return;remember();writePixels(next);}
 function selectAll(){setActiveTextId(null);setSelectedPixelKeys([]);setSelectionKind("region");setSelection({x:0,y:0,width:size,height:height});}
 function invertSelection(){
  const included=new Set(selection?selectionPixelKeys(draw.pixels,selection,selectionKind==="magic"?selectedPixelKeys:undefined):[]);
  const keys:string[]=[];for(let y=0;y<height;y++)for(let x=0;x<size;x++){const key=`${x},${y}`;if(!included.has(key))keys.push(key);}
  setActiveTextId(null);setSelectionKind("magic");setSelectedPixelKeys(keys);setSelection({x:0,y:0,width:size,height:height});
 }
 function copySelectionPixels(cut=false){
  if(!selection||activeTextId)return;
  const keys=selectionPixelKeys(draw.pixels,selection,selectionKind==="magic"?selectedPixelKeys:undefined);
  clipboard.current={buffer:copySelection(draw.pixels,selection,keys),origin:selection};
  if(cut&&keys.length){remember();writePixels(Object.fromEntries(Object.entries(draw.pixels).filter(([key])=>!keys.includes(key))));}
 }
 function pasteSelectionPixels(){
  if(!clipboard.current)return;
  const {buffer,origin}=clipboard.current,x=Math.max(0,Math.min(size-buffer.width,selection?.x??origin.x)),y=Math.max(0,Math.min(height-buffer.height,selection?.y??origin.y));
  const pasted=pasteSelection(draw.pixels,buffer,x,y,size,height);if(!pasted.keys.length)return;
  remember();writePixels(pasted.pixels);setActiveTextId(null);setSelectionKind("magic");setSelectedPixelKeys(pasted.keys);setSelection({x,y,width:buffer.width,height:buffer.height});
 }
 function transformSelectionPixels(transform:"horizontal"|"vertical"|"clockwise"|"counterclockwise"){
  if(!selection||activeTextId)return;
  const keys=selectionPixelKeys(draw.pixels,selection,selectionKind==="magic"?selectedPixelKeys:undefined);
  if(!keys.length)return;
  const result=transformSelection(draw.pixels,selection,keys,size,transform,height);remember();writePixels(result.pixels);
  setSelection(result.bounds);setSelectionKind("magic");setSelectedPixelKeys(result.keys);
 }
 function recolorSelection(nextColor:string){
  if(!selection||activeTextId)return;
  const keys=selectionKind==="magic"?selectedPixelKeys:keysInBounds(draw.pixels,selection);
  const next=recolorSelectionPixels(draw.pixels,keys,nextColor);
  if(next!==draw.pixels){remember();writePixels(next);}
 }
 function moveSelectionBy(dx:number,dy:number){if(!selection||(!dx&&!dy))return;if(activeTextId){const next=textLayers.map(layer=>layer.id===activeTextId?{...layer,x:Math.max(0,Math.min(size-textBounds(layer).width,layer.x+dx)),y:Math.max(0,Math.min(height-textBounds(layer).height,layer.y+dy))}:layer);setTextLayers(next);textBoards.current[part]=next;const active=next.find(layer=>layer.id===activeTextId);if(active)setSelection(textBounds(active));return;}const keys=selectionPixelKeys(draw.pixels,selection,selectionKind==="magic"?selectedPixelKeys:undefined);if(!keys.length)return;const bounds=selectionKind==="magic"?boundsForKeys(keys)||selection:selection;dx=Math.max(-bounds.x,Math.min(size-bounds.x-bounds.width,dx));dy=Math.max(-bounds.y,Math.min(height-bounds.y-bounds.height,dy));if(!dx&&!dy)return;remember();writePixels(movePixelKeys(draw.pixels,keys,dx,dy,size,height));if(selectionKind==="magic"){const moved=keys.map(key=>{const[x,y]=key.split(",").map(Number);return `${x+dx},${y+dy}`;});setSelectedPixelKeys(moved);setSelection(boundsForKeys(moved));}else setSelection({...selection,x:selection.x+dx,y:selection.y+dy});}
 function deleteSelection(){if(!selection)return;if(activeTextId){const next=textLayers.filter(layer=>layer.id!==activeTextId);setTextLayers(next);textBoards.current[part]=next;setActiveTextId(null);setSelection(null);return;}const keys=selectionPixelKeys(draw.pixels,selection,selectionKind==="magic"?selectedPixelKeys:undefined);if(!keys.length)return;remember();const next={...draw.pixels};for(const key of keys)delete next[key];writePixels(next);}
 function undo(){const prior=draw.history.at(-1);if(!prior)return;draw.undo();const h=draw.history.slice(0,-1);histories.current[part]=h;boards.current[part]=prior;setBoardPixels(old=>({...old,[part]:prior}));}
 function redo(){const next=draw.future.at(-1);if(!next)return;draw.redo();boards.current[part]=next;setBoardPixels(old=>({...old,[part]:next}));}
 return {name,setName,activeDesignId,setActiveDesignId,part,setPart,side,setSide,category:part.endsWith("-back")?part.slice(0,-5):part==="back-side"?"body":part,boardPixels,color,setColor,fillColor,setFillColor,shapeFillColor,setShapeFillColor,borderColor,setBorderColor,shapeFilled,setShapeFilled,strokeWidth,setStrokeWidth,size,height,setSize:changeSize,setArtboardSize:changeArtboardSize,tool,setTool,zoom,setZoom,guide,setGuide,xy,recent,setRecent,...draw,pixels:renderedPixels,basePixels:draw.pixels,textLayers,activeText: textLayers.find(layer=>layer.id===activeTextId)||null,activeTextId,editSelectedText,scaleSelectedText,referencePixels,setPixels,loadDesign,undo,redo,setHistory:draw.setHistory,start,move,stop,selection,selectionKind,selectedPixelKeys,selectedPixelCount:selection?(selectionKind==="magic"?selectedPixelKeys.length:keysInBounds(draw.pixels,selection).length):0,clearSelection:()=>{setSelection(null);setActiveTextId(null);setSelectedPixelKeys([]);setSelectionKind("region");},selectAll,invertSelection,copySelectionPixels,pasteSelectionPixels,transformSelectionPixels,moveSelectionBy,deleteSelection,applySelectionFill,recolorSelection,selectionMoving,polygonPoints,finishPolygon,textOrigin,applyText,applyFilter,applyCrop,applyPerspective};
}
