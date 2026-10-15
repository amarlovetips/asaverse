export default function IdleCoordinateRulers({ size, axis }: { size: number; axis: "x" | "y" }) {
  const marks = Array.from({ length: size }, (_, index) => index);
  if (axis === "x") return <>
    <div className="relative h-6 w-full overflow-visible text-[8px] font-mono text-slate-300">
      <span className="absolute -left-5 top-1 font-bold text-cyan-300">X</span>
      {marks.map(value => <span key={value} className={"absolute top-1 -translate-x-1/2 " + (value % 10 === 0 ? "font-bold text-cyan-200" : "")}
        style={{ left: ((value + 0.5) / size * 100) + "%" }}>{value}</span>)}
    </div>
  </>;
  return <div className="relative h-full min-h-0 overflow-visible text-[8px] font-mono text-slate-300">
    <span className="absolute -left-0 -top-5 text-cyan-300">Y</span>
    {marks.map(value => <span key={value} className={"absolute right-1 -translate-y-1/2 " + (value % 10 === 0 ? "font-bold text-cyan-200" : "")}
      style={{ top: ((value + 0.5) / size * 100) + "%" }}>{value}</span>)}
  </div>;
}
