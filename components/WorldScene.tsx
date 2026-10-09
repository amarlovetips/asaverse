"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import PixelHero from "@/components/PixelHero";
import { DEFAULT_LOOK,type CharacterLook } from "@/lib/game-types";

type Hero={character_name:string;level:number;xp:number;appearance:CharacterLook};
export default function WorldScene(){
  const [hero,H]=useState<Hero|null>(null),[pos,P]=useState({x:50,y:55});
  useEffect(()=>{
    const raw=localStorage.getItem("asaverse.selectedCharacter");
    if(raw){try{H(JSON.parse(raw) as Hero);}catch{localStorage.removeItem("asaverse.selectedCharacter");}}
    const key=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase();
      if(!["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"].includes(k))return;
      e.preventDefault();
      P(p=>({x:Math.max(5,Math.min(95,p.x+(["arrowleft","a"].includes(k)?-3:["arrowright","d"].includes(k)?3:0))),y:Math.max(8,Math.min(88,p.y+(["arrowup","w"].includes(k)?-3:["arrowdown","s"].includes(k)?3:0)))}));
    };
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[]);
  return <main className="relative h-[100dvh] overflow-hidden bg-[#091a24] text-white">
    <header className="absolute inset-x-0 top-0 z-10 flex justify-between border-b border-white/10 bg-black/30 p-4"><div><p className="text-xs tracking-widest text-cyan-300">ASAVERSE WORLD</p><b>{hero?.character_name??"Loading hero..."}</b><p className="text-xs text-slate-300">Lv {hero?.level??1} · XP {hero?.xp??0}</p></div><Link href="/play" className="rounded-lg border px-3 py-2 text-sm">← Characters</Link></header>
    <div className="absolute inset-0 opacity-60" style={{backgroundImage:"linear-gradient(#2b6b5540 1px,transparent 1px),linear-gradient(90deg,#2b6b5540 1px,transparent 1px)",backgroundSize:"48px 48px"}}/>
    {hero&&<div className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{left:`${pos.x}%`,top:`${pos.y}%`}}><PixelHero look={{...DEFAULT_LOOK,...hero.appearance}} size={96}/><span className="rounded bg-black/70 px-2 text-xs">{hero.character_name}</span></div>}
    <footer className="absolute inset-x-0 bottom-0 bg-black/40 p-4 text-center text-xs text-slate-300">MOVE: WASD / ARROW KEYS</footer>
  </main>;
}
