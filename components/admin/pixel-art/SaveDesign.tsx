"use client";
import { useState } from "react";
import { createClient } from "../../../lib/supabase";

type Props = {
 name:string; part:string; size:number; pixels:Record<string,string>; palette:string[];
 designId:string|null; onSaved:(id:string|null)=>void;
};

export default function SaveDesign({name,part,size,pixels,palette,designId,onSaved}:Props){
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");

 async function save(){
  if(!name.trim()){setMessage("Enter a design name.");return;}
  setBusy(true);setMessage("");
  try{
   const db=createClient();
   const {data:{user}}=await db.auth.getUser();
   if(!user)throw Error("Please sign in first.");

   const payload={
    design_name:name.trim(),design_type:part,
    canvas_width:size,canvas_height:size,
    pixel_data:pixels,palette,updated_at:new Date().toISOString()
   };

   if(designId){
    const {data,error}=await db.from("character_designs")
     .update(payload).eq("id",designId).eq("user_id",user.id)
     .select("id").maybeSingle();
    if(error)throw error;
    if(!data)throw Error("Design not found or you do not own it.");
    onSaved(data.id);
    setMessage("Design updated: "+name.trim());
   }else{
    const {data,error}=await db.from("character_designs")
     .insert({...payload,user_id:user.id})
     .select("id").single();
    if(error)throw error;
    onSaved(data.id);
    setMessage("Design saved: "+name.trim());
   }
  }catch(e){setMessage(e instanceof Error?e.message:"Save failed.");}
  finally{setBusy(false);}
 }

 return <div className="space-y-2">
  <button onClick={save} disabled={busy}
   className="w-full rounded bg-cyan-600 p-2 text-xs font-semibold text-white disabled:opacity-50">
   {busy?"Saving...":designId?"Update Design":"Save Design"}
  </button>
  {message&&<p role="status" className="break-words text-xs text-slate-300">{message}</p>}
 </div>;
}
