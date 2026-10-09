"use client";
import { useState, type FormEvent, type ChangeEvent } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/game-types";

export default function ProfileForm({ wallet, userId, onSaved }: {
  wallet: string; userId: string; onSaved: (p: Profile) => void;
}) {
  const [f, setF] = useState({ username: "", backup_email: "", birthday: "", country: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const change = (e: ChangeEvent<HTMLInputElement>) => setF(v => ({ ...v, [e.target.name]: e.target.value }));
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const { data, error } = await createClient().from("profiles")
        .insert({ id: userId, wallet_address: wallet.toLowerCase(), ...f })
        .select("*").single();
      if (error || !data) throw error ?? new Error("Profile save failed");
      onSaved(data as Profile);
    } catch (e) { setErr(String((e as { message?: string; details?: string; code?: string }).message || JSON.stringify(e))); }
    finally { setBusy(false); }
  }
  const field = "w-full rounded-xl border border-white/10 bg-[#101a2d] p-3 text-white";
  return <div className="fixed inset-0 z-40 grid place-items-center bg-black/80 p-4">
    <form onSubmit={save} className="w-full max-w-lg space-y-4 rounded-3xl border border-white/10 bg-[#0b1224] p-6">
      <h2 className="text-2xl font-bold">Create Player Profile</h2>
      <p className="break-all text-xs text-emerald-300">{wallet}</p>
      <input className={field} name="username" placeholder="Username" value={f.username} onChange={change} required minLength={3} maxLength={24}/>
      <input className={field} name="backup_email" type="email" placeholder="Backup email" value={f.backup_email} onChange={change} required/>
      <label className="block text-sm text-slate-400">Birthday<input className={field} name="birthday" type="date" value={f.birthday} onChange={change} required/></label>
      <input className={field} name="country" placeholder="Country" value={f.country} onChange={change} required/>
      {err && <p className="break-words text-sm text-rose-300">{err}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-emerald-300 p-3 font-bold text-black">{busy ? "Saving..." : "Create Profile"}</button>
    </form>
  </div>;
}

