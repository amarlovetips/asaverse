"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/game-types";
import RoninConnect from "./RoninConnect";
import ProfileForm from "./ProfileForm";
import CharacterSheet from "./CharacterSheet";
import WorldScene from "./WorldScene";
import LoadingScreen from "./LoadingScreen";

type Login = { address: string; userId: string };

export default function PlayerGate() {
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [login, setLogin] = useState<Login | null>(null);
  const [status, setStatus] = useState("");
  const [entering, setEntering] = useState(false);
  const [inWorld, setInWorld] = useState(false);
  const [worldReady, setWorldReady] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    const db = createClient();

    async function restore() {
      try {
        const { data: { session } } = await db.auth.getSession();
        if (!alive) return;

        if (session) {
          const wallet = localStorage.getItem("asaverse.wallet");
          let { data, error } = await db.from("profiles").select("*")
            .eq("id", session.user.id).maybeSingle();

          if (!data && !error && wallet) {
            const r = await db.from("profiles").select("*")
              .ilike("wallet_address", wallet).maybeSingle();
            data = r.data;
            error = r.error;
          }

          if (error) throw error;
          if (data && alive) {
            setProfile(data as Profile);
            setLogin({ address: data.wallet_address, userId: session.user.id });
          }
        }
      } catch (e) {
        if (alive) setStatus(e instanceof Error ? e.message : "Session restore failed");
      } finally {
        if (alive) setChecking(false);
      }
    }

    void restore();
    return () => { alive = false; };
  }, [restoreAttempt]);

  async function loggedIn(v: Login) {
    setChecking(true);
    setStatus("");
    try {
      const db = createClient();
      let { data, error } = await db.from("profiles").select("*")
        .eq("id", v.userId).maybeSingle();

      if (!data && !error) {
        const r = await db.from("profiles").select("*")
          .ilike("wallet_address", v.address).maybeSingle();
        data = r.data;
        error = r.error;
      }

      if (error) throw error;
      if (!data) throw Error("Profile not found. Please reconnect your wallet.");

      setLogin(v);
      setProfile(data as Profile);
      setStatus("");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Profile check failed");
    } finally {
      setChecking(false);
    }
  }

  if (checking) return <LoadingScreen message="Restoring player session..." />;

  if (profile && (entering || inWorld)) {
    return <>
      <WorldScene onReady={() => {
        setWorldReady(true);
        setInWorld(true);
        setEntering(false);
      }} />
      {entering && !worldReady && <div className="fixed inset-0 z-50">
        <LoadingScreen message="Loading world..." />
      </div>}
    </>;
  }

  if (profile) return <CharacterSheet profile={profile} onEnter={() => {
    setWorldReady(false);
    setEntering(true);
  }} />;

  return <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
    <header className="text-center">
      <p className="text-sm tracking-widest text-emerald-300">PLAYER ACCESS</p>
      <h1 className="mt-3 text-4xl font-black">Enter AsaVerse</h1>
    </header>
    <RoninConnect onLogin={loggedIn} onRestoreReady={() => {}} onLogout={() => {
      setLogin(null);
      setProfile(null);
      setStatus("");
    }} />
    {status && <div className="grid max-w-md gap-3 text-center">
      <p className="break-words text-sm text-amber-300">{status}</p>
      <button onClick={() => {
        setStatus("");
        setChecking(true);
        setRestoreAttempt(attempt => attempt + 1);
      }} className="rounded-xl border border-amber-700 px-4 py-2 text-sm text-amber-200">
        Retry session restore
      </button>
    </div>}
    {login && !status && <ProfileForm wallet={login.address} userId={login.userId} onSaved={setProfile} />}
  </main>;
}
