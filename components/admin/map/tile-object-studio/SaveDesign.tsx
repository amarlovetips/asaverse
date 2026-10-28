"use client";
import { useState } from "react";
import type { PixelTextLayer } from "../../../../lib/character-design-json";
import { persistCharacterDesign } from "./persistCharacterDesign";
type Props = { name: string; part: string; side: "front" | "back"; width: number; height: number; pixels: Record<string, string>; basePixels: Record<string, string>; textLayers: PixelTextLayer[]; palette: string[]; designId: string | null; onSaved: (id: string | null) => void };
export default function SaveDesign(p: Props) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function save() {
    if (p.side === "back" && !p.designId) { setMessage("Choose a published front design before saving its back."); return; }
    setBusy(true); setMessage("");
    try { const result = await persistCharacterDesign(p); p.onSaved(result.id); setMessage(result.message); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Save failed."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2">
    <button onClick={save} disabled={busy} className="w-full rounded bg-cyan-600 p-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : p.designId ? "Update Design" : "Save Design"}</button>
    {message && <p role="status" className="break-words text-xs text-slate-300">{message}</p>}
  </div>;
}



