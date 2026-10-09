"use client";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, type Connector } from "wagmi";
import { createClient } from "@/lib/supabase";
import WalletPicker from "./WalletPicker";

type Login = { address: string; userId: string };
export default function RoninConnect({ onLogin, onLogout }: { onLogin:(v:Login)=>void; onLogout:()=>void }) {
  const [ready,R]=useState(false),[open,O]=useState(false),[busy,B]=useState(false),[msg,M]=useState("");
  const {address,isConnected,connector:active}=useAccount();
  const {connectAsync,connectors,isPending,error}=useConnect();
  const {disconnect}=useDisconnect();
  useEffect(()=>R(true),[]);
  async function login(c:Connector) {
    B(true); M("");
    try {
      if(isConnected&&active?.uid!==c.uid) throw Error("Disconnect the current wallet first.");
      const v=isConnected?{accounts:[address!]}:await connectAsync({connector:c});
      const {data,error}=await createClient().auth.signInWithWeb3({chain:"ethereum",statement:"Sign in to AsaVerse.",wallet:await c.getProvider() as never});
      if(error||!data.user) throw error??Error("Login failed");
      localStorage.setItem("asaverse.loginAt",String(Date.now()));
      localStorage.setItem("asaverse.wallet",v.accounts[0]);
      onLogin({address:v.accounts[0],userId:data.user.id}); O(false);
    } catch(e) { M(e instanceof Error?e.message:"Login failed"); }
    finally { B(false); }
  }
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
