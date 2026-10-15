import { LoaderCircle, Save } from "lucide-react";

export default function IdleSaveFramesButton({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return <button type="button" title={saving ? "Saving frames" : "Save frames"}
    aria-label={saving ? "Saving frames" : "Save frames"} disabled={saving} onClick={onSave}
    className="grid size-9 place-items-center rounded-lg bg-cyan-400 text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50">
    {saving ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
  </button>;
}
