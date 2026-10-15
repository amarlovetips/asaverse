"use client";

type Props = { fill: string | null; border: string; active: "fill" | "border"; onFill: (color: string | null) => void; onBorder: (color: string) => void; onActive: (active: "fill" | "border") => void };

export default function FillBorderSwatches(p: Props) {
  return <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-[#0c121b] p-2.5">
    <div className="relative h-12 w-14 shrink-0">
      <label title="Fill color" className={`absolute left-0 top-0 z-10 grid h-9 w-9 cursor-pointer place-items-center rounded border-2 bg-slate-950 shadow-lg ${p.active === "fill" ? "border-white" : "border-slate-500"}`} onClick={() => p.onActive("fill")}>
        <span className="grid h-5 w-5 place-items-center rounded-sm border border-white/50 text-[9px] text-slate-200" style={{ backgroundColor: p.fill ?? "transparent", backgroundImage: p.fill ? undefined : "linear-gradient(45deg,#475569 25%,transparent 25%,transparent 75%,#475569 75%),linear-gradient(45deg,#475569 25%,transparent 25%,transparent 75%,#475569 75%)", backgroundPosition: p.fill ? undefined : "0 0,3px 3px", backgroundSize: p.fill ? undefined : "6px 6px" }}>{p.fill ? null : "-"}</span><input aria-label="Fill color" type="color" value={p.fill ?? "#171923"} onChange={e => {p.onFill(e.target.value);p.onActive("fill");}} className="absolute inset-0 h-full w-full cursor-pointer opacity-0"/>
      </label>
      <label title="Border color" className={`absolute bottom-0 right-0 grid h-8 w-8 cursor-pointer place-items-center rounded border-2 bg-slate-950 shadow-lg ${p.active === "border" ? "border-white" : "border-slate-500"}`} onClick={() => p.onActive("border")}>
        <span className="h-4 w-4 rounded-sm border border-white/50" style={{ backgroundColor: p.border }}/><input aria-label="Border color" type="color" value={p.border} onChange={e => {p.onBorder(e.target.value);p.onActive("border");}} className="absolute inset-0 h-full w-full cursor-pointer opacity-0"/>
      </label>
    </div>
    <div className="min-w-0 flex-1 text-xs"><p className="font-semibold text-slate-200">Fill &amp; Border</p><p className="mt-1 truncate text-[10px] text-slate-500">{p.active === "fill" ? (p.fill ? "Fill color active" : "Fill: None") : "Border color active"}</p></div>
    <div className="flex items-center gap-1"><button type="button" title="Set fill to None" aria-label="Set fill to None" aria-pressed={p.fill === null} onClick={() => {p.onFill(null);p.onActive("fill");}} className={`rounded px-1.5 py-1 text-[9px] ${p.fill === null ? "bg-cyan-500/20 text-cyan-200" : "bg-slate-800 text-slate-400"}`}>None</button><button type="button" title="Use border color" aria-label="Use border color" onClick={() => p.onActive("border")} className={`size-3 rounded-full ${p.active === "border" ? "bg-cyan-300 ring-2 ring-cyan-300/30" : "bg-slate-600"}`}/></div>
  </div>;
}
