"use client";
import { useRef, useState } from "react";
import { fillArtboard } from "./rectPixelOperations";

type Pixels = Record<string,string>;
export function usePixelDrawing(size:number,color:string,tool:string,height=size){
 const [pixels,setPixels]=useState<Pixels>({});
 const [history,setHistory]=useState<Pixels[]>([]);
 const [future,setFuture]=useState<Pixels[]>([]);
 const drawing=useRef(false);
 const last=useRef("");
 const previous=useRef<[number,number]|null>(null);
 function paint(x:number,y:number){
  const k=`${x},${y}`;
  if(k===last.current)return;
  last.current=k;
  setPixels(old=>{
   const next={...old};
   if(tool==="eraser")delete next[k];
   else if(tool==="fill")return fillArtboard(old,x,y,size,height,color);
   else next[k]=color;
   return next;
  });
 }
 function remember(){setHistory(h=>[...h.slice(-29),pixels]);setFuture([]);}
 function undo(){const old=history.at(-1);if(old){setFuture(f=>[...f,pixels]);setPixels(old);setHistory(h=>h.slice(0,-1));}}
 function redo(){const next=future.at(-1);if(next){setHistory(h=>[...h,pixels]);setPixels(next);setFuture(f=>f.slice(0,-1));}}
 return {pixels,setPixels,history,setHistory,future,setFuture,drawing,last,previous,setDrawing:(v:boolean)=>{drawing.current=v;},setLast:(v:string)=>{last.current=v;},setPrevious:(v:[number,number]|null)=>{previous.current=v;},paint,remember,undo,redo};
}
