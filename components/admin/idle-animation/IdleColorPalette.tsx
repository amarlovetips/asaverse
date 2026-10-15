type Props = {
  colors: string[];
  selectedColor: string;
  onSelect: (color: string) => void;
};

export default function IdleColorPalette({ colors, selectedColor, onSelect }: Props) {
  return <div className="flex min-w-0 flex-wrap items-center gap-1" role="group" aria-label="Colors used in the design">
    {colors.map(color => <button key={color} type="button" title={color} aria-label={`Choose ${color}`}
      aria-pressed={selectedColor.toLowerCase() === color.toLowerCase()} onClick={() => onSelect(color)}
      className={`size-5 shrink-0 rounded-sm border ${selectedColor.toLowerCase() === color.toLowerCase() ? "border-white ring-1 ring-cyan-400" : "border-slate-600 hover:border-slate-300"}`}
      style={{ backgroundColor: color }} />)}
  </div>;
}
