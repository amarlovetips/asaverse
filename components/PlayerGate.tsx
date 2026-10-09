"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/game-types";
import RoninConnect from "./RoninConnect";
import ProfileForm from "./ProfileForm";
import CharacterSheet from "./CharacterSheet";
import WorldScene from "./WorldScene";

type Login = { address:string; userId:string };
const DAY = 24 * 60 * 60 * 1000;
export default function PlayerGate() {
  const params=useSearchParams(), world=params.has("world");
  const [login,L]=useState<Login|null>(null),[profile,P]=useState<Profile|null>(null);
  const [status,S]=useState(""),[restoring,R]=useState(true);
  useEffect(()=>{let live=true;
    async function restore(){
      const db=createClient();
      try {
        const {data:{session}}=await db.auth.getSession();
        if(!session||!live)return;
        let started=Number(localStorage.getItem("asaverse.loginAt")||0);
        if(!started){started=Date.now();localStorage.setItem("asaverse.loginAt",String(started));}
        if(Date.now()-started>=DAY){
          await db.auth.signOut();localStorage.removeItem("asaverse.loginAt");localStorage.removeItem("asaverse.wallet");return;
        }
        const {data,error}=await db.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
        if(!live)return;
        if(error)S(error.message);
        else if(data){
          const p=data as Profile;P(p);L({address:p.wallet_address,userId:session.user.id});
          localStorage.setItem("asaverse.wallet",p.wallet_address);
        } else {
          const address=localStorage.getItem("asaverse.wallet")||String(session.user.user_metadata?.address||"");
          if(address)L({address,userId:session.user.id});
        }
      } catch(e){if(live)S(e instanceof Error?e.message:"Session restore failed");}
      finally{if(live)R(false);}
    }
    void restore();return()=>{live=false;};
  },[]);
  async function loggedIn(v:Login){
    L(v);P(null);S("Checking profile...");
    const {data,error}=await createClient().from("profiles").select("*").eq("id",v.userId).maybeSingle();
    if(error)S(error.message);else{P(data as Profile|null);S("");}
  }
  if(restoring)return <main className="grid min-h-screen place-items-center bg-[#070b17] text-cyan-300">Restoring session...</main>;
  if(world&&profile)return <WorldScene/>;
  if(profile)return <CharacterSheet profile={profile}/>;
  return <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
    <header className="text-center"><p className="text-sm tracking-widest text-emerald-300">PLAYER ACCESS</p><h1 className="mt-3 text-4xl font-black">Enter AsaVerse</h1></header>
    <RoninConnect onLogin={loggedIn} onLogout={()=>{L(null);P(null);}}/>
    {status&&<p className="break-words text-sm text-amber-300">{status}</p>}
    {login&&!status&&<ProfileForm wallet={login.address} userId={login.userId} onSaved={P}/>}
  </main>;
}
