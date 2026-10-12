"use client";
import { useState } from "react";
import { createClient } from "../../../lib/supabase";

type Design = {
  id: string;
  design_name: string;
  design_type: string;
  is_published: boolean;
  is_default_base: boolean;
  allowed_colors: string[];
};

export default function DesignPublishing() {
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
      const { data, error } = await db.from("character_designs")
        .select("id,design_name,design_type,is_published,is_default_base,allowed_colors")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setItems((data || []) as Design[]);
      setMessage(data?.length ? "" : "No designs found.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Load failed.");
    } finally { setBusy(false); }
  }

  async function publish(d: Design) {
    setBusy(true);
    try {
      const db = await verifyAdmin();
      const { error } = await db.from("character_designs")
        .update({ is_published: !d.is_published }).eq("id", d.id);
      if (error) throw error;
      setItems(old => old.map(x => x.id === d.id
        ? { ...x, is_published: !d.is_published } : x));
      setMessage("Publish status updated.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Update failed.");
    } finally { setBusy(false); }
  }

  async function setDefault(d: Design) {
    setBusy(true);
    try {
      const db = await verifyAdmin();
      if (d.is_default_base) {
        const { error } = await db.from("character_designs")
          .update({ is_default_base: false }).eq("id", d.id);
        if (error) throw error;
        setItems(old => old.map(x => x.id === d.id
          ? { ...x, is_default_base: false } : x));
      } else {
        const { error: resetError } = await db.from("character_designs")
          .update({ is_default_base: false }).eq("design_type", d.design_type);
        if (resetError) throw resetError;
        const { error } = await db.from("character_designs")
          .update({ is_default_base: true }).eq("id", d.id);
        if (error) throw error;
        setItems(old => old.map(x => x.design_type === d.design_type
          ? { ...x, is_default_base: x.id === d.id } : x));
      }
      setMessage("Default design updated.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Default update failed.");
      await load();
    } finally { setBusy(false); }
  }

  return <section className="space-y-3 rounded border border-slate-700 p-4">
    <h2 className="font-bold">Character Design Publishing</h2>
    <button disabled={busy} onClick={load}
      className="rounded bg-slate-700 px-3 py-2 text-sm disabled:opacity-50">
      {busy ? "Please wait..." : "Load Designs"}
    </button>
    {message && <p role="status" className="break-words text-xs">{message}</p>}
    {items.map(d => <div key={d.id}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{d.design_name}</p>
        <p className="text-xs text-slate-400">
          {d.design_type} · {d.is_published ? "Published" : "Draft"}
          {d.is_default_base ? " · Default" : ""}
        </p>
      </div>
      <button disabled={busy} onClick={() => setDefault(d)}
        className="rounded bg-amber-700 px-3 py-2 text-xs disabled:opacity-50">
        {d.is_default_base ? "Remove Default" : "Set Default"}
      </button>
      <button disabled={busy} onClick={() => publish(d)}
        className="rounded bg-cyan-700 px-3 py-2 text-xs disabled:opacity-50">
        {d.is_published ? "Unpublish" : "Publish"}
      </button>
    </div>)}
  </section>;
}
