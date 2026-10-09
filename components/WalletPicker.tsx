"use client";
import type { Connector } from "wagmi";
type Network = 2020 | 202601;
type Props = { open: boolean; onClose: () => void; connectors: readonly Connector[];
  chainId: Network; onNetworkChange: (id: Network) => void;
  onConnect: (c: Connector) => void; pending: boolean; error?: string };
const installs = [
  ["Ronin", "https://wallet.roninchain.com/"],
  ["MetaMask", "https://metamask.io/download/"],
  ["Rabby", "https://rabby.io/"], ["OKX", "https://web3.okx.com/"],
  ["Trust", "https://trustwallet.com/download"],
  ["Coinbase", "https://www.coinbase.com/wallet/downloads"],
  ["Brave", "https://brave.com/wallet/"], ["Bitget", "https://web3.bitget.com/"],
];
export default function WalletPicker(p: Props) {
  if (!p.open) return null;
  const found = p.connectors.filter(c => c.name !== "Injected");
  const wallets = found.length ? found : p.connectors;
  return <div onClick={p.onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
    <section onClick={e => e.stopPropagation()} className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0b1224] p-6 shadow-2xl shadow-emerald-950/40">
      <header className="mb-6 flex items-center justify-between"><div><p className="text-xs tracking-[.3em] text-emerald-300">ASAVERSE / WEB3</p><h2 className="mt-2 text-2xl font-bold">Connect a wallet</h2></div><button onClick={p.onClose} className="rounded-xl border border-white/10 px-3 py-2 text-slate-300">✕</button></header>
      <p className="mb-2 text-sm text-slate-400">Choose network</p>
      <div className="mb-6 grid grid-cols-2 gap-3">
        {([[2020, "Ronin Mainnet"], [202601, "Saigon Testnet"]] as const).map(([id, name]) => <button key={id} onClick={() => p.onNetworkChange(id)} className={`rounded-xl border p-3 text-sm font-semibold ${p.chainId === id ? "border-emerald-300 bg-emerald-300/10 text-emerald-200" : "border-white/10 text-slate-300"}`}>{name}</button>)}
      </div>
      <p className="mb-3 text-sm text-slate-400">Detected browser wallets</p>
      {!wallets.length ? <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">No wallet detected. Install an EVM wallet below, then refresh.</p> :
      <div className="grid gap-3 sm:grid-cols-2">{wallets.map(c => <button key={c.uid} onClick={() => p.onConnect(c)} disabled={p.pending} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-left transition hover:border-emerald-300/60 hover:bg-emerald-300/[.06] disabled:opacity-50"><span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-300/20 to-cyan-400/10 text-lg font-bold text-emerald-200">{c.name[0]}</span><span className="min-w-0 flex-1"><b className="block">{c.name === "Injected" ? "Browser Wallet" : c.name}</b><small className="text-slate-400">{p.pending ? "Waiting for wallet…" : "EVM compatible"}</small></span><span className="text-emerald-300">↗</span></button>)}</div>}
      {p.error && <p className="mt-4 break-words text-sm text-rose-300">{p.error}</p>}
      <div className="mt-6 border-t border-white/10 pt-4"><p className="mb-3 text-xs uppercase tracking-widest text-slate-500">Get a wallet extension</p><div className="flex flex-wrap gap-2">{installs.map(([name, url]) => <a key={name} href={url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:border-emerald-300/50">{name} ↗</a>)}</div></div>
    </section>
  </div>;
}
