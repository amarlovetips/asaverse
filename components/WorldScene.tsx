"use client";
import { useEffect,useRef,useState } from "react";
import PixelHero from "@/components/PixelHero";
import { DEFAULT_LOOK,type CharacterLook } from "@/lib/game-types";
import { drawWorld,WORLD_SIZE } from "@/lib/world-map";
type Hero={character_name:string;level:number;xp:number;appearance:CharacterLook};
export default function WorldScene(){
  const [hero,H]=useState<Hero|null>(null),canvas=useRef<HTMLCanvasElement>(null),sprite=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const raw=localStorage.getItem("asaverse.selectedCharacter");
    if(raw)try{H(JSON.parse(raw) as Hero);}catch{}
    const node=canvas.current,c=node?.getContext("2d");if(!node||!c)return;
    let x=WORLD_SIZE/2,y=WORLD_SIZE/2,last=0,frame=0,dpr=1;
    const keys=new Set<string>();
    const resize=()=>{dpr=Math.min(devicePixelRatio||1,2);node.width=innerWidth*dpr;node.height=innerHeight*dpr;c.setTransform(dpr,0,0,dpr,0,0);};
    const down=(e:KeyboardEvent)=>{const k=e.key.toLowerCase();if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(k)){e.preventDefault();keys.add(k);}};
    const up=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase()),clear=()=>keys.clear();
    const tick=(t:number)=>{const dt=last?Math.min((t-last)/1000,.05):0;last=t;
      const dx=Number(keys.has("d")||keys.has("arrowright"))-Number(keys.has("a")||keys.has("arrowleft"));
      const dy=Number(keys.has("s")||keys.has("arrowdown"))-Number(keys.has("w")||keys.has("arrowup")),len=Math.hypot(dx,dy)||1;
      x=Math.max(25,Math.min(WORLD_SIZE-25,x+dx/len*220*dt));y=Math.max(25,Math.min(WORLD_SIZE-25,y+dy/len*220*dt));
      const cam=drawWorld(c,innerWidth,innerHeight,x,y);
      if(sprite.current){sprite.current.style.left=`${x-cam.x}px`;sprite.current.style.top=`${y-cam.y}px`;}
      frame=requestAnimationFrame(tick);
    };
    resize();window.addEventListener("resize",resize);window.addEventListener("keydown",down);window.addEventListener("keyup",up);window.addEventListener("blur",clear);frame=requestAnimationFrame(tick);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener("resize",resize);window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);window.removeEventListener("blur",clear);};
  },[]);
  return <main className="fixed inset-0 overflow-hidden bg-[#07131a]"><canvas ref={canvas} className="absolute inset-0 h-full w-full"/><div ref={sprite} className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center pointer-events-none">{hero&&<PixelHero look={{...DEFAULT_LOOK,...hero.appearance}} size={110}/>}</div></main>;
}
