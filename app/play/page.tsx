import RoninConnect from "@/components/RoninConnect";

export default function PlayPage() {
  return <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
    <a href="/" className="text-sm text-slate-400">← AsaVerse</a>
    <div className="text-center">
      <p className="mb-3 text-sm tracking-widest text-emerald-300">PLAYER ACCESS</p>
      <h1 className="text-4xl font-black">Enter AsaVerse</h1>
      <p className="mt-3 text-slate-400">Connect your Ronin Wallet to begin.</p>
    </div>
    <RoninConnect />
  </main>;
}
