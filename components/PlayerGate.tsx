"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/game-types";
import RoninConnect from "./RoninConnect";
import ProfileForm from "./ProfileForm";
import CharacterSheet from "./CharacterSheet";

type Login = { address: string; userId: string };
export default function PlayerGate() {
  const [login, setLogin] = useState<Login | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState("");
  async function loggedIn(v: Login) {
    setLogin(v); setProfile(null); setStatus("Checking profile...");
    const { data, error } = await createClient().from("profiles")
      .select("*").ilike("wallet_address", v.address).maybeSingle();
    setStatus(error ? error.message : "");
    if (!error) setProfile(data as Profile | null);
  }
  if (profile) return <CharacterSheet profile={profile} />;
  return <main className="flex min-h-screen flex-col items-center gap-8 p-8 pt-16">
    <header className="text-center"><p className="text-sm tracking-widest text-emerald-300">PLAYER ACCESS</p><h1 className="mt-3 text-4xl font-black">Enter AsaVerse</h1></header>
    <RoninConnect onLogin={loggedIn} onLogout={() => { setLogin(null); setProfile(null); }} />
    {status && <p className="text-sm text-amber-300">{status}</p>}
    {login && !status && <ProfileForm wallet={login.address} userId={login.userId} onSaved={setProfile} />}
  </main>;
}
