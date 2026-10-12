"use client";
import { useState } from "react";
import type { Design } from "./DesignList";
import EditArtboard from "./EditArtboard";

type Side = "front" | "back";
type Props = {
  design: Design;
  designs: Design[];
  busy: boolean;
  onSave: (side: Side, pixels: Record<string, string>) => void;
  onSavePosition: (design: Design, x: number, y: number) => void;
  onCancel: () => void;
};

const parts = [
  ["face", "Face"],
  ["body", "Body"],
  ["facial-hair", "Facial Hair"],
  ["hair", "Hair"],
  ["clothing", "Clothing"],
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

export default function EditDesignPanel({
  design, designs, busy, onSave, onSavePosition, onCancel
}: Props) {
  const baseType = design.design_type.replace(/-back$/, "");
  const [side, setSide] = useState<Side>(
    design.design_type.endsWith("-back") ? "back" : "front"
  );
  const findSide = (s: Side) => designs.find(d =>
    d.design_type === (s === "back" ? `${baseType}-back` : baseType)
  );
  const [front, setFront] = useState<Record<string, string>>(
    () => findSide("front")?.pixel_data || {}
  );
  const [back, setBack] = useState<Record<string, string>>(
    () => findSide("back")?.pixel_data || {}
  );
  const [hidden, setHidden] = useState<string[]>([]);
  const [positions, setPositions] = useState<Record<string, {x:number;y:number}>>(
    () => Object.fromEntries(designs.map(d => [
      d.id, { x: d.position_x || 0, y: d.position_y || 0 }
    ]))
  );

  const pixels = side === "front" ? front : back;
  const update = (p: Record<string, string>) =>
    side === "front" ? setFront(p) : setBack(p);
  const layers = designs.filter(d =>
    (side === "back") === d.design_type.toLowerCase().endsWith("-back") &&
    !hidden.includes(category(d.design_type))
  );

  return <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
    <div className="flex items-center justify-between gap-2">
      <h3 className="truncate font-semibold">Edit: {design.design_name}</h3>
      <button onClick={onCancel} className="rounded bg-slate-700 px-3 py-2 text-xs">Close</button>
    </div>

    <div className="flex gap-2">
      {(["front", "back"] as const).map(v =>
        <button key={v} type="button" onClick={() => setSide(v)}
          className={`rounded px-4 py-2 text-xs ${side === v ? "bg-cyan-700" : "bg-slate-700"}`}>
          {v === "front" ? "Front" : "Back"}
        </button>
      )}
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Character Preview · {side}</h4>
        <div className="grid aspect-square w-full max-w-80 overflow-hidden border border-slate-600"
          style={{
            gridTemplateColumns: "repeat(64,minmax(0,1fr))",
            backgroundColor: "#18212c"
          }}>
          {Array.from({ length: 4096 }, (_, i) => {
            const x = i % 64, y = Math.floor(i / 64);
            let color = "";
            layers.forEach(d => {
              const pos = positions[d.id] || {x:0,y:0};
              Object.entries(d.pixel_data || {}).forEach(([key, c]) => {
                const [px, py] = key.split(",").map(Number);
                if (px + pos.x === x && py + pos.y === y) color = c;
              });
            });
            return <div key={i} style={{ background: color || "transparent" }} />;
          })}
        </div>
        <div className="space-y-2">
          <p className="text-xs text-slate-400">Show / Hide parts</p>
          {parts.map(([key, label]) =>
            <label key={key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!hidden.includes(key)}
                onChange={e => setHidden(old =>
                  e.target.checked ? old.filter(x => x !== key) : [...old, key]
                )} />
              {label}
            </label>
          )}
        </div>
      </div>

      <div className="min-w-0 space-y-3">
        <h4 className="text-sm font-semibold">Layer Positions</h4>
        <div className="max-h-80 space-y-2 overflow-auto">
          {designs.filter(d =>
            (side === "back") === d.design_type.toLowerCase().endsWith("-back")
          ).map(d => {
            const pos = positions[d.id] || {x:0,y:0};
            return <div key={d.id} className="rounded border border-slate-700 p-2">
              <p className="mb-2 text-xs font-medium">{d.design_name} · {category(d.design_type)}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <label>X <input type="number" value={pos.x}
                  onChange={e => setPositions(old => ({
                    ...old, [d.id]: {...pos, x: Number(e.target.value)}
                  }))} className="w-16 rounded bg-slate-800 p-1" /></label>
                <label>Y <input type="number" value={pos.y}
                  onChange={e => setPositions(old => ({
                    ...old, [d.id]: {...pos, y: Number(e.target.value)}
                  }))} className="w-16 rounded bg-slate-800 p-1" /></label>
                <button disabled={busy} onClick={() => onSavePosition(d, pos.x, pos.y)}
                  className="rounded bg-cyan-800 px-3 py-1 disabled:opacity-50">Save Position</button>
              </div>
            </div>;
          })}
        </div>
      </div>
    </div>

    <div className="space-y-3 border-t border-slate-700 pt-4">
      <h4 className="text-sm font-semibold">Edit Pixels · {side}</h4>
      <EditArtboard pixels={pixels} onChange={update} />
      <button disabled={busy} onClick={() => onSave(side, pixels)}
        className="rounded bg-cyan-700 px-4 py-2 text-sm disabled:opacity-50">
        {busy ? "Saving..." : `Save ${side === "front" ? "Front" : "Back"}`}
      </button>
    </div>
  </section>;
}
