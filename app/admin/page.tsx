"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default function AdminPage() {
  const [email,E]=useState("");
  const [password,P]=useState("");
  const [error,S]=useState("");
  const [busy,B]=useState(false);
  const [ok,O]=useState(false);

  async function login(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); B(true); S("");
    const db=createClient();
    const {data,error}=await db.auth.signInWithPassword({email,password});
    if(error||!data.user){S(error?.message||"Login failed");B(false);return;}
    const {data:admin,error:check}=await db.from("admin_users")
      .select("role,is_active").eq("user_id",data.user.id).maybeSingle();
    if(check||!admin||admin.role!=="admin"||!admin.is_active){
      await db.auth.signOut(); S("Admin permission denied");B(false);return;
    }
    O(true); B(false);
  }

  if(ok) return <AdminDashboard onLogout={async()=>{
    await createClient().auth.signOut(); O(false);
  }}/>;

  return <main className="grid min-h-screen place-items-center bg-[#070b17] p-5 text-white">
    <section className="w-full max-w-md rounded-2xl border border-cyan-900 bg-[#101827] p-8">
      <h1 className="mb-2 text-3xl font-black">AsaVerse Admin</h1>
      <form onSubmit={login} className="grid gap-4">
        <input className="rounded-lg bg-slate-800 p-3" type="email" placeholder="Admin Gmail" value={email} onChange={e=>E(e.target.value)} required />
        <input className="rounded-lg bg-slate-800 p-3" type="password" placeholder="Password" value={password} onChange={e=>P(e.target.value)} required />
        <button disabled={busy} className="rounded-lg bg-cyan-600 p-3 font-bold">{busy?"Checking...":"Admin Login"}</button>
        {error&&<p className="text-red-300">{error}</p>}
      </form>
    </section>
  </main>;
}
