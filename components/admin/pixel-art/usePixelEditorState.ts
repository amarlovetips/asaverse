"use client";
import { useEffect, useRef, useState } from "react";
import { usePixelDrawing } from "./usePixelDrawing";
import { linePixels } from "../pixel-art-utils";
import { createClient } from "../../../lib/supabase";

export const ARTBOARDS = ["body", "face", "facial-hair", "hair", "body-back", "face-back", "facial-hair-back", "hair-back", "clothing", "outfit", "clothing-back", "outfit-back", "back-side"];
type Pixels = Record<string,string>;
export function usePixelEditorState() {
 const [name,setName]=useState("");
 const [activeDesignId,setActiveDesignId]=useState<string|null>(null);
 const [part,setPartState]=useState("body");
 const [side,setSideState]=useState<"front"|"back">("front");
 const [color,setColor]=useState("#171923");
 const [size,setSizeState]=useState(32);
 const [tool,setTool]=useState("pencil");
 const [zoom,setZoom]=useState(12);
 const [guide,setGuide]=useState(true);
 const [xy,setXy]=useState("0, 0");
 const [recent,setRecent]=useState<string[]>([]);
 const boards=useRef<Record<string,Pixels>>({});
 const histories=useRef<Record<string,Pixels[]>>({});
 const [boardPixels,setBoardPixels]=useState<Record<string,Pixels>>({});
 const draw=usePixelDrawing(size,color,tool);

 useEffect(()=>{let live=true;async function loadBase(){try{const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user)return;const {data,error}=await db.from("character_designs").select("pixel_data").eq("user_id",user.id).eq("design_type","base-body").eq("is_default_base",true).maybeSingle();if(live&&!error&&data){const pixels=(data.pixel_data||{}) as Pixels;boards.current["base-body"]=pixels;setBoardPixels(old=>({...old,"base-body":pixels}));}}catch{}}void loadBase();return()=>{live=false;};},[]);

 function setPart(v:string){
  const category=v.endsWith("-back")?v.slice(0,-5):v;
  if(!["body","face","facial-hair","hair","clothing","outfit"].includes(category)&&v!=="back-side")return;
  const target=v.endsWith("-back")||v==="back-side"?v:(side==="back"?`${v}-back`:v);
  if(target!==part)setActiveDesignId(null);
  boards.current[part]=draw.pixels;histories.current[part]=draw.history;
  setBoardPixels(old=>({...old,[part]:draw.pixels}));setPartState(target);
  setSideState(target.endsWith("-back")||target==="back-side"?"back":"front");
  draw.setPixels(boards.current[target]||{});draw.setHistory(histories.current[target]||[]);
 }
 function setSide(v:"front"|"back"){
  const category=part.endsWith("-back")?part.slice(0,-5):part==="back-side"?"body":part;
  const target=v==="back"?`${category}-back`:category;
  if(target===part)return;
  boards.current[part]=draw.pixels;histories.current[part]=draw.history;
  setBoardPixels(old=>({...old,[part]:draw.pixels}));setPartState(target);setSideState(v);setActiveDesignId(null);
  draw.setPixels(boards.current[target]||{});draw.setHistory(histories.current[target]||[]);
 }
 function changeSize(v:number){if(v===size||![16,32,64].includes(v))return;boards.current[part]={};histories.current[part]=[];setBoardPixels(old=>({...old,[part]:{}}));setSizeState(v);draw.setPixels({});draw.setHistory([]);}
 function setPixels(p:Pixels){boards.current[part]=p;setBoardPixels(old=>({...old,[part]:p}));draw.setPixels(p);}
 function loadDesign(d:{id:string;design_name:string;design_type:string;canvas_width:number;pixel_data:Pixels}){
  if(!ARTBOARDS.includes(d.design_type)||![16,32,64].includes(d.canvas_width))return;
  const target=d.design_type;
  const pixels=d.pixel_data||{};
   boards.current[part]=draw.pixels;
  histories.current[part]=draw.history;
  boards.current[target]=pixels;
  histories.current[target]=[];
  setBoardPixels(old=>({...old,[part]:draw.pixels,[target]:pixels}));
  setName(d.design_name);setActiveDesignId(d.id);
  setPartState(target);
  setSizeState(d.canvas_width);
  draw.setPixels(pixels);
  draw.setHistory([]);
 }
 function locate(e:React.PointerEvent<HTMLDivElement>){const r=e.currentTarget.getBoundingClientRect();const x=Math.max(0,Math.min(size-1,Math.floor((e.clientX-r.left)/r.width*size)));const y=Math.max(0,Math.min(size-1,Math.floor((e.clientY-r.top)/r.height*size)));setXy(`${x}, ${y}`);return [x,y] as [number,number];}
 function start(e:React.PointerEvent<HTMLDivElement>){if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);draw.remember();histories.current[part]=[...draw.history,draw.pixels].slice(-30);draw.setDrawing(true);draw.setLast("");const [x,y]=locate(e);draw.setPrevious([x,y]);draw.paint(x,y);setRecent(old=>[color,...old.filter(c=>c!==color)].slice(0,10));}
 function move(e:React.PointerEvent<HTMLDivElement>){const [x,y]=locate(e),p=draw.previous.current;if(draw.drawing&&tool!=="fill"&&p){linePixels(p[0],p[1],x,y).forEach(k=>{const [a,b]=k.split(",").map(Number);draw.paint(a,b);});draw.setPrevious([x,y]);}}
 function stop(){draw.setDrawing(false);draw.setLast("");draw.setPrevious(null);histories.current[part]=draw.history;}
 function undo(){draw.undo();const h=draw.history.slice(0,-1);histories.current[part]=h;const prior=h[h.length-1]||{};boards.current[part]=prior;setBoardPixels(old=>({...old,[part]:prior}));}
 return {name,setName,activeDesignId,setActiveDesignId,part,setPart,side,setSide,category:part.endsWith("-back")?part.slice(0,-5):part==="back-side"?"body":part,boardPixels,color,setColor,size,setSize:changeSize,tool,setTool,zoom,setZoom,guide,setGuide,xy,recent,setRecent,...draw,setPixels,loadDesign,undo,setHistory:draw.setHistory,start,move,stop};
}
