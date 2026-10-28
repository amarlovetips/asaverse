"use client";

import { useEffect, useState } from "react";
import { listMaps } from "../lib/saveLoad";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onLoadMap: (mapId: string) => Promise<void>;
  currentMapId: string;
};

export default function SavedMapsModal({ isOpen, onClose, onLoadMap, currentMapId }: Props) {
  const [maps, setMaps] = useState<{ id: string; name: string; updated_at: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let live = true;
    async function fetchList() {
      setLoading(true);
      try {
        const items = await listMaps();
        if (live) setMaps(items);
      } finally {
        if (live) setLoading(false);
      }
    }
    fetchList();
    return () => {
      live = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Saved Maps"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex h-[70vh] max-h-[550px] w-full max-w-lg flex-col rounded-2xl border border-slate-700 bg-[#0f172a] text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-white">Saved Maps</h2>
            <p className="text-xs text-slate-400">Open an existing map to continue building</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-slate-400 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-xs text-slate-400">
              Loading saved maps...
            </div>
          ) : maps.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center text-xs text-slate-400">
              <p className="font-semibold text-slate-300">No saved maps found</p>
              <p className="mt-1">Save your current map using the &quot;Save Map&quot; button in the toolbar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {maps.map((m) => {
                const isCurrent = m.id === currentMapId;
                const isBusy = busyId === m.id;
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between rounded-xl border p-3 transition ${
                      isCurrent
                        ? "border-cyan-500 bg-cyan-950/30"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-white">{m.name}</div>
                      <div className="text-[11px] text-slate-400">
                        Updated {new Date(m.updated_at).toLocaleString()}
                        {isCurrent && " &middot; (Currently Open)"}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={async () => {
                        setBusyId(m.id);
                        try {
                          await onLoadMap(m.id);
                          onClose();
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50 transition"
                    >
                      {isBusy ? "Opening..." : isCurrent ? "Reopen" : "Open"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-800 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

