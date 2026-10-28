"use client";

import { useState } from "react";
import type { MapLayer, PlacedAsset, LayerGroupType } from "../lib/saveLoad";

type Props = {
  layers: MapLayer[];
  activeLayerId: string;
  onSelectLayer: (layerId: string) => void;
  onAddLayer: (group: LayerGroupType) => void;
  onRenameLayer: (layerId: string, newName: string) => void;
  onToggleVisible: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onMoveLayer: (layerId: string, direction: "up" | "down") => void;
  onDeleteLayer: (layerId: string) => void;
  onChangeOpacity?: (layerId: string, opacity: number) => void;
  placements: PlacedAsset[];
  blockedCount?: number;
};

export default function LayersPanel({
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onRenameLayer,
  onToggleVisible,
  onToggleLock,
  onMoveLayer,
  onDeleteLayer,
  onChangeOpacity,
  placements,
  blockedCount = 0,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [opacityMenuId, setOpacityMenuId] = useState<string | null>(null);

  // Group layers into Ground, Buildings & Trees, and Blocked Areas
  const groundLayers = layers
    .filter((l) => (l.group ? l.group === "ground" : l.id.includes("ground")))
    .sort((a, b) => b.order - a.order);

  const objectLayers = layers
    .filter((l) => (l.group ? l.group === "objects" : (!l.id.includes("ground") && !l.id.includes("block"))))
    .sort((a, b) => b.order - a.order);

  const blockedLayers = layers
    .filter((l) => l.group === "blocked" || l.id.includes("block"))
    .sort((a, b) => b.order - a.order);

  function startRename(layer: MapLayer) {
    setEditingId(layer.id);
    setEditingName(layer.name);
  }

  function commitRename() {
    if (editingId && editingName.trim()) {
      onRenameLayer(editingId, editingName.trim());
    }
    setEditingId(null);
  }

  const renderLayerList = (groupLayers: MapLayer[], groupType: LayerGroupType) => {
    return (
      <div className="space-y-1.5">
        {groupLayers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 p-2 text-center text-[11px] text-slate-500">
            No {groupType === "ground" ? "ground" : groupType === "blocked" ? "blocked" : "object"} layers yet. Click + Add to create one.
          </div>
        ) : (
          groupLayers.map((layer, idx) => {
            const isActive = layer.id === activeLayerId;
            const isFirst = idx === 0;
            const isLast = idx === groupLayers.length - 1;
            const layerPlacementCount = groupType === "blocked"
              ? blockedCount
              : placements.filter((p) => p.layerId === layer.id).length;
            const currentOpacity = layer.opacity !== undefined ? Math.round(layer.opacity * 100) : 100;

            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`group flex flex-col rounded-xl border p-2 text-xs transition cursor-pointer ${
                  isActive
                    ? groupType === "ground"
                      ? "border-emerald-500/80 bg-emerald-950/40 shadow-sm shadow-emerald-950/60"
                      : groupType === "blocked"
                      ? "border-red-500/80 bg-red-950/40 shadow-sm shadow-red-950/60"
                      : "border-cyan-500/80 bg-cyan-950/40 shadow-sm shadow-cyan-950/60"
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {/* Visibility Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisible(layer.id);
                      }}
                      title={layer.visible ? "Hide layer" : "Show layer"}
                      className={`rounded p-1 transition ${
                        layer.visible ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-400"
                      }`}
                    >
                      {layer.visible ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      )}
                    </button>

                    {/* Lock Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLock(layer.id);
                      }}
                      title={layer.locked ? "Unlock layer" : "Lock layer"}
                      className={`rounded p-1 transition ${
                        layer.locked ? "text-amber-400 hover:text-amber-300" : "text-slate-600 hover:text-slate-400"
                      }`}
                    >
                      {layer.locked ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>

                    {/* Name / Inline rename */}
                    <div className="min-w-0 flex-1">
                      {editingId === layer.id ? (
                        <input
                          type="text"
                          value={editingName}
                          autoFocus
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full rounded border border-cyan-500 bg-slate-950 px-1.5 py-0.5 text-xs text-white outline-none"
                        />
                      ) : (
                        <div
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            startRename(layer);
                          }}
                          className="flex items-center gap-1.5"
                        >
                          <span
                            className={`truncate font-medium ${
                              isActive
                                ? groupType === "ground"
                                  ? "text-emerald-300 font-semibold"
                                  : groupType === "blocked"
                                  ? "text-red-300 font-semibold"
                                  : "text-cyan-300 font-semibold"
                                : "text-slate-300"
                            }`}
                          >
                            {layer.name}
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-500">
                            ({layerPlacementCount})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons: Opacity, Reorder, Rename, Delete */}
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    {/* Opacity Trigger */}
                    <button
                      type="button"
                      onClick={() => setOpacityMenuId((prev) => (prev === layer.id ? null : layer.id))}
                      title={`Layer Opacity: ${currentOpacity}%`}
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold transition ${
                        currentOpacity < 100
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {currentOpacity}%
                    </button>

                    {/* Move Up */}
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => onMoveLayer(layer.id, "up")}
                      title="Move layer up"
                      className="rounded p-1 text-slate-400 hover:text-white disabled:opacity-20 transition"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => onMoveLayer(layer.id, "down")}
                      title="Move layer down"
                      className="rounded p-1 text-slate-400 hover:text-white disabled:opacity-20 transition"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Rename */}
                    <button
                      type="button"
                      onClick={() => startRename(layer)}
                      title="Rename layer"
                      className="rounded p-1 text-slate-400 hover:text-cyan-300 transition"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      disabled={layers.length <= 1}
                      onClick={() => setConfirmDeleteId(layer.id)}
                      title={layers.length <= 1 ? "Cannot delete the only layer" : "Delete layer"}
                      className="rounded p-1 text-slate-500 hover:text-red-400 disabled:opacity-20 transition"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Opacity Slider Panel */}
                {opacityMenuId === layer.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 flex items-center gap-2 rounded border border-slate-700 bg-slate-950 p-2 text-xs"
                  >
                    <span className="text-[10px] font-bold uppercase text-slate-400">Opacity:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={currentOpacity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) / 100;
                        onChangeOpacity?.(layer.id, val);
                      }}
                      className="h-1.5 flex-1 cursor-pointer accent-cyan-400"
                    />
                    <span className="w-9 font-mono text-[11px] text-cyan-300">{currentOpacity}%</span>
                    <button
                      type="button"
                      onClick={() => onChangeOpacity?.(layer.id, 1)}
                      className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700 hover:text-white"
                      title="Reset opacity to 100%"
                    >
                      100%
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0d1424] text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Layers ({layers.length})
          </span>
        </div>
      </div>

      {/* Split Layer Groups Container */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {/* GROUP A: Ground Layers */}
        <div className="rounded-xl border border-emerald-950/60 bg-emerald-950/10 p-2.5">
          <div className="mb-2.5 flex items-center justify-between border-b border-emerald-900/40 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Ground Layers ({groundLayers.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() => onAddLayer("ground")}
              className="flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/25 transition"
              title="Add new walkable ground layer"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Ground
            </button>
          </div>
          {renderLayerList(groundLayers, "ground")}
        </div>

        {/* GROUP B: Buildings & Trees Layers */}
        <div className="rounded-xl border border-cyan-950/60 bg-cyan-950/10 p-2.5">
          <div className="mb-2.5 flex items-center justify-between border-b border-cyan-900/40 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                Buildings &amp; Trees ({objectLayers.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() => onAddLayer("objects")}
              className="flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-500/15 px-2 py-0.5 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/25 transition"
              title="Add new buildings/objects layer"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Object
            </button>
          </div>
          {renderLayerList(objectLayers, "objects")}
        </div>

        {/* GROUP C: Dedicated Blocked Areas Layer */}
        <div className="rounded-xl border border-red-950/60 bg-red-950/10 p-2.5">
          <div className="mb-2.5 flex items-center justify-between border-b border-red-900/40 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-red-300">
                Blocked Collision ({blockedLayers.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() => onAddLayer("blocked")}
              className="flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-300 hover:bg-red-500/25 transition"
              title="Add dedicated blocked collision layer"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Blocked
            </button>
          </div>
          {renderLayerList(blockedLayers, "blocked")}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Delete Layer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-red-500/40 bg-slate-900 p-5 shadow-2xl text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-white">Delete this layer?</h3>
            <p className="mt-2 text-xs text-slate-300">
              Any tiles or objects on this layer will also be removed from the map.
              The original assets in Tiles &amp; Objects will not be deleted.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteLayer(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
              >
                Delete Layer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
