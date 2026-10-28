"use client";
import { useState } from "react";
import type { PixelTextLayer } from "../../../../lib/character-design-json";
import { persistEquipmentDesign } from "../persistEquipmentDesign";

type Props = {
  name: string; category: string; side: "front" | "back";
  width: number; height: number; pixels: Record<string, string>;
  textLayers: PixelTextLayer[]; palette: string[]; designId: string | null;
  onSaved: (id: string | null) => void;
};

export default function EquipmentSaveDesign(p: Props) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function save() {
    if (p.side === "back" && !p.designId) { setMessage("Save the front view before saving its back."); return; }
    setBusy(true); setMessage("");
    try {
      const result = await persistEquipmentDesign({
        name: p.name, category: p.category, side: p.side, width: p.width, height: p.height,
        pixels: p.pixels, textLayers: p.textLayers, palette: p.palette, designId: p.designId,
      });
      p.onSaved(result.id); setMessage(result.message);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Save failed."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2">
    <button onClick={save} disabled={busy}
      className="w-full rounded bg-cyan-600 p-2 text-xs font-semibold text-white disabled:opacity-50">
      {busy ? "Saving..." : p.designId ? "Update Equipment" : "Save Equipment"}
    </button>
    {message && <p role="status" className="break-words text-xs text-slate-300">{message}</p>}
  </div>;
}
