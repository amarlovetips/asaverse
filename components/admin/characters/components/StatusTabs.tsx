"use client";
type Props = { value: string; onChange: (value: string) => void };
const tabs = [["published", "Published"], ["draft", "Unpublished"]];
export default function StatusTabs({ value, onChange }: Props) {
  return <div className="flex gap-2 border-b border-slate-700 pb-2">
    {tabs.map(([id, label]) => <button key={id}
      onClick={() => onChange(id)}
      className={`rounded-md px-4 py-2 text-xs ${value === id ? "bg-emerald-700 text-white" : "bg-slate-800 text-slate-300"}`}>
      {label}
    </button>)}
  </div>;
}
