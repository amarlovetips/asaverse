import { Check, Eye, EyeOff, ScanFace, UserRound } from "lucide-react";

export default function IdleBodyOverlayToggle({ bodyChecked, faceChecked, onBodyChange, onFaceChange }: {
  bodyChecked: boolean;
  faceChecked: boolean;
  onBodyChange: (checked: boolean) => void;
  onFaceChange: (checked: boolean) => void;
}) {
  return <div className="inline-flex shrink-0 items-center gap-1" aria-label="Default canvas overlays">
    <button type="button" title="Show or hide default body and skin on the canvas" aria-label="Toggle default body and skin overlay"
      aria-pressed={bodyChecked} onClick={() => onBodyChange(!bodyChecked)}
      className="relative grid size-8 place-items-center rounded border border-slate-700 text-slate-300 hover:border-cyan-500">
      {bodyChecked ? <Eye size={14} /> : <EyeOff size={14} />}
      <UserRound size={13} className="absolute bottom-0.5 right-0.5 rounded bg-[#111821]" />
      {bodyChecked && <Check size={9} className="absolute -right-1 -top-1 rounded-full bg-cyan-400 text-slate-950" />}
    </button>
    <button type="button" title="Show or hide default head and face on the canvas" aria-label="Toggle default head and face overlay"
      aria-pressed={faceChecked} onClick={() => onFaceChange(!faceChecked)}
      className="relative grid size-8 place-items-center rounded border border-slate-700 text-slate-300 hover:border-cyan-500">
      {faceChecked ? <Eye size={14} /> : <EyeOff size={14} />}
      <ScanFace size={13} className="absolute bottom-0.5 right-0.5 rounded bg-[#111821]" />
      {faceChecked && <Check size={9} className="absolute -right-1 -top-1 rounded-full bg-cyan-400 text-slate-950" />}
    </button>
  </div>;
}
