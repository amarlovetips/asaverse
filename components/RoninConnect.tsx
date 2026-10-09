"use client";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export default function RoninConnect() {
  const [ready, setReady] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  useEffect(() => setReady(true), []);
  const wallet = connectors.find((c) => c.id === "injected");

  if (!ready) return <div className="h-14 w-full max-w-md animate-pulse rounded-xl bg-slate-800" />;
  return <div className="w-full max-w-md space-y-4">
    {isConnected ? <>
      <p className="break-all rounded-xl border p-4">Connected: {address}</p>
      <button onClick={() => disconnect()}>Disconnect</button>
    </> : <button disabled={Boolean(!wallet || isPending)}
      onClick={() => wallet && connect({ connector: wallet })}
      className="w-full rounded-xl bg-emerald-400 p-4 font-bold text-black disabled:opacity-50">
      {isPending ? "Connecting..." : "Connect Ronin Wallet"}
    </button>}
    {error && <p className="break-words text-sm text-red-400">{error.message}</p>}
  </div>;
}
