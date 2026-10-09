"use client";
import { useState, type FormEvent } from "react";
import type { CharacterLook } from "@/lib/game-types";
import { DEFAULT_LOOK } from "@/lib/game-types";
import PixelHero from "./PixelHero";

type Part = "face" | "hair" | "body" | "outfit";
type ColorKey = "skinColor" | "hairColor" | "outfitColor" | "eyeColor";
const skins=["#f2c49b","#e8a77e","#b87550","#754631","#f3d8b7","#9a6147"];
const hairs=["#392447","#242b42","#bd8744","#e8d0a0","#d65b82","#e7eeee"];
const outfits=["#19b9ad","#4168d9","#b8476a","#d69a38","#794bd0","#e6e6ee"];
const eyes=["#38d9ee","#4b87ff","#4ae08e","#e1b64d","#d7e1ff"];
export default function CharacterEditor({initialName="",initialAppearance,title,busy,error,onClose,onSave}: {
  initialName?:string; initialAppearance?:CharacterLook|null; title:string;
  busy:boolean; error?:string; onClose:()=>void;
  onSave:(name:string,look:CharacterLook)=>Promise<void>;
}) {
  const [name,setName]=useState(initialName), [part,setPart]=useState<Part>("face");
  const [look,setLook]=useState<CharacterLook>({...DEFAULT_LOOK,...initialAppearance});
  const key:ColorKey=part==="face"?"eyeColor":part==="hair"?"hairColor":part==="body"?"skinColor":"outfitColor";
  const colors=part==="face"?eyes:part==="hair"?hairs:part==="body"?skins:outfits;
  const setNum=(n:number)=>setLook(v=>({...v,[part]:n}));
  function submit(e:FormEvent){e.preventDefault();if(name.trim()) void onSave(name.trim(),look);}
  function randomize(){setLook({...look,face:1+Math.floor(Math.random()*8),hair:1+Math.floor(Math.random()*8),outfit:1+Math.floor(Math.random()*8),skinColor:skins[Math.floor(Math.random()*skins.length)],hairColor:hairs[Math.floor(Math.random()*hairs.length)],outfitColor:outfits[Math.floor(Math.random()*outfits.length)]});}
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-[#040b20] text-white">
    <form onSubmit={submit} className="mx-auto flex min-h-screen max-w-6xl flex-col p-4 sm:p-7">
      <header className="flex items-center justify-between border-b border-cyan-300/30 pb-4"><h2 className="font-mono text-xl font-black tracking-widest text-cyan-300 sm:text-2xl">{title.toUpperCase()}</h2><button type="button" onClick={onClose} className="border-2 border-cyan-300 px-3 py-2 font-mono text-cyan-200">↩ BACK</button></header>
      <div className="grid flex-1 gap-5 py-5 lg:grid-cols-[.9fr_1.1fr]">
        <section className="flex min-h-[620px] flex-col items-center justify-between border border-cyan-300/30 bg-[radial-gradient(ellipse_at_center,#123f67,#07142c_65%)] p-5">
          <input value={name} onChange={e=>setName(e.target.value)} required minLength={3} maxLength={24} placeholder="CHARACTER NAME..." className="w-full border-b-2 border-cyan-300 bg-black/20 p-3 font-mono outline-none"/>
          <div className="relative flex min-h-[420px] w-full flex-1 items-end justify-center overflow-hidden pb-2"><div className="absolute h-[420px] w-[300px] border-x-2 border-cyan-300/50 bg-cyan-300/5 [clip-path:polygon(30%_0,70%_0,100%_100%,0_100%)]"/><div className="absolute bottom-8 h-2 w-64 bg-cyan-300/30 blur-md"/><div className="relative z-10"><PixelHero look={look} size={300}/></div></div>
          <button type="button" onClick={randomize} className="w-full border-2 border-cyan-300/40 bg-cyan-300/10 p-3 font-mono text-cyan-200 hover:bg-cyan-300/20">⚄ RANDOMIZE</button>
        </section>
        <section className="flex flex-col border-2 border-cyan-400 bg-[#087f98] p-3 shadow-[0_0_25px_#06b6d433] sm:p-5">
          <nav className="grid grid-cols-4 gap-2">{(["face","hair","body","outfit"] as Part[]).map((p,i)=><button type="button" key={p} onClick={()=>setPart(p)} className={`border-2 p-3 font-mono ${part===p?"border-yellow-300 bg-[#053249] text-cyan-200":"border-cyan-300/60 bg-[#075b75]"}`}>{["◉","♟","♙","▣"][i]}<span className="block text-[10px] uppercase">{p}</span></button>)}</nav>
          <h3 className="my-4 bg-[#07556a] p-3 text-center font-mono font-bold tracking-widest">{part.toUpperCase()} STYLE</h3>
          <div className="grid grid-cols-4 gap-2">{Array.from({length:8},(_,i)=>i+1).map(n=><button type="button" key={n} onClick={()=>setNum(n)} className={`grid min-h-20 place-items-center border-2 ${look[part]===n?"border-yellow-300 bg-[#053249]":"border-cyan-300/60 bg-[#064b65]"}`}><PixelHero size={48} look={{...look,[part]:n}}/><small>{String(n).padStart(2,"0")}</small></button>)}</div>
          <p className="mb-3 mt-5 text-xs font-bold tracking-widest">COLOR OPTIONS</p><div className="flex flex-wrap gap-2">{colors.map(c => <button type="button" key={c} aria-label={`Choose ${c}`} onClick={() => setLook(v => ({ ...v, [key]: c }))} style={{ backgroundColor: c }} className={`size-8 border-2 ${look[key] === c ? "border-white ring-2 ring-yellow-300" : "border-black/40"}`} />)}</div>
          <div className="mt-auto pt-5"><button disabled={busy} className="w-full border-2 border-cyan-200 bg-cyan-300 p-4 font-mono font-black tracking-widest text-[#052139] hover:bg-cyan-100">{busy?"SAVING...":"◆ "+(title==="Edit Character"?"SAVE CHANGES":"CREATE CHARACTER")+" ◆"}</button>{error&&<p className="mt-3 break-words text-sm text-red-100">{error}</p>}</div>
        </section>
      </div>
    </form>
  </div>;
}

