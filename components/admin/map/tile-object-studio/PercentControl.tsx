"use client";

import { useEffect, useRef } from "react";

type Props = { label: string; value: number; min: number; max: number; onChange: (value: number) => void };

function formatPercent(value: number) {
  return (value * 100).toFixed(1).replace(/\.0$/, "");
}

export default function PercentControl({ label, value, min, max, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const minPercent = min * 100;
  const maxPercent = max * 100;

  useEffect(() => {
    if (input.current !== document.activeElement && input.current) input.current.value = formatPercent(value);
  }, [value]);

  function update(raw: string) {
    if (!raw) return;
    const next = Number(raw);
    if (Number.isFinite(next) && next >= minPercent && next <= maxPercent &&
      Number.isInteger((next - minPercent) * 2)) onChange(next / 100);
  }

  function commit() {
    const raw = input.current?.value ?? "";
    if (!raw.trim() || !Number.isFinite(Number(raw))) {
      if (input.current) input.current.value = formatPercent(value);
      return;
    }
    const bounded = Math.max(minPercent, Math.min(maxPercent, Number(raw)));
    const snapped = minPercent + Math.round((bounded - minPercent) * 2) / 2;
    onChange(Number(snapped.toFixed(1)) / 100);
    if (input.current) input.current.value = formatPercent(snapped / 100);
  }

  return <label className="grid grid-cols-[1fr_5rem] items-center gap-2 text-[10px] text-slate-400">
    <span>{label}<input type="range" min={minPercent} max={maxPercent} step="0.5" value={value * 100}
      onChange={event => { const next = Number(event.target.value) / 100; onChange(next); if (input.current !== document.activeElement && input.current) input.current.value = formatPercent(next); }}
      className="mt-1 w-full accent-cyan-400"/></span>
    <span className="flex items-center gap-1"><input type="number" min={minPercent} max={maxPercent} step="0.5"
      ref={input} defaultValue={formatPercent(value)} onBlur={commit}
      onChange={event => update(event.target.value)} aria-label={`${label} percentage`}
      className="w-full rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-right font-mono text-slate-200"/><span>%</span></span>
  </label>;
}



