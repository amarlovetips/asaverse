"use client";
import type { Connector } from "wagmi";

type Props = {
  open: boolean; onClose: () => void;
  connectors: readonly Connector[];
  onConnect: (c: Connector) => void;
  pending: boolean; error?: string;
};

export default function WalletPicker(p: Props) {
  if (!p.open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b1224] p-6">
      <header className="mb-6 flex justify-between">
        <h2 className="text-2xl font-bold">Connect Wallet</h2>
        <button onClick={p.onClose}>✕</button>
      </header>
      <div className="space-y-3">
        {p.connectors.map(c => <button key={c.uid}
          disabled={p.pending}
          onClick={() => p.onConnect(c)}
          className="flex w-full items-center gap-4 rounded-xl border border-white/10 p-4 text-left hover:border-emerald-300">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-300/10 text-lg text-emerald-300">{c.name[0]}</span>
          <span className="font-semibold">{c.name}</span>
          <span className="ml-auto text-emerald-300">→</span>
        </button>)}
        {!p.connectors.length && <p className="text-sm text-slate-400">No wallet detected.</p>}
      </div>
      {p.error && <p className="mt-4 break-words text-sm text-rose-300">{p.error}</p>}
    </section>
  </div>;
}
