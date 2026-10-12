"use client";
import { useState } from "react";
import { createClient } from "../../../../lib/supabase";
export type Design={id:string;design_name:string;design_type:string;canvas_width:number;pixel_data:Record<string,string>};
export type Layer=Design&{layerId:string;x:number;y:number};
export function useCharacterLayers(){
 const [layers,setLayers]=useState<Layer[]>([]);
 const [designs,setDesigns]=useState<Design[]>([]);
 const [message,setMessage]=useState("");
 async function refresh(){
  const {data,error}=await createClient().from("character_designs").select("id,design_name,design_type,canvas_width,pixel_data").order("updated_at",{ascending:false});
  if(error){setMessage(error.message);return;}
  setDesigns((data||[]) as Design[]);setMessage(data?.length?"":"No saved designs.");
 }
 function add(d:Design){setLayers(old=>[...old,{...d,layerId:crypto.randomUUID(),x:0,y:0}]);}
 return {layers,setLayers,designs,message,refresh,add};
}
