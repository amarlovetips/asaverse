"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile, Character, CharacterLook } from "@/lib/game-types";
import { DEFAULT_LOOK } from "@/lib/game-types";
import CharacterAvatar from "./CharacterAvatar";
import CharacterEditor from "./CharacterEditor";

export default function CharacterSheet({profile}:{profile:Profile}) {
  const [list,setList]=useState<Character[]>([]),[selected,setSelected]=useState("");
  const [editing,setEditing]=useState<Character|null>(null),[show,setShow]=useState(false);
  const [busy,setBusy]=useState(false),[err,setErr]=useState("");
  useEffect(()=>{let live=true;createClient().from("characters").select("id,character_name,level,xp,gold_coin,lust_coin,appearance").eq("user_id",profile.id).then(({data,error})=>{if(live){setList((data??[]) as Character[]);if(error)setErr(error.message);}});return()=>{live=false};},[profile.id]);
  async function save(name:string,look:CharacterLook) {
    setBusy(true);setErr("");
    try {const db=createClient(),payload={character_name:name,appearance:look};
      const q=editing?db.from("characters").update(payload).eq("id",editing.id):db.from("characters").insert({user_id:profile.id,...payload,level:1,xp:0,position_x:0,position_y:0,tutorial_completed:false,gold_coin:0,lust_coin:0});
      const {data,error}=await q.select("id,character_name,level,xp,gold_coin,lust_coin,appearance").single();
      if(error)throw error;
      setList(v=>editing?v.map(c=>c.id===data.id?data as Character:c):[...v,data as Character]);setSelected(data.id);setShow(false);setEditing(null);
    } catch(e){setErr(e instanceof Error?e.message:"Save failed");} finally{setBusy(false);}
  }
  async function remove(c:Character){if(!window.confirm(`Delete ${c.character_name}?`))return;const {error}=await createClient().from("characters").delete().eq("id",c.id);if(error)setErr(error.message);else{setList(v=>v.filter(x=>x.id!==c.id));if(selected===c.id)setSelected("");}}
  return <main className="min-h-screen w-full bg-[#070b17] px-4 py-10 text-white sm:px-8"><section className="mx-auto max-w-5xl">
    <header className="mb-10 flex items-center justify-between gap-4"><div><p className="text-xs tracking-[.35em] text-cyan-300">YOUR JOURNEY BEGINS</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Character Select</h1></div><button onClick={()=>{setEditing(null);setErr("");setShow(true)}} className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950">＋ Create Character</button></header>
    {err&&!show&&<p className="mb-5 break-words text-sm text-rose-300">{err}</p>}
    {!list.length?<div className="flex min-h-[55vh] flex-col items-center justify-center border border-dashed border-cyan-300/20 bg-[radial-gradient(ellipse_at_center,#164e6322,transparent_70%)] text-center"><CharacterAvatar large empty onCreate={()=>setShow(true)}/><h2 className="mt-5 text-xl font-bold">A hero awaits</h2><p className="mt-2 text-sm text-slate-400">Create your first character.</p></div>:<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map(c=><article key={c.id} onClick={()=>setSelected(c.id)} className={`relative cursor-pointer rounded-3xl border p-5 ${selected===c.id?"border-cyan-300 bg-cyan-300/[.08]":"border-white/10 bg-white/[.025]"}`}><div className="absolute right-3 top-3 flex gap-2"><button title="Edit" onClick={e=>{e.stopPropagation();setEditing(c);setErr("");setShow(true)}} className="size-9 border border-white/10">✎</button><button title="Delete" onClick={e=>{e.stopPropagation();void remove(c)}} className="size-9 border border-white/10 text-rose-300">⌫</button></div><CharacterAvatar look={{...DEFAULT_LOOK,...c.appearance}}/><h2 className="text-center text-xl font-bold">{c.character_name}</h2><p className="mt-1 text-center text-sm text-cyan-200">LEVEL {c.level} · XP {c.xp}</p><p className="mt-3 text-center text-xs text-slate-400">Gold {c.gold_coin} · Lust {c.lust_coin}</p></article>)}</div>}
  </section>{show&&<CharacterEditor initialName={editing?.character_name} initialAppearance={editing?.appearance} title={editing?"Edit Character":"Create Character"} busy={busy} error={err} onClose={()=>{setShow(false);setEditing(null);setErr("")}} onSave={save}/>}</main>;
}
