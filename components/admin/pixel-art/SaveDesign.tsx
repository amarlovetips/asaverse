"use client";
import { useState } from "react";
import { createClient } from "../../../lib/supabase";
import { mergeDesignSidePixels, type PixelTextLayer } from "../../../lib/character-design-json";

type Props = {
 name:string; part:string; side:"front"|"back"; size:number; pixels:Record<string,string>; basePixels:Record<string,string>; textLayers:PixelTextLayer[]; palette:string[];
 designId:string|null; onSaved:(id:string|null)=>void;
};

export default function SaveDesign({name,part,side,size,pixels,basePixels,textLayers,palette,designId,onSaved}:Props){
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");

 async function save(){
  if(side==="front"&&!name.trim()){setMessage("Enter a design name.");return;}
  if(side==="back"&&!designId){setMessage("Choose a published front design before saving its back.");return;}
  setBusy(true);setMessage("");
  try{
   const db=createClient();
   const {data:{user}}=await db.auth.getUser();
   if(!user)throw Error("Please sign in first.");

   const basePart=part.replace(/-back$/,""),timestamp=new Date().toISOString();

   if(designId){
    const {data:admin,error:adminError}=await db.from("admin_users").select("role,is_active").eq("user_id",user.id).maybeSingle();
    if(adminError||admin?.role!=="admin"||!admin.is_active)throw Error("Admin permission denied.");
    const {data:existing,error:loadError}=await db.from("character_designs")
     .select("pixel_data,design_name,design_type,user_id").eq("id",designId).maybeSingle();
    if(loadError)throw loadError;
    if(!existing)throw Error("Design not found.");
    if(side==="back"&&existing.design_type.toLowerCase().endsWith("-back"))throw Error("Choose the published front design.");
    const {data,error}=await db.from("character_designs")
     .update({
      ...(side==="front"?{design_name:name.trim(),design_type:basePart}:{}),
      canvas_width:size,canvas_height:size,
      pixel_data:mergeDesignSidePixels(existing.pixel_data,side,basePixels,size,textLayers,pixels),palette,updated_at:timestamp
     }).eq("id",designId)
     .select("id").maybeSingle();
    if(error)throw error;
    if(!data)throw Error("Unable to update this design. Check the database update policy.");
    onSaved(data.id);
    setMessage(`Design ${side} updated: ${existing.design_name}`);
   }else{
    if(side==="back")throw Error("Choose a published front design first.");
    const {data,error}=await db.from("character_designs")
     .insert({design_name:name.trim(),design_type:basePart,canvas_width:size,canvas_height:size,pixel_data:mergeDesignSidePixels(null,"front",basePixels,size,textLayers,pixels),palette,updated_at:timestamp,user_id:user.id})
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
