"use client";

import BackDesignPicker, { type PublishedDesign } from "./BackDesignPicker";

const categories = ["body", "face", "hair", "facial-hair", "clothing", "outfit"];
const field = "w-full min-w-0 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-400";

type Props = {
  name: string;
  setName: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  side: "front" | "back";
  selectedId: string | null;
  onSelectBackDesign: (design: PublishedDesign) => void;
};

export default function DesignContextPanel(p: Props) {
  return <div className="flex min-w-0 items-center gap-1.5">
    {p.side === "front" ? <>
      <input value={p.name} onChange={e => p.setName(e.target.value)} className={`${field} w-32`} placeholder="Design name" aria-label="Design name"/>
      <select value={p.category} onChange={e => p.setCategory(e.target.value)} className={`${field} w-28 capitalize`} aria-label="Design category">
        {categories.map(category => <option key={category} value={category}>{category.replace("-", " ")}</option>)}
      </select>
    </> : <BackDesignPicker selectedId={p.selectedId} selectedCategory={p.category} onSelect={p.onSelectBackDesign}/>}
  </div>;
}



