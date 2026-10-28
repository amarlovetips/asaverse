"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import {
  listMaps,
  updateMapPublishStatus,
  setDefaultMap,
  deleteMap,
  exportMapJson,
  loadMap,
  getMapVersionHistory,
  saveMap,
  type MapSummary,
  type MapVersionRecord,
  type SavedMapData,
} from "./lib/saveLoad";
import { adminMenuHref } from "../menu-config";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function MapEditorWorkspace({ routeRemainder: _r = [] }: { routeRemainder?: string[] }) {
  const [maps, setMaps] = useState<MapSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "published" | "draft">("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deleteConfirmMap, setDeleteConfirmMap] = useState<MapSummary | null>(null);

  // Version History Modal
  const [historyModalMap, setHistoryModalMap] = useState<MapSummary | null>(null);
  const [historyVersions, setHistoryVersions] = useState<MapVersionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listMaps();
      setMaps(items);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to load maps",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Filter maps
  const filteredMaps = maps.filter((m) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "published" && m.is_published) ||
      (activeTab === "draft" && !m.is_published);
    const matchesSearch =
      !search.trim() || m.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Action: Edit Map (Opens Map Generator with this map loaded)
  const handleEditMap = (map: MapSummary) => {
    const generatorHref = `${adminMenuHref("Map Tools", "Map Generator")}/${encodeURIComponent(map.id)}`;
    window.history.pushState(null, "", generatorHref);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  // Action: Create New Map
  const handleCreateNew = () => {
    const generatorHref = adminMenuHref("Map Tools", "Map Generator");
    window.history.pushState(null, "", generatorHref);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  // Action: Publish / Unpublish
  const handleTogglePublish = async (map: MapSummary) => {
    setBusyId(map.id);
    const nextStatus = !map.is_published;
    try {
      await updateMapPublishStatus(map.id, nextStatus);
      setMaps((prev) =>
        prev.map((m) =>
          m.id === map.id ? { ...m, is_published: nextStatus, is_default: nextStatus ? m.is_default : false } : m
        )
      );
      setMessage({
        text: `Map "${map.name}" is now ${nextStatus ? "Published" : "Unpublished"}.`,
        type: "success",
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to update publication status",
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  // Action: Set Default Map
  const handleSetDefault = async (map: MapSummary) => {
    setBusyId(map.id);
    try {
      await setDefaultMap(map.id);
      setMaps((prev) =>
        prev.map((m) => ({
          ...m,
          is_default: m.id === map.id,
          is_published: m.id === map.id ? true : m.is_published,
        }))
      );
      setMessage({
        text: `Map "${map.name}" set as active default world map!`,
        type: "success",
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to set default map",
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  // Action: Delete Map (Unpublished Only)
  const handleDeleteMap = async (map: MapSummary) => {
    if (map.is_published) {
      setMessage({
        text: "Cannot delete a published map. Unpublish it first.",
        type: "error",
      });
      return;
    }
    setBusyId(map.id);
    try {
      await deleteMap(map.id);
      setMaps((prev) => prev.filter((m) => m.id !== map.id));
      setDeleteConfirmMap(null);
      setMessage({
        text: `Deleted map "${map.name}".`,
        type: "info",
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to delete map",
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  // Action: Export Map JSON
  const handleExportJson = async (map: MapSummary) => {
    const full = await loadMap(map.id);
    if (full) {
      exportMapJson(full);
    } else {
      setMessage({ text: "Could not export map details.", type: "error" });
    }
  };

  // Action: Open Version History Modal
  const handleOpenHistory = async (map: MapSummary) => {
    setHistoryModalMap(map);
    setHistoryLoading(true);
    try {
      const versions = await getMapVersionHistory(map.id);
      setHistoryVersions(versions);
    } catch (err) {
      console.warn("Failed to load map version history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Action: Restore Version
  const handleRestoreVersion = async (version: MapVersionRecord) => {
    if (!historyModalMap) return;
    setRestoringVersionId(version.id);
    try {
      const toRestore: SavedMapData = {
        ...version.map_data,
        id: historyModalMap.id,
        name: historyModalMap.name,
        is_published: historyModalMap.is_published,
        is_default: historyModalMap.is_default,
      };
      await saveMap(toRestore, true);
      // Reload versions list
      const updatedVersions = await getMapVersionHistory(historyModalMap.id);
      setHistoryVersions(updatedVersions);
      setMessage({
        text: `Restored Version #${version.version_number} successfully!`,
        type: "success",
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to restore version",
        type: "error",
      });
    } finally {
      setRestoringVersionId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-[#070b13] text-slate-100 select-none">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0d1424] px-6 py-4 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Map Tools</p>
              <h1 className="text-lg font-black text-white leading-tight">Map Editor &mdash; Maps Catalog</h1>
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Manage saved game maps, set active default worlds, configure publications, and inspect version history
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
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-sm shadow-emerald-600/30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Map
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

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/60 px-6 py-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "all"
                ? "bg-emerald-500 text-slate-950 shadow-sm"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            }`}
          >
            All Maps ({maps.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("published")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "published"
                ? "bg-emerald-500 text-slate-950 shadow-sm"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Published ({maps.filter((m) => m.is_published).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("draft")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "draft"
                ? "bg-emerald-500 text-slate-950 shadow-sm"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Unpublished ({maps.filter((m) => !m.is_published).length})
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <input
            type="text"
            placeholder="Search saved maps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-1.5 pl-8 text-xs text-slate-200 outline-none focus:border-emerald-500"
          />
          <svg className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Main Content List */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
            <svg className="h-8 w-8 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm">Loading saved maps...</p>
          </div>
        ) : filteredMaps.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-slate-400">
            <div className="rounded-full bg-slate-800/80 p-4 text-slate-500">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-300">
              {maps.length === 0 ? "No saved maps found" : "No maps match your filter"}
            </p>
            <p className="max-w-md text-xs text-slate-400">
              {maps.length === 0
                ? "Maps created and saved in Map Generator will automatically appear here."
                : "Try clearing your search query or switching tabs."}
            </p>
            {maps.length === 0 && (
              <button
                type="button"
                onClick={handleCreateNew}
                className="mt-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition"
              >
                Open Map Generator
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredMaps.map((map) => {
              const isBusy = busyId === map.id;

              return (
                <div
                  key={map.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm hover:border-slate-700 hover:bg-slate-900 transition"
                >
                  {/* Top Info */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-bold text-base text-white" title={map.name}>
                          {map.name}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          ID: {map.id.slice(0, 12)}...
                        </p>
                      </div>

                      {/* Default Map Star Badge */}
                      {map.is_default && (
                        <span className="shrink-0 flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40">
                          <svg className="h-3 w-3 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          Default Map
                        </span>
                      )}
                    </div>

                    {/* Metadata tags */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          map.is_published
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-700/50 text-slate-400 border border-slate-600/40"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${map.is_published ? "bg-emerald-400" : "bg-slate-500"}`} />
                        {map.is_published ? "Published" : "Unpublished"}
                      </span>

                      {map.placements_count !== undefined && (
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 font-mono">
                          {map.placements_count} assets
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-[11px] text-slate-500">
                      Updated {new Date(map.updated_at).toLocaleDateString()} {new Date(map.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 flex flex-col gap-2 border-t border-slate-800/80 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      {/* Left: Edit Action (Task 3: Always available for both published and unpublished) */}
                      <button
                        type="button"
                        onClick={() => handleEditMap(map)}
                        className="flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-300 hover:bg-cyan-500/25 transition"
                        title="Open in Map Generator to edit"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit Map
                      </button>

                      {/* Right: History & Export */}
                      <div className="flex items-center gap-1">
                        {/* History button (Task 4) */}
                        <button
                          type="button"
                          onClick={() => handleOpenHistory(map)}
                          className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-white transition"
                          title="View 10 recent versions and recovery"
                        >
                          <svg className="h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          History
                        </button>

                        {/* Export JSON */}
                        <button
                          type="button"
                          onClick={() => handleExportJson(map)}
                          className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:text-white transition"
                          title="Download Map JSON"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Secondary Actions (Publish/Unpublish, Set Default, Delete) */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                      {/* For Published: Set Default. For Unpublished: Publish button */}
                      {map.is_published ? (
                        <button
                          type="button"
                          disabled={isBusy || map.is_default}
                          onClick={() => handleSetDefault(map)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                            map.is_default
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-default"
                              : "bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20"
                          }`}
                        >
                          {map.is_default ? "Active Default" : "Set Default"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleTogglePublish(map)}
                          className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition disabled:opacity-50"
                        >
                          {isBusy ? "Saving..." : "Publish"}
                        </button>
                      )}

                      {/* Unpublish button if published */}
                      {map.is_published && (
                        <button
                          type="button"
                          disabled={isBusy || map.is_default}
                          onClick={() => handleTogglePublish(map)}
                          className="text-[11px] text-slate-400 hover:text-amber-300 transition disabled:opacity-30"
                          title={map.is_default ? "Cannot unpublish the default active map" : "Unpublish map"}
                        >
                          Unpublish
                        </button>
                      )}

                      {/* Delete button: strictly ONLY available for UNPUBLISHED maps (Task 3 & 7) */}
                      {!map.is_published && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setDeleteConfirmMap(map)}
                          className="rounded-lg p-1 text-slate-500 hover:text-red-400 transition disabled:opacity-50"
                          title="Delete unpublished map"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmMap && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Map Delete"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setDeleteConfirmMap(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-red-500/40 bg-slate-900 p-5 shadow-2xl text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-white">Delete Map &quot;{deleteConfirmMap.name}&quot;?</h3>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              This will permanently delete this unpublished map, all its layer configurations, and its version history.
              This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmMap(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMap(deleteConfirmMap)}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History & Recovery Modal (Task 4) */}
      {historyModalMap && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Map Version History"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setHistoryModalMap(null)}
        >
          <div
            className="flex h-[75vh] max-h-[600px] w-full max-w-xl flex-col rounded-2xl border border-slate-700 bg-[#0f172a] text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Version History &mdash; {historyModalMap.name}</h2>
                  <p className="text-xs text-slate-400">Stores the 10 most recent successful saved versions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalMap(null)}
                className="rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-slate-400 hover:text-white transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Versions List */}
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {historyLoading ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
                  <svg className="h-6 w-6 animate-spin text-amber-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <p className="text-xs">Loading versions...</p>
                </div>
              ) : historyVersions.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-slate-400">
                  <p className="text-sm font-medium text-slate-300">No snapshot history found</p>
                  <p className="max-w-xs text-xs text-slate-400">
                    Snapshots are saved automatically every time you click &ldquo;Save Map&rdquo; or &ldquo;Update Map&rdquo; in Map Generator.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyVersions.map((ver, idx) => {
                    const isRestoring = restoringVersionId === ver.id;
                    const placementsCount = ver.map_data?.placements?.length || 0;
                    const layersCount = ver.map_data?.layers?.length || 0;

                    return (
                      <div
                        key={ver.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-slate-700"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">
                              Version #{ver.version_number}
                            </span>
                            {idx === 0 && (
                              <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                                Latest Snapshot
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            {layersCount} layer{layersCount === 1 ? "" : "s"} &middot; {placementsCount} placed asset{placementsCount === 1 ? "" : "s"}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Saved on {new Date(ver.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => exportMapJson(ver.map_data)}
                            className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:text-white transition"
                            title="Export this version JSON"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            disabled={isRestoring}
                            onClick={() => handleRestoreVersion(ver)}
                            className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition disabled:opacity-50"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {isRestoring ? "Restoring..." : "Restore Version"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/60 px-6 py-3 text-xs text-slate-400">
              <span>Restoring creates a safe checkpoint preserving current history.</span>
              <button
                type="button"
                onClick={() => setHistoryModalMap(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

