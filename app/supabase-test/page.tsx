"use client";
import { useState } from "react";

export default function SupabaseTest() {
  const [status, setStatus] = useState("");
  async function test() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return setStatus("URL/Key missing in .env.local");
    try {
      const r = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: key },
      });
      setStatus(r.ok ? "Supabase connected!" : `Error ${r.status}: ${await r.text()}`);
    } catch {
      setStatus("Connection failed. Check URL/internet.");
    }
  }
  return <main className="min-h-screen bg-[#070b17] p-8 text-white">
    <h1 className="mb-5 text-2xl font-bold">Supabase Test</h1>
    <button onClick={test} className="rounded-xl bg-emerald-300 p-3 text-black">Test Connection</button>
    <p className="mt-4 break-words">{status}</p>
  </main>;
}
