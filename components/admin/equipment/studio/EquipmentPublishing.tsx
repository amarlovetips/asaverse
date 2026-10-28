"use client";
import { useState } from "react";
import { createClient } from "../../../../lib/supabase";
import { EQUIPMENT_CATEGORY_LABELS, isEquipmentCategory } from "../types";

type Design = { id: string; design_name: string; category: string; is_published: boolean };

export default function EquipmentPublishing() {
  const [items, setItems] = useState<Design[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function verifyAdmin() {
    const db = createClient();
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) throw Error("Please sign in first.");
    const { data: admin, error: check } = await db.from("admin_users")
      .select("role,is_active").eq("user_id", user.id).maybeSingle();
    if (check || admin?.role !== "admin" || !admin.is_active)
      throw Error("Admin permission denied.");
    return db;
  }

  async function load() {
    setBusy(true);
    try {
      const db = await verifyAdmin();
      const { data, error } = await db.from("equipment_designs")
        .select("id,design_name,category,is_published")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setItems((data || []) as Design[]);
      setMessage(data?.length ? "" : "No equipment designs found.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Load failed."); }
    finally { setBusy(false); }
  }

  async function publish(d: Design) {
    setBusy(true);
    try {
      const db = await verifyAdmin();
      const { error } = await db.from("equipment_designs")
        .update({ is_published: !d.is_published, updated_at: new Date().toISOString() }).eq("id", d.id);
      if (error) throw error;
      setItems(old => old.map(x => x.id === d.id ? { ...x, is_published: !d.is_published } : x));
      setMessage("Publish status updated.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Update failed."); }
    finally { setBusy(false); }
  }

  return <section className="space-y-3 rounded-lg border border-slate-700 bg-[#0c121b] p-3">
    <h2 className="text-xs font-bold uppercase tracking-[.16em] text-cyan-300">Equipment Publishing</h2>
    <button disabled={busy} onClick={load}
      className="w-full rounded bg-slate-800 p-2 text-xs disabled:opacity-50">
      {busy ? "Please wait..." : "Load Equipment Designs"}
    </button>
    {message && <p role="status" className="break-words text-xs text-slate-400">{message}</p>}
    {items.map(d => <div key={d.id}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{d.design_name}</p>
        <p className="text-xs text-slate-400">
          {isEquipmentCategory(d.category) ? EQUIPMENT_CATEGORY_LABELS[d.category] : d.category} · {d.is_published ? "Published" : "Draft"}
        </p>
      </div>
      <button disabled={busy} onClick={() => publish(d)}
        className="rounded bg-cyan-700 px-3 py-2 text-xs disabled:opacity-50">
        {d.is_published ? "Unpublish" : "Publish"}
      </button>
    </div>)}
  </section>;
}
