"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/game-types";
import RoninConnect from "./RoninConnect";
import ProfileForm from "./ProfileForm";
import CharacterSheet from "./CharacterSheet";
import WorldScene from "./WorldScene";
import LoadingScreen from "./LoadingScreen";

type Login = { address: string; userId: string };
const DAY = 24 * 60 * 60 * 1000;

export default function PlayerGate() {
  const params = useSearchParams(), world = params.has("world");
  const [login, L] = useState<Login | null>(null);
  const [profile, P] = useState<Profile | null>(null);
  const [status, S] = useState("");
  const [restoring, R] = useState(true);

  useEffect(() => {
    let live = true;
    async function restore() {
      const db = createClient();
      try {
        const { data: { session } } = await db.auth.getSession();
        if (!live) return;
        if (!session) return;

        let started = Number(localStorage.getItem("asaverse.loginAt") || 0);
        if (!started) {
          started = Date.now();
          localStorage.setItem("asaverse.loginAt", String(started));
        }

        if (Date.now() - started >= DAY) {
          await db.auth.signOut();
          localStorage.removeItem("asaverse.loginAt");
          localStorage.removeItem("asaverse.wallet");
          return;
        }

        const { data, error } = await db.from("profiles")
          .select("*").eq("id", session.user.id).maybeSingle();
        if (!live) return;

        if (error) {
          S(error.message);
          return;
        }
        if (data) {
          const p = data as Profile;
          P(p);
          L({ address: p.wallet_address, userId: session.user.id });
          localStorage.setItem("asaverse.wallet", p.wallet_address);
        } else {
          S("Profile not found. Please connect your wallet.");
        }
      } catch (e) {
        if (live) S(e instanceof Error ? e.message : "Session restore failed");
      } finally {
        if (live) R(false);
      }
    }
    void restore();
    return () => { live = false; };
  }, []);

  async function loggedIn(v: Login) {
    L(v); P(null); S("Checking profile...");
    const { data, error } = await createClient().from("profiles")
      .select("*").eq("id", v.userId).maybeSingle();
    if (error) {
      S(error.message); L(null); P(null);
    } else if (data) {
      P(data as Profile); S("");
    } else {
      L(null); P(null); S("Profile not found. Please reconnect your wallet.");
    }
  }

  if (restoring) return <LoadingScreen message="Restoring player session..." />;
  if (world && profile) return <WorldScene />;
  if (profile) return <CharacterSheet profile={profile} />;

  return <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
    <header className="text-center">
      <p className="text-sm tracking-widest text-emerald-300">PLAYER ACCESS</p>
      <h1 className="mt-3 text-4xl font-black">Enter AsaVerse</h1>
    </header>
    <RoninConnect onLogin={loggedIn} onLogout={() => { L(null); P(null); }} />
    {status && <p className="break-words text-sm text-amber-300">{status}</p>}
    {login && !status && <ProfileForm wallet={login.address} userId={login.userId} onSaved={P} />}
  </main>;
}

