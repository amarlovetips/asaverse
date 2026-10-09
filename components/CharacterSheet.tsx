"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Profile, Character, CharacterLook } from "@/lib/game-types";
import { DEFAULT_LOOK } from "@/lib/game-types";
import CharacterAvatar from "./CharacterAvatar";
import CharacterEditor from "./CharacterEditor";

export default function CharacterSheet({profile}:{profile:Profile}) {
  const router=useRouter();
  const [list,S]=useState<Character[]>([]),[selected,I]=useState("");
  const [edit,E]=useState<Character|null>(null),[show,M]=useState(false),[busy,B]=useState(false),[err,R]=useState("");
  const index=Math.max(0,list.findIndex(x=>x.id===selected)),c=list[index];
  useEffect(()=>{let live=true;createClient().from("characters").select("id,character_name,level,xp,gold_coin,lust_coin,appearance").eq("user_id",profile.id).then(({data,error})=>{if(live){const a=(data??[]) as Character[];S(a);if(a[0])I(a[0].id);if(error)R(error.message);}});return()=>{live=false};},[profile.id]);
  async function save(name:string,look:CharacterLook){B(true);R("");try{const db=createClient(),q=edit?db.from("characters").update({character_name:name,appearance:look}).eq("id",edit.id):db.from("characters").insert({user_id:profile.id,character_name:name,appearance:look,level:1,xp:0,position_x:0,position_y:0,tutorial_completed:false,gold_coin:0,lust_coin:0});const {data,error}=await q.select("id,character_name,level,xp,gold_coin,lust_coin,appearance").single();if(error)throw error;const v=data as Character;S(a=>edit?a.map(x=>x.id===v.id?v:x):[...a,v]);I(v.id);E(null);M(false);}catch(e){R(e instanceof Error?e.message:"Save failed");}finally{B(false);}}
  async function remove(){if(!c||!confirm(`Delete ${c.character_name}?`))return;const {error}=await createClient().from("characters").delete().eq("id",c.id);if(error)R(error.message);else{const a=list.filter(x=>x.id!==c.id);S(a);I(a[0]?.id??"");}}
  function enter(){if(!c)return;localStorage.setItem("asaverse.selectedCharacter",JSON.stringify({...c,appearance:{...DEFAULT_LOOK,...c.appearance}}));router.push("/play?world");}
  return <main className="fixed inset-0 overflow-hidden bg-[#050b19] text-white"><header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4"><div><p className="text-xs tracking-widest text-cyan-300">ASAVERSE</p><h1 className="text-xl font-black">CHARACTERS</h1></div><div className="flex gap-2"><button onClick={()=>{E(null);M(true);R("");}} className="rounded-lg bg-cyan-300 px-3 py-2 font-bold text-slate-950">＋ CREATE</button>{c&&<><button onClick={()=>{E(c);M(true);R("");}} className="rounded-lg border p-2">✎</button><button onClick={()=>void remove()} className="rounded-lg border border-rose-400 p-2 text-rose-300">⌫</button></>}</div></header>
  <section className="absolute inset-x-0 bottom-3 top-20 flex flex-col items-center justify-center gap-1">
    <div className="z-10 text-center"><h2 className="text-2xl font-black sm:text-3xl">{c?.character_name??"CREATE YOUR HERO"}</h2><p className="mt-1 text-sm tracking-widest text-cyan-200">{c?`LEVEL ${c.level} · XP ${c.xp}`:"YOUR ADVENTURE AWAITS"}</p></div>
    <CharacterAvatar large empty={!c} look={{...DEFAULT_LOOK,...c?.appearance}} onCreate={()=>M(true)}/>
    <button disabled={!c} onClick={enter} className="z-10 rounded-xl border-2 border-cyan-200 bg-cyan-300 px-10 py-3 font-black tracking-widest text-slate-950 shadow-[0_0_25px_#22d3ee55] disabled:opacity-40">ENTER GAME →</button>
    {list.length>1&&<div className="absolute inset-x-2 top-1/2 flex justify-between"><button onClick={()=>I(list[(index+list.length-1)%list.length].id)} className="grid size-12 place-items-center rounded-full border border-cyan-300/50 bg-black/50 text-3xl">‹</button><button onClick={()=>I(list[(index+1)%list.length].id)} className="grid size-12 place-items-center rounded-full border border-cyan-300/50 bg-black/50 text-3xl">›</button></div>}
    {err&&<p className="max-w-sm break-words text-center text-xs text-rose-300">{err}</p>}
  </section>{show&&<CharacterEditor initialName={edit?.character_name} initialAppearance={edit?.appearance} title={edit?"Edit Character":"Create Character"} busy={busy} error={err} onClose={()=>{M(false);E(null);R("");}} onSave={save}/>}</main>;
}

