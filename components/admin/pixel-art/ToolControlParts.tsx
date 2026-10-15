export function Title({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold text-cyan-200">{children}</h3>;
}

export function TextEditor(p: { text: string; scale: number; field: string; setText: (value: string) => void; setScale: (value: number) => void }) {
  return <div className="space-y-2"><input className={p.field} maxLength={10} value={p.text} onChange={e => p.setText(e.target.value)} aria-label="Pixel text" placeholder="Text"/>
    <label className="block text-[10px] text-slate-400">Pixel size <select className={`${p.field} mt-1`} value={p.scale} onChange={e => p.setScale(Number(e.target.value))} aria-label="Text pixel size">
      {[1, 2, 3, 4].map(scale => <option key={scale} value={scale}>{scale}×</option>)}</select></label></div>;
}

export function ToolCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-2 rounded-lg border border-slate-700 bg-[#0c121b] p-3 text-xs"><Title>{title}</Title><div className="text-slate-400">{children}</div></div>;
}

export function FillToggle({ filled, onToggle }: { filled: boolean; onToggle: () => void }) {
  return <button type="button" aria-pressed={filled} onClick={onToggle} className="w-full rounded-md border border-slate-700 px-2 py-1.5 text-left text-slate-300">{filled ? "● Filled shape" : "○ Outline only"}</button>;
}
