"use client";
import { useEffect, useState } from "react";
import { useCharacterLayers } from "./useCharacterLayers";
import LayerList from "./LayerList";
import CharacterPreview from "./CharacterPreview";

const parts = [
  ["body", "Body"], ["head", "Head"], ["face", "Face"],
  ["facial-hair", "Facial Hair"], ["hair", "Hair"], ["clothing", "Clothing"]
];

function category(type: string) {
  const t = type.toLowerCase().replace(/-back$/, "");
  if (/facial[-_ ]?hair|beard|mustache/.test(t)) return "facial-hair";
  if (/hair/.test(t)) return "hair";
  if (/face|head/.test(t)) return "face";
  if (/cloth|outfit|suit|dress|clothing/.test(t)) return "clothing";
  if (/body|base/.test(t)) return "body";
  return t;
}

export default function CharacterComposer({ currentPixels, currentPart, currentSide, currentSize, designName }: { currentPixels: Record<string,string>; currentPart: string; currentSide: "front" | "back"; currentSize: number; designName: string }) {
  const s = useCharacterLayers();
  const [side, setSide] = useState<"front" | "back">("front");
  const [hidden, setHidden] = useState<string[]>([]);
  const currentLayer = { id: "current-artboard", design_name: designName || "Current Artboard", design_type: currentSide === "back" ? `${currentPart}-back` : currentPart, canvas_width: currentSize, pixel_data: currentPixels, layerId: "current-artboard", x: 0, y: 0 };
  const previewLayers = [...s.layers, currentLayer];
  useEffect(() => { void s.refresh(); }, [s]);

  const move = (id: string, k: "x" | "y", v: number) =>
    s.setLayers(a => a.map(l => l.layerId === id ? { ...l, [k]: v } : l));
  const order = (id: string, d: number) => s.setLayers(a => {
    const i = a.findIndex(l => l.layerId === id);
    const j = Math.max(0, Math.min(a.length - 1, i + d));
    if (i < 0 || i === j) return a;
    const b = [...a]; [b[i], b[j]] = [b[j], b[i]]; return b;
  });

  const filename = "asaverse-character";
  function download(data: string, name: string, type: string) {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportJson() {
    download(JSON.stringify({
      format: "AsaVerseCharacter", version: 1, width: 64, height: 64,
      layers: s.layers.map((layer) => Object.fromEntries(Object.entries(layer).filter(([key]) => key !== "layerId")))
    }, null, 2), `${filename}.json`, "application/json");
  }
  function exportPng(scale: number) {
    const base = document.createElement("canvas");
    base.width = base.height = 64;
    const ctx = base.getContext("2d");
    if (!ctx) return;
    s.layers.filter(l =>
      (side === "back") === l.design_type.toLowerCase().endsWith("-back") &&
      !hidden.includes(category(l.design_type))
    ).forEach(layer => {
      Object.entries(layer.pixel_data || {}).forEach(([key, color]) => {
        const [px, py] = key.split(",").map(Number);
        const x = px + layer.x, y = py + layer.y;
        if (x >= 0 && x < 64 && y >= 0 && y < 64) {
          ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1);
        }
      });
    });
    const out = document.createElement("canvas");
    out.width = out.height = 64 * scale;
    const outCtx = out.getContext("2d");
    if (!outCtx) return;
    outCtx.imageSmoothingEnabled = false;
    outCtx.drawImage(base, 0, 0, out.width, out.height);
    const a = document.createElement("a");
    a.download = `${filename}-${side}-${out.width}x${out.height}.png`;
    a.href = out.toDataURL("image/png"); a.click();
  }

  return <section className="space-y-3 border-t border-slate-700 pt-3">
    <h3 className="font-semibold text-cyan-300">Character Composer</h3>
    <button onClick={() => void s.refresh()} className="w-full rounded bg-slate-800 p-2 text-xs">Refresh Saved Designs</button>
    <div className="max-h-32 space-y-1 overflow-y-auto">
      {s.designs.map(d => <button key={d.id} onClick={() => s.add(d)}
        className="block w-full rounded border border-slate-700 p-2 text-left text-xs">
        {d.design_name} · {d.design_type}
      </button>)}
    </div>
    <div className="flex gap-2">
      {(["front", "back"] as const).map(v => <button key={v} onClick={() => setSide(v)}
        className={`rounded px-3 py-2 text-xs ${side === v ? "bg-cyan-700" : "bg-slate-800"}`}>
        {v === "front" ? "Front Preview" : "Back Preview"}
      </button>)}
    </div>
    <div className="grid grid-cols-2 gap-2">
      {parts.map(([id, label]) => {
        const isOn = !hidden.includes(id);
        return <button key={id} onClick={() => setHidden(old =>
          isOn ? [...old, id] : old.filter(x => x !== id)
        )} className={`rounded p-2 text-xs ${isOn ? "bg-emerald-800" : "bg-slate-700"}`}>
          {label}: {isOn ? "On" : "Off"}
        </button>;
      })}
    </div>
    <p className="text-xs text-slate-400">Preview visibility only; saved design pixels are unchanged.</p>
    <CharacterPreview layers={previewLayers} side={side} hiddenTypes={hidden} size={64} />
    <LayerList layers={s.layers} onMove={move} onOrder={order}
      onRemove={id => s.setLayers(a => a.filter(l => l.layerId !== id))} />
    <button onClick={exportJson} className="w-full rounded bg-slate-800 p-2 text-xs">Export Editable Source (JSON)</button>
    <button onClick={() => exportPng(1)} className="w-full rounded bg-cyan-800 p-2 text-xs">Export Game PNG (64×64)</button>
    <button onClick={() => exportPng(16)} className="w-full rounded bg-indigo-800 p-2 text-xs">Export HD PNG (1024×1024)</button>
    {s.message && <p className="text-xs text-slate-400">{s.message}</p>}
  </section>;
}
