"use client";
import { useRef } from "react";
export function useCanvasPan(){
 const active=useRef(false);
 const origin=useRef({x:0,y:0,left:0,top:0});
 function start(e:React.MouseEvent<HTMLDivElement>){
  if(e.button!==1)return;
  e.preventDefault();active.current=true;
  origin.current={x:e.clientX,y:e.clientY,left:e.currentTarget.scrollLeft,top:e.currentTarget.scrollTop};
 }
 function move(e:React.MouseEvent<HTMLDivElement>){
  if(!active.current)return;
  e.currentTarget.scrollLeft=origin.current.left-(e.clientX-origin.current.x);
  e.currentTarget.scrollTop=origin.current.top-(e.clientY-origin.current.y);
 }
 function stop(){active.current=false;}
 return {start,move,stop};
}
