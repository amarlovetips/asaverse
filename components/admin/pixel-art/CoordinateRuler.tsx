type Props = { size: number; zoom: number };

export default function CoordinateRuler({ size, zoom }: Props) {
  const marks = Array.from({ length: size }, (_, index) => index).filter(index => index % 4 === 0 || index === size - 1);
  return <div className="pointer-events-none absolute left-8 top-0 z-20 font-mono text-[11px] font-bold text-slate-200" style={{ width: size * zoom }}>
    <div className="relative h-7 border-b border-cyan-500/40 bg-slate-900/90">
      <span className="absolute -left-7 top-1 text-[10px] font-black text-cyan-300">X</span>
      {marks.map(value => <span key={value} className="absolute top-1 -translate-x-1/2" style={{ left: value * zoom }}>{value}</span>)}
    </div>
    <div className="absolute -left-8 top-7 w-7 border-r border-cyan-500/40 bg-slate-900/90 text-center" style={{ height: size * zoom }}>
      <span className="absolute -top-6 left-2 text-[10px] font-black text-cyan-300">Y</span>
      {marks.map(value => <span key={value} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: value * zoom }}>{value}</span>)}
    </div>
  </div>;
}
