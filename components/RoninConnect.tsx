"use client";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, type Connector } from "wagmi";
import { createClient } from "@/lib/supabase";
import WalletPicker from "./WalletPicker";

type Login = { address: string; userId: string };
export default function RoninConnect({ onLogin, onLogout }: {
  onLogin: (v: Login) => void; onLogout: () => void;
}) {
  const [ready, setReady] = useState(false), [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const { address, isConnected, connector: active } = useAccount();
  const { connectAsync, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  useEffect(() => setReady(true), []);
  async function login(c: Connector) {
    setBusy(true); setMsg("");
    try {
      if (isConnected && active?.uid !== c.uid) throw Error("Disconnect the current wallet first.");
      const v = isConnected ? { accounts: [address!] } : await connectAsync({ connector: c });
      const wallet = await c.getProvider();
      const { data, error } = await createClient().auth.signInWithWeb3({
        chain: "ethereum", statement: "Sign in to AsaVerse.", wallet: wallet as never,
      });
      if (error || !data.user) throw error ?? Error("Login failed");
      onLogin({ address: v.accounts[0], userId: data.user.id }); setOpen(false);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Login failed"); }
    finally { setBusy(false); }
  }
  async function logout() { await createClient().auth.signOut(); disconnect(); onLogout(); }
  if (!ready) return <div className="h-14 rounded-xl bg-slate-800" />;
  return <div className="w-full max-w-md space-y-3">
    {isConnected && <p className="break-all rounded-xl border p-3 text-sm">{address}</p>}
    <button onClick={() => { setMsg(""); setOpen(true); }} className="w-full rounded-xl bg-emerald-300 p-4 font-bold text-black">{isConnected ? "Wallet Connected" : "Connect Wallet"}</button>
    {isConnected && <button onClick={logout} className="w-full rounded-xl border p-3">Disconnect</button>}
    {(msg || (!isConnected && error)) && <p className="break-words text-sm text-rose-300">{msg || error?.message}</p>}
    <WalletPicker open={open} onClose={() => setOpen(false)} connectors={connectors} onConnect={c => void login(c)} pending={busy || isPending} error={msg} />
  </div>;
}
