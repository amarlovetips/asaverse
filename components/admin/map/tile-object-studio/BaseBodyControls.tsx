"use client";
import {useState} from "react";
import {createClient} from "../../../../lib/supabase";
type Props={name:string;size:number;pixels:Record<string,string>;palette:string[]};
export default function BaseBodyControls(p:Props){
 const [msg,setMsg]=useState("");
 const [busy,setBusy]=useState(false);
 async function save(){
  setBusy(true);setMsg("");
  try{
   const db=createClient(),{data:{user}}=await db.auth.getUser();
   if(!user)throw Error("Please sign in first.");
   const {data,error}=await db.from("character_designs").insert({
    user_id:user.id,design_name:p.name.trim()||"Default Base Body",
    design_type:"base-body",canvas_width:p.size,canvas_height:p.size,
    pixel_data:p.pixels,palette:p.palette
   }).select("id").single();
   if(error)throw error;
   const {error:updateError}=await db.from("character_designs")
    .update({is_default_base:true}).eq("id",data.id).eq("user_id",user.id);
   if(updateError)throw updateError;
   const {error:clearError}=await db.from("character_designs")
    .update({is_default_base:false}).eq("user_id",user.id)
    .eq("design_type","base-body").neq("id",data.id);
   if(clearError)throw clearError;
   setMsg("Base Body saved.");
  }catch(e){setMsg(e instanceof Error?e.message:"Save failed.");}
  finally{setBusy(false);}
 }
 return <section className="space-y-2 rounded border border-slate-700 p-2">
  <h3 className="text-xs font-semibold text-cyan-300">Default Base Body</h3>
  <button onClick={save} disabled={busy} className="w-full rounded bg-cyan-700 p-2 text-xs disabled:opacity-50">{busy?"Saving...":"Save as Default Base"}</button>
  {msg&&<p role="status" className="break-words text-xs text-slate-300">{msg}</p>}
 </section>;
}



