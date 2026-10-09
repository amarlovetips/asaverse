"use client";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export default function RoninConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const wallet = connectors.find((item) => item.id === "injected");

  return (
    <div className="w-full max-w-md space-y-4">
      {isConnected ? <>
        <p className="break-all rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">Connected: {address}</p>
        <button onClick={() => disconnect()} className="w-full rounded-xl border p-3">Disconnect wallet</button>
      </> : <button disabled={!wallet || isPending} onClick={() => wallet && connect({ connector: wallet })} className="w-full rounded-xl bg-emerald-400 p-4 font-bold text-black disabled:opacity-50">
        {isPending ? "Connecting..." : "Connect Ronin Wallet"}
      </button>}
      {error && <p className="break-words text-sm text-red-400">{error.message}</p>}
    </div>
  );
}
