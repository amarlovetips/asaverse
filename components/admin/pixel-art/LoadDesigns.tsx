"use client";
import { useState } from "react";
import { createClient } from "../../../lib/supabase";

type Design={id:string;design_name:string;design_type:string;canvas_width:number;pixel_data:Record<string,string>;palette:string[]};
type Props={onLoad:(d:Design)=>void};
export default function LoadDesigns({onLoad}:Props){
 const [items,setItems]=useState<Design[]>([]);
 const [message,setMessage]=useState("");
 async function load(){
  setMessage("Loading...");
  const db=createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user){setMessage("Please sign in first.");return;}
  const {data,error}=await db.from("character_designs").select("id,design_name,design_type,canvas_width,pixel_data,palette").eq("user_id",user.id).in("design_type",["body","face","facial-hair","hair"]).order("updated_at",{ascending:false});
  if(error){setMessage(error.message);return;}
  setItems((data||[]) as Design[]);setMessage(data?.length?"":"No saved designs.");
 }
 return <section className="space-y-2">
  <button onClick={load} className="w-full rounded bg-slate-800 p-2 text-xs">Load Saved Designs</button>
  {message&&<p className="text-xs text-slate-400">{message}</p>}
  {items.map(d=><button key={d.id} onClick={()=>onLoad(d)} className="block w-full rounded border border-slate-700 p-2 text-left text-xs">{d.design_name} · {d.design_type} · {d.canvas_width}px</button>)}
 </section>;
}
