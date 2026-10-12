"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import CategoryTabs from "./components/CategoryTabs";
import StatusTabs from "./components/StatusTabs";
import DesignList, { type Design } from "./components/DesignList";
import DeleteConfirm from "./components/DeleteConfirm";
import EditDesignPanel from "./components/EditDesignPanel";
import { useCharacterDesigns } from "./useCharacterDesigns";
import { filterDesigns } from "./filterDesigns";
import SupabaseCharacterToggle from "./SupabaseCharacterToggle";

export default function CharactersWorkspace() {
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Design | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 25;
  const [deleting, setDeleting] = useState<Design | null>(null);
  const api = useCharacterDesigns();
  const filtered = filterDesigns(
    [...api.items].sort((a, b) =>
      new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
    ),
    category,
    status
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const shown = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [category, status]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);


  return <section className="h-full space-y-4 overflow-auto p-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold">Character Designs</h2>
        <p className="text-xs text-slate-400">Manage saved character art</p></div>
      <div className="flex flex-wrap gap-2">
        <button disabled={api.busy} onClick={api.load}
          className="rounded bg-cyan-700 px-4 py-2 text-sm">Load Designs</button>
      </div>
    </header>
    <SupabaseCharacterToggle />
    {api.message && <p role="status" className="text-xs text-slate-300">{api.message}</p>}
    <CategoryTabs value={category} onChange={setCategory}/>
    <StatusTabs value={status} onChange={setStatus}/>
    {editing ? <EditDesignPanel
      design={editing}
      designs={api.items}
      busy={api.busy}
      onSavePosition={api.savePosition}
      onCancel={() => setEditing(null)}
      onSave={async (side, pixels) => {
        if (await api.saveSide(editing, side, pixels)) {
          const type = editing.design_type.replace(/-back$/, "");
          const targetType = side === "back" ? `${type}-back` : type;
          setEditing(api.items.find(d => d.design_type === targetType) || editing);
        }
      }}
    /> : <DesignList items={shown} onEdit={setEditing}
      onDelete={setDeleting} onToggle={api.toggle} onDefault={api.setDefault} allowDelete={status === "unpublished"}/>}
    {deleting && <DeleteConfirm name={deleting.design_name}
      onCancel={() => setDeleting(null)}
      onConfirm={async () => {
        if (await api.remove(deleting)) setDeleting(null);
      }}/>}
    {!editing && filtered.length > 0 && (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 pt-4 text-sm text-slate-300">
        <span>
          Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="rounded bg-slate-700 px-3 py-2 disabled:opacity-40">Previous</button>
          <span>Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="rounded bg-slate-700 px-3 py-2 disabled:opacity-40">Next</button>
        </div>
      </div>
    )}
    {!shown.length && !editing &&
      <p className="py-8 text-center text-sm text-slate-500">
        No designs here. Click Load Designs first.
      </p>}
  </section>;
}
