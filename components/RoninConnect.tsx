"use client";
import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, type Connector } from "wagmi";
import { createClient } from "@/lib/supabase";
import WalletPicker from "./WalletPicker";

type Login = { address: string; userId: string };
export default function RoninConnect({ onLogin, onLogout, onRestoreReady }: { onLogin:(v:Login)=>void; onLogout:()=>void; onRestoreReady:(ready:boolean)=>void }) {
  const [ready,R]=useState(false),[open,O]=useState(false),[busy,B]=useState(false),[msg,M]=useState("");
  const autoAttempted = useRef(false);
  const {address,isConnected,connector:active,status:accountStatus}=useAccount();
  const {connectAsync,connectors,isPending,error}=useConnect();
  const {disconnect}=useDisconnect();
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>R(true),[]);
  async function login(c: Connector) {
    B(true); M("");
    try {
      if (isConnected && active?.uid !== c.uid)
        throw Error("Disconnect the current wallet first.");

      const v = isConnected
        ? { accounts: [address!] }
        : await connectAsync({ connector: c });

      const wallet = v.accounts[0];
      const db = createClient();
      const { data: { session } } = await db.auth.getSession();
      const savedWallet = localStorage.getItem("asaverse.wallet");
      let started = Number(localStorage.getItem("asaverse.loginAt") || 0);

      if (session && savedWallet?.toLowerCase() === wallet.toLowerCase()) {
        if (!started) {
          started = Date.now();
          localStorage.setItem("asaverse.loginAt", String(started));
        }

        let { data: profile, error } = await db.from("profiles")
          .select("wallet_address")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!profile && !error) {
          const fallback = await db.from("profiles")
            .select("wallet_address")
            .ilike("wallet_address", wallet)
            .maybeSingle();
          profile = fallback.data;
          error = fallback.error;
        }

        if (error) throw error;

        if (profile?.wallet_address?.toLowerCase() === wallet.toLowerCase()) {
          onLogin({ address: wallet, userId: session.user.id });
          O(false);
          return;
        }
      }

      const { data, error } = await db.auth.signInWithWeb3({
        chain: "ethereum",
        statement: "Sign in to AsaVerse.",
        wallet: await c.getProvider() as never
      });

      if (error || !data.user) throw error ?? Error("Login failed");
      localStorage.setItem("asaverse.loginAt", String(Date.now()));
      localStorage.setItem("asaverse.wallet", wallet);
      onLogin({ address: wallet, userId: data.user.id });
      O(false);
    } catch (e) {
      M(e instanceof Error ? e.message : "Login failed");
    } finally {
      B(false);
    }
  }

  useEffect(() => {
    if (!ready || accountStatus === "reconnecting" || accountStatus === "connecting") return;

    const saved = localStorage.getItem("asaverse.wallet");

    if (!isConnected || !active) {
      if (!saved) {
        onRestoreReady(true);
        return;
      }

      const timer = window.setTimeout(() => onRestoreReady(true), 15000);
      return () => window.clearTimeout(timer);
    }

    if (autoAttempted.current) return;

    if (!saved || saved.toLowerCase() !== address?.toLowerCase()) {
      onRestoreReady(true);
      return;
    }

    autoAttempted.current = true;
    onRestoreReady(false);
    queueMicrotask(() => {
      void login(active).finally(() => onRestoreReady(true));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, accountStatus, isConnected, active, address, onRestoreReady]);
  async function logout() {
    await createClient().auth.signOut();
    localStorage.removeItem("asaverse.loginAt"); localStorage.removeItem("asaverse.wallet");
    disconnect(); onLogout();
  }
  if(!ready) return <div className="h-14 rounded-xl bg-slate-800"/>;
  return <div className="w-full max-w-md space-y-3">
    {isConnected&&<p className="break-all rounded-xl border p-3 text-sm">{address}</p>}
    <button onClick={()=>O(true)} className="w-full rounded-xl bg-emerald-300 p-4 font-bold text-black">Connect Wallet</button>
    {isConnected&&<button onClick={()=>void logout()} className="w-full rounded-xl border p-3">Disconnect</button>}
    {(msg||error)&&<p className="break-words text-sm text-rose-300">{msg||error?.message}</p>}
    <WalletPicker open={open} onClose={()=>O(false)} connectors={connectors} onConnect={c=>void login(c)} pending={busy||isPending} error={msg}/>
  </div>;
}
