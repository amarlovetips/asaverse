"use client";

import { useMemo, useState } from "react";
import type { AssetRecord } from "../lib/supabaseAssets";
import { getAssetDataUrl } from "../lib/assetRenderer";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  assets: AssetRecord[];
  isLoading: boolean;
  error: string | null;
  onSelectAsset: (asset: AssetRecord | null) => void;
  selectedAssetId: string | null;
  onRefresh: () => void;
};

export default function AssetPickerModal({
  isOpen,
  onClose,
  assets,
  isLoading,
  error,
  onSelectAsset,
  selectedAssetId,
  onRefresh,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Extract categories dynamically from actual saved assets
  const categories = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((a) => {
      if (a.category) set.add(a.category.toLowerCase());
    });
    return Array.from(set).sort();
  }, [assets]);

  // Filter assets by category and search query
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchCat =
        selectedCategory === "all" ||
        asset.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !search.trim() ||
        asset.name.toLowerCase().includes(search.toLowerCase()) ||
        asset.category.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [assets, selectedCategory, search]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tiles and Objects"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] max-h-[680px] w-full max-w-4xl flex-col rounded-2xl border border-slate-700 bg-[#0f172a] text-slate-100 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Tiles &amp; Objects Library</h2>
              <p className="text-xs text-slate-400">
                Choose a saved asset from your database to place on the map
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh assets"
              className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:border-slate-600 hover:text-white transition"
            >
              <svg className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Toolbar: Categories + Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/50 px-6 py-3">
          {/* Dynamic Categories */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                selectedCategory === "all"
                  ? "bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
              }`}
            >
              All ({assets.length})
            </button>
            {categories.map((cat) => {
              const count = assets.filter((a) => a.category.toLowerCase() === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`capitalize rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    selectedCategory === cat
                      ? "bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20"
                      : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative min-w-[200px]">
            <input
              type="text"
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-1.5 pl-8 text-xs text-slate-200 outline-none focus:border-cyan-500"
            />
            <svg
              className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Content: Grid or Empty / Error */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
              <svg className="h-8 w-8 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-sm">Loading saved tiles and objects...</p>
            </div>
          ) : error ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-950/20 p-6 text-center text-red-300">
              <p className="text-sm font-semibold">Error loading assets</p>
              <p className="text-xs text-red-400/80">{error}</p>
              <button
                type="button"
                onClick={onRefresh}
                className="mt-3 rounded-lg border border-red-500/50 bg-red-500/20 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/30"
              >
                Try Again
              </button>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-slate-400">
              <div className="rounded-full bg-slate-800/80 p-4 text-slate-500">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-300">
                {assets.length === 0
                  ? "No saved tiles or objects found"
                  : "No assets match your search"}
              </p>
              <p className="max-w-md text-xs text-slate-400">
                {assets.length === 0
                  ? "Save your custom tiles or objects in Map Tools → Tiles & Objects, and they will immediately appear here ready to place."
                  : "Try clearing your search query or selecting another category."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {/* None Option: Clears active asset */}
              <button
                type="button"
                onClick={() => {
                  onSelectAsset(null);
                  onClose();
                }}
                className={`group relative flex flex-col items-center rounded-xl border p-3 text-left transition ${
                  selectedAssetId === null
                    ? "border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-400/50"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/80"
                }`}
              >
                <div className="relative flex h-24 w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-[#070b13] border border-slate-800/60 text-slate-500 group-hover:text-cyan-400">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span className="mt-1 text-[11px] font-semibold">None</span>
                </div>
                <div className="mt-2.5 w-full">
                  <div className="truncate text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                    None (Deselect)
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400">
                    No active tile
                  </div>
                </div>
                {selectedAssetId === null && (
                  <span className="absolute right-2 top-2 rounded-full bg-cyan-500 p-1 text-slate-950">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>

              {filteredAssets.map((asset) => {
                const isSelected = selectedAssetId === asset.id;
                const dataUrl = getAssetDataUrl(asset);
                const pixelCount = Object.keys(asset.pixel_data || {}).length;

                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      onSelectAsset(asset);
                      onClose();
                    }}
                    className={`group relative flex flex-col items-center rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-400/50"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/80"
                    }`}
                  >
                    {/* Preview box */}
                    <div className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-lg bg-[#070b13] border border-slate-800/60">
                      {/* Subtle checker pattern for transparency */}
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{
                          backgroundImage:
                            "linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)",
                          backgroundSize: "8px 8px",
                          backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
                        }}
                      />
                      {dataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={dataUrl}
                          alt={asset.name}
                          className="relative z-10 max-h-20 max-w-[80px] object-contain"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : (
                        <span className="text-[10px] text-slate-500">Empty</span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="mt-2.5 w-full">
                      <div className="truncate text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                        {asset.name}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="capitalize">{asset.category}</span>
                        <span className="font-mono text-slate-400">
                          {asset.canvas_width}&times;{asset.canvas_height}
                        </span>
                      </div>
                      {pixelCount === 0 && (
                        <span className="mt-1 inline-block text-[9px] text-amber-400/80">
                          (No pixels drawn)
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <span className="absolute right-2 top-2 rounded-full bg-cyan-500 p-1 text-slate-950">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/40 px-6 py-3 text-xs text-slate-400">
          <span>{filteredAssets.length} asset(s) shown</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

