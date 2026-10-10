"use client";
import { useState } from "react";
import { createClient } from "../../../lib/supabase";

type Design = { id: string; design_name: string; design_type: string; is_published: boolean; allowed_colors: string[] };
export default function DesignPublishing() {
  const [items, setItems] = useState<Design[]>([]);
  const [message, setMessage] = useState("");
  async function load() {
    const { data, error } = await createClient().from("character_designs").select("id,design_name,design_type,is_published,allowed_colors").order("updated_at", { ascending: false });
    if (error) { setMessage(error.message); return; }
    setItems((data || []) as Design[]);
    setMessage(data?.length ? "" : "No designs found.");
  }
  async function publish(d: Design) {
    const { error } = await createClient().from("character_designs").update({ is_published: !d.is_published }).eq("id", d.id);
    if (error) { setMessage(error.message); return; }
    setItems(old => old.map(x => x.id === d.id ? { ...x, is_published: !x.is_published } : x));
    setMessage("Design status updated.");
  }
  return <section className="space-y-3 rounded border border-slate-700 p-4">
    <h2 className="font-bold">Character Design Publishing</h2>
    <button onClick={load} className="rounded bg-slate-700 px-3 py-2 text-sm">Load Designs</button>
    {message && <p className="text-xs">{message}</p>}
    {items.map(d => <div key={d.id} className="flex items-center justify-between gap-3 border-t border-slate-700 py-2">
      <div className="min-w-0"><p className="truncate text-sm">{d.design_name}</p><p className="text-xs text-slate-400">{d.design_type} · {d.is_published ? "Published" : "Draft"}</p></div>
      <button onClick={() => publish(d)} className="shrink-0 rounded bg-cyan-700 px-3 py-2 text-xs">{d.is_published ? "Unpublish" : "Publish"}</button>
    </div>)}
  </section>;
}