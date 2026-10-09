"use client";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ronin } from "@/lib/ronin";
import WalletPicker from "@/components/WalletPicker";

type Network = 2020 | 202601;
export default function RoninConnect() {
  const [ready, setReady] = useState(false), [open, setOpen] = useState(false);
  const [network, setNetwork] = useState<Network>(ronin.id as Network);
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, error: switchError, isPending: switching } = useSwitchChain();
  useEffect(() => setReady(true), []);
  useEffect(() => { if (isConnected) setOpen(false); }, [isConnected]);
  if (!ready) return <div className="h-14 w-full max-w-md rounded-xl bg-slate-800" />;
  const chooseNetwork = (id: Network) => {
    setNetwork(id);
    if (isConnected && chainId !== id) switchChain({ chainId: id });
  };
  return <div className="w-full max-w-md space-y-3">
    {isConnected && <p className="break-all rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4 text-sm">{address}<small className="mt-2 block text-emerald-200">{chainId === 202601 ? "Saigon Testnet" : chainId === 2020 ? "Ronin Mainnet" : `Chain ${chainId}`}</small></p>}
    <button onClick={() => setOpen(true)} className="w-full rounded-xl bg-emerald-300 p-4 font-bold text-[#07111b] hover:bg-emerald-200">{isConnected ? "Wallet & Network" : "Connect Wallet"}</button>
    {isConnected && <button onClick={() => disconnect()} className="w-full rounded-xl border border-white/10 p-3 text-slate-300">Disconnect</button>}
    {(switching || switchError) && <p className="text-sm text-rose-300">{switchError?.message ?? "Switching network…"}</p>}
    <WalletPicker open={open} onClose={() => setOpen(false)} connectors={connectors} chainId={network} onNetworkChange={chooseNetwork} onConnect={c => connect({ connector: c, chainId: network })} pending={isPending} error={error?.message} />
  </div>;
}
