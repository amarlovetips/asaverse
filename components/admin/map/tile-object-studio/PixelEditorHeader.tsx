"use client";

import { Grid2X2, Minus, Plus, RotateCcw } from "lucide-react";
import type { usePixelArtEditorController } from "./usePixelArtEditorController";
import FilterToolbarControls from "./FilterToolbarControls";
import ArtboardSizeSelector from "./ArtboardSizeSelector";

type Props = { vm: ReturnType<typeof usePixelArtEditorController> };

const DEFAULT_CATEGORIES = ['tiles', 'object', 'tree', 'water', 'stone', 'terrain', 'decoration', 'buildings', 'others'];

export default function PixelEditorHeader({ vm }: Props) {
  const { s } = vm;
  const categories = DEFAULT_CATEGORIES.includes(s.category)
    ? DEFAULT_CATEGORIES
    : [s.category, ...DEFAULT_CATEGORIES];

  const handleStartNew = () => {
    s.setActiveDesignId(null);
    s.setName("");
    s.setPixels({});
    window.history.pushState(null, "", "/admin/map-tools/tiles-and-objects");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-800/80 bg-[#0d141e] px-3 py-2">
      <input
        value={s.name}
        onChange={(e) => s.setName(e.target.value)}
        placeholder="Tile or object name"
        aria-label="Tile or object name"
        className="w-44 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs outline-none focus:border-cyan-400"
      />
      <select
        value={s.category}
        onChange={(e) => s.setPart(e.target.value)}
        aria-label="Tile or object category"
        className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs outline-none focus:border-cyan-400 capitalize"
      >
        {categories.map((category) => (
          <option key={category} value={category} className="capitalize">
            {category}
          </option>
        ))}
      </select>

      {/* Editing Existing Design Badge (Task 4) */}
      {s.activeDesignId ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-xs">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-semibold text-amber-300">Editing Existing Design</span>
          <button
            type="button"
            onClick={handleStartNew}
            className="ml-1 rounded border border-amber-500/40 bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-amber-200 hover:bg-amber-950/60"
            title="Switch to creating a new design"
          >
            + New
          </button>
        </div>
      ) : null}

      <ArtboardSizeSelector width={s.size} height={s.height} onPreset={s.setSize} onCustom={s.setArtboardSize} />
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => s.setZoom(Math.max(4, s.zoom - 2))}
        className="grid size-7 place-items-center rounded border border-slate-700 bg-slate-900"
      >
        <Minus size={13} />
      </button>
      <span className="w-10 text-center font-mono text-[10px] text-slate-400">{Math.round((s.zoom / 12) * 100)}%</span>
      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => s.setZoom(Math.min(32, s.zoom + 2))}
        className="grid size-7 place-items-center rounded border border-slate-700 bg-slate-900"
      >
        <Plus size={13} />
      </button>
      <button
        type="button"
        aria-label="Reset zoom"
        onClick={() => s.setZoom(12)}
        className="grid size-7 place-items-center rounded border border-slate-700 bg-slate-900"
      >
        <RotateCcw size={12} />
      </button>
      <button
        type="button"
        aria-pressed={s.guide}
        aria-label="Toggle guides"
        onClick={() => s.setGuide((v) => !v)}
        className="grid size-7 place-items-center rounded border border-slate-700 bg-slate-900"
      >
        <Grid2X2 size={13} />
      </button>
      {s.tool === "filter" && <FilterToolbarControls value={vm.filter} onChange={vm.setFilter} onApply={() => s.applyFilter(vm.filter)} />}
      <span className="ml-auto font-mono text-[10px] text-slate-500">
        X {s.xy.split(", ")[0]} &middot; Y {s.xy.split(", ")[1]}
      </span>
    </div>
  );
}
