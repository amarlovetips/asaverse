"use client";
import { useEffect, useState } from "react";

const stars = Array.from({ length: 42 }, (_, i) => ({
  left: (i * 47 + 11) % 100,
  top: (i * 31 + 7) % 100,
  size: i % 5 === 0 ? 3 : 2,
}));

export default function LoadingScreen({ message = "Preparing your universe..." }: { message?: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const value = Math.min(100, Math.round(((Date.now() - start) / 1800) * 100));
      setProgress(value);
      if (value >= 100) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#070817] px-6 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,#25205a_0%,#10152f_42%,#050713_100%)]" />
      {stars.map((star, i) => (
        <span key={i} className="absolute rounded-full bg-cyan-100 animate-pulse"
          style={{ left: `${star.left}%`, top: `${star.top}%`, width: star.size, height: star.size, animationDelay: `${i % 7}00ms` }} />
      ))}
      <div className="absolute left-[12%] top-[18%] h-16 w-16 rounded-full bg-purple-500/20 blur-xl" />
      <div className="absolute bottom-[18%] right-[12%] h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />

      <section className="relative z-10 w-full max-w-lg text-center">
        <p className="mb-5 text-xs tracking-[0.4em] text-cyan-300">WELCOME TO THE UNIVERSE</p>
        <h1 className="animate-pulse text-5xl font-black tracking-wider text-cyan-100 drop-shadow-[0_0_22px_rgba(34,211,238,0.65)] sm:text-7xl">
          AsaVerse
        </h1>
        <p className="mt-4 text-sm text-indigo-200">{message}</p>

        <div className="mt-16">
          <div className="mb-3 flex items-center justify-between text-xs font-bold tracking-widest">
            <span className="text-cyan-300">LOADING</span>
            <span className="text-cyan-100">{progress}%</span>
          </div>
          <div className="relative h-4 overflow-visible rounded-sm border border-cyan-400/60 bg-slate-900 shadow-[0_0_18px_rgba(34,211,238,0.15)]">
            <div className="h-full bg-gradient-to-r from-blue-600 via-cyan-300 to-emerald-200 transition-[width] duration-100"
              style={{ width: `${progress}%` }} />
            <svg className="absolute -top-7 h-8 w-8 transition-[left] duration-100"
              style={{ left: `calc(${progress}% - 16px)`, imageRendering: "pixelated" }}
              viewBox="0 0 16 16" shapeRendering="crispEdges" aria-label="Pixel alien running">
              <rect x="4" y="1" width="8" height="2" fill="#8cff83"/>
              <rect x="2" y="3" width="12" height="7" fill="#65e572"/>
              <rect x="4" y="5" width="2" height="2" fill="#071827"/>
              <rect x="10" y="5" width="2" height="2" fill="#071827"/>
              <rect x="5" y="10" width="2" height="3" fill="#65e572"/>
              <rect x="9" y="10" width="2" height="3" fill="#65e572"/>
              <rect x="2" y="13" width="4" height="2" fill="#8cff83"/>
              <rect x="10" y="13" width="4" height="2" fill="#8cff83"/>
            </svg>
          </div>
          <p className="mt-6 text-[10px] tracking-[0.3em] text-indigo-300">CONNECTING TO THE STARS...</p>
        </div>
      </section>
    </main>
  );
}
