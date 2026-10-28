"use client";
type Props = { value: string; onChange: (value: string) => void };
const tabs = [
  ["all", "All"], ["face", "Face"], ["body", "Body"],
  ["clothing", "Clothing"], ["facial-hair", "Facial Hair"], ["hair", "Hair"]
];
export default function CategoryTabs({ value, onChange }: Props) {
  return <div className="flex flex-wrap gap-2">
    {tabs.map(([id, label]) => <button key={id}
      onClick={() => onChange(id)}
      className={`rounded-lg px-3 py-2 text-xs ${value === id ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-300"}`}>
      {label}
    </button>)}
  </div>;
}
