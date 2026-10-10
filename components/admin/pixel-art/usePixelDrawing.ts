"use client";
import { useRef, useState } from "react";
import { linePixels } from "../pixel-art-utils";

type Pixels = Record<string,string>;
export function usePixelDrawing(size:number,color:string,tool:string){
 const [pixels,setPixels]=useState<Pixels>({});
 const [history,setHistory]=useState<Pixels[]>([]);
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
   else if(tool==="fill"){
    const target=old[k]||"#252b35";
    for(let i=0;i<size*size;i++){
     const a=`${i%size},${Math.floor(i/size)}`;
     if((old[a]||"#252b35")===target)next[a]=color;
    }
   }else next[k]=color;
   return next;
  });
 }
 function remember(){setHistory(h=>[...h.slice(-29),pixels]);}
 function undo(){const old=history.at(-1);if(old){setPixels(old);setHistory(h=>h.slice(0,-1));}}
 return {pixels,setPixels,history,setHistory,drawing,last,previous,paint,remember,undo};
}

