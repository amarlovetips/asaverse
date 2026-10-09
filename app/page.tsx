import Link from "next/link";

export default function Home() {
  return <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
    <p className="text-sm tracking-[0.4em] text-emerald-300">A NEW WORLD AWAITS</p>
    <h1 className="text-6xl font-black">AsaVerse</h1>
    <p className="text-slate-400">Enter. Explore. Become.</p>
    <Link href="/play" className="rounded-xl bg-emerald-400 px-8 py-4 font-bold text-black">Enter World</Link>
  </main>;
}
