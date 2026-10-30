"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAdminTileObjects,
  updateTileObjectPublishStatus,
  deleteTileObjectDesign,
  exportTileObjectJson,
  type TileObjectRecord,
} from "./lib/tileObjectStorage";
import { getAssetDataUrl, getOccupiedAssetBounds } from "./lib/assetRenderer";
import { adminMenuHref } from "../menu-config";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function TileObjectListWorkspace({ routeRemainder: _r = [] }: { routeRemainder?: string[] }) {
  const [items, setItems] = useState<TileObjectRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<TileObjectRecord | null>(null);

  // Load designs from Supabase & JSON storage
  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const records = await fetchAdminTileObjects();
      setItems(records);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to load tiles and objects.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Extract dynamic categories from actual saved metadata
  const dynamicCategories = useMemo(() => {
    const defaultCategories = ["tiles", "object", "tree", "water", "stone", "terrain", "decoration", "buildings", "others"];
    const set = new Set<string>(defaultCategories);
    items.forEach((item) => {
      if (item.category && item.category.toLowerCase() !== "body") set.add(item.category.toLowerCase());
    });
    return Array.from(set).sort();
  }, [items]);

  // Filter items by category and search
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCat =
        activeCategory === "all" ||
        item.category.toLowerCase() === activeCategory.toLowerCase();
      const matchesSearch =
        !search.trim() ||
        item.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        item.category.toLowerCase().includes(search.trim().toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [items, activeCategory, search]);

  // Group items by category for grouped display
  const groupedSections = useMemo(() => {
    if (activeCategory !== "all") {
      const filtered = filteredItems.filter(
        (i) => i.category.toLowerCase() === activeCategory.toLowerCase()
      );
      return filtered.length > 0 ? [{ category: activeCategory, rows: filtered }] : [];
    }

    // When "all" is active, group by all categories that contain matching rows
    const groups: { category: string; rows: TileObjectRecord[] }[] = [];
    const usedCategories = new Set<string>();

    // First, add groups for existing categories that have items
    dynamicCategories.forEach((cat) => {
      const rows = filteredItems.filter((i) => i.category.toLowerCase() === cat.toLowerCase());
      if (rows.length > 0) {
        groups.push({ category: cat, rows });
        usedCategories.add(cat.toLowerCase());
      }
    });

    // Any remaining items whose category wasn't in dynamicCategories
    const leftovers = filteredItems.filter(
      (i) => !usedCategories.has(i.category.toLowerCase())
    );
    if (leftovers.length > 0) {
      groups.push({ category: "custom", rows: leftovers });
    }

    return groups;
  }, [filteredItems, activeCategory, dynamicCategories]);

  // Handle Publish / Unpublish Toggle (Task 3)
  const handleTogglePublish = async (item: TileObjectRecord) => {
    setBusyId(item.id);
    const nextStatus = !item.is_published;
    try {
      await updateTileObjectPublishStatus(item.id, item.category, nextStatus);
      // Update state locally only after successful update
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_published: nextStatus } : i))
      );
      setMessage({
        text: `"${item.name}" is now ${nextStatus ? "Published" : "Unpublished"}.`,
        type: "success",
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to update publication status.",
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  // Handle Delete (Task 2 & 3)
  const handleDelete = async (item: TileObjectRecord) => {
    setBusyId(item.id);
    try {
      await deleteTileObjectDesign(item.id, item.category);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setDeleteConfirmItem(null);
      setMessage({
        text: `Deleted "${item.name}".`,
        type: "info",
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to delete design.",
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  // Handle Edit: Navigate to Tiles & Objects designer with design ID (Task 4)
  const handleEdit = (item: TileObjectRecord) => {
    const designerHref = `${adminMenuHref("Map Tools", "Tiles & Objects")}/${encodeURIComponent(item.id)}`;
    window.history.pushState(null, "", designerHref);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  // Handle Create New: Navigate to Tiles & Objects designer without ID
  const handleCreateNew = () => {
    const designerHref = adminMenuHref("Map Tools", "Tiles & Objects");
    window.history.pushState(null, "", designerHref);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-[#070b13] text-slate-100 select-none">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0d1424] px-6 py-4 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Map Tools</p>
              <h1 className="text-lg font-black text-white leading-tight">Tiles &amp; Object List</h1>
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            View, publish, edit, and organize all real tiles and objects created in the Tiles &amp; Objects designer
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-600 hover:text-white transition"
          >
            <svg className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>

          <button
            type="button"
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 transition shadow-sm shadow-cyan-600/30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Tile/Object
          </button>
        </div>
      </header>

      {/* Notification Toast */}
      {message && (
        <div
          className={`px-4 py-2 text-center text-xs font-semibold transition ${
            message.type === "success"
              ? "bg-emerald-950/80 text-emerald-300 border-b border-emerald-800"
              : message.type === "error"
              ? "bg-red-950/80 text-red-300 border-b border-red-800"
              : "bg-cyan-950/80 text-cyan-300 border-b border-cyan-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/60 px-6 py-3">
        {/* Dynamic Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeCategory === "all"
                ? "bg-cyan-500 text-slate-950 shadow-sm"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            }`}
          >
            All ({items.length})
          </button>
          {dynamicCategories.map((cat) => {
            const count = items.filter((i) => i.category.toLowerCase() === cat.toLowerCase()).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`capitalize rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeCategory === cat
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <input
            type="text"
            placeholder="Search tiles &amp; objects..."
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

      {/* Content Area */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
            <svg className="h-8 w-8 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm">Loading tiles &amp; objects...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-slate-400">
            <div className="rounded-full bg-slate-800/80 p-4 text-slate-500">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-300">
              {items.length === 0 ? "No saved tiles or objects found" : "No items match your filter"}
            </p>
            <p className="max-w-md text-xs text-slate-400">
              {items.length === 0
                ? "Designs created and saved in Map Tools → Tiles & Objects will automatically appear here."
                : "Try clearing your search query or selecting a different category."}
            </p>
            {items.length === 0 && (
              <button
                type="button"
                onClick={handleCreateNew}
                className="mt-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 transition"
              >
                Open Tiles &amp; Objects Designer
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {groupedSections.map((section) => (
              <div key={section.category} className="space-y-3">
                {/* Category Section Header */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-300 capitalize">
                    {section.category}
                  </h2>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-400">
                    {section.rows.length}
                  </span>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {section.rows.map((item) => {
                    const isBusy = busyId === item.id;
                    const bounds = getOccupiedAssetBounds({
                      id: item.id,
                      name: item.name,
                      category: item.category,
                      canvas_width: item.canvas_width,
                      canvas_height: item.canvas_height,
                      pixel_data: item.pixel_data,
                      updated_at: item.updated_at,
                      is_published: item.is_published,
                    });
                    const displayW = bounds.hasPixels ? bounds.width : item.canvas_width;
                    const displayH = bounds.hasPixels ? bounds.height : item.canvas_height;
                    const dataUrl = getAssetDataUrl({
                      id: item.id,
                      name: item.name,
                      category: item.category,
                      canvas_width: item.canvas_width,
                      canvas_height: item.canvas_height,
                      pixel_data: item.pixel_data,
                      updated_at: item.updated_at,
                      is_published: item.is_published,
                    });
                    
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm hover:border-slate-700 hover:bg-slate-900 transition"
                      >
                        {/* Top: Preview + Info */}
                        <div className="flex items-start gap-3">
                          {/* Live Pixel Preview */}
                          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-[#070b13]">
                            {/* Checkerboard transparency pattern */}
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
                                alt={item.name}
                                className="relative z-10 max-h-16 max-w-16 object-contain"
                                style={{ imageRendering: "pixelated" }}
                              />
                            ) : (
                              <span className="text-[10px] text-slate-500">Empty</span>
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-bold text-sm text-white" title={item.name}>
                              {item.name}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                              <span className="capitalize rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
                                {item.category}
                              </span>
                              <span className="font-mono text-slate-400">
                                {displayW}&times;{displayH}px
                              </span>
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                              {/* Publication Status Badge (Task 3) */}
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  item.is_published
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-slate-700/50 text-slate-400 border border-slate-600/40"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    item.is_published ? "bg-emerald-400" : "bg-slate-500"
                                  }`}
                                />
                                {item.is_published ? "Published" : "Unpublished"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Actions Bar (Edit, Publish/Unpublish, Export, Delete) */}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-800/80 pt-3">
                          {/* Publish/Unpublish Toggle Button (Task 3) */}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleTogglePublish(item)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                              item.is_published
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
                                : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                            }`}
                            title={
                              item.is_published
                                ? "Unpublish so it won't appear in Map Generator"
                                : "Publish to make it available in Map Generator"
                            }
                          >
                            {isBusy
                              ? "Saving..."
                              : item.is_published
                              ? "Unpublish"
                              : "Publish"}
                          </button>

                          <div className="flex items-center gap-1">
                            {/* Export JSON Button (Task 1 & 2) */}
                            <button
                              type="button"
                              onClick={() => exportTileObjectJson(item)}
                              className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white transition"
                              title="Download JSON file"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>

                            {/* Edit Button (Task 4) */}
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25 transition"
                              title="Edit in Tiles & Objects designer"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Edit
                            </button>

                            {/* Delete Button (Unpublished only) */}
                            {!item.is_published && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => setDeleteConfirmItem(item)}
                                className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 transition disabled:opacity-50"
                                title="Delete design"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Delete Confirmation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setDeleteConfirmItem(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-red-500/40 bg-slate-900 p-5 shadow-2xl text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-white">Delete &quot;{deleteConfirmItem.name}&quot;?</h3>
            <p className="mt-2 text-xs text-slate-300">
              This will permanently delete the design and its saved artwork from the database and storage.
              This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmItem)}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
