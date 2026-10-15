type Props = { value: number; onChange: (width: number) => void };

export default function StrokeWidthControl({ value, onChange }: Props) {
  return <label className="flex items-center justify-between rounded-lg border border-slate-700 bg-[#0c121b] px-3 py-2 text-xs text-slate-300">
    Stroke Width
    <select aria-label="Stroke width" value={value} onChange={event => onChange(Number(event.target.value))}
      className="rounded border border-slate-600 bg-slate-950 px-2 py-1 font-mono text-cyan-200">
      {[1, 2, 3, 4, 5].map(width => <option key={width} value={width}>{width}px</option>)}
    </select>
  </label>;
}
