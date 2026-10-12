"use client";
export type Design = {
  id: string;
  design_name: string;
  design_type: string;
  canvas_width: number;
  canvas_height?: number;
  pixel_data: Record<string, string>;
  palette: string[];
  is_published: boolean;
  is_default_base?: boolean;
  position_x?: number;
  position_y?: number;
  user_id: string;
  updated_at?: string;
};
type Props = {
  items: Design[];
  onEdit: (d: Design) => void;
  onDelete: (d: Design) => void;
  onToggle: (d: Design) => void;
  onDefault: (d: Design) => void;
  allowDelete: boolean;
};
function PixelPreview({ design }: { design: Design }) {
  const width = design.canvas_width || 64;
  const height = design.canvas_height || width;
  return (
    <svg viewBox={`0 0 ${width} ${height}`}
      className="h-20 w-20 shrink-0 rounded bg-slate-950"
      shapeRendering="crispEdges">
      {Object.entries(design.pixel_data || {}).map(([point, color]) => {
        const [x, y] = point.split(",").map(Number);
        if (!Number.isFinite(x) || !Number.isFinite(y) ||
            !/^#[0-9a-f]{3,8}$/i.test(color)) return null;
        return <rect key={point} x={x} y={y} width="1" height="1" fill={color} />;
      })}
    </svg>
  );
}
function exportDesign(d: Design) {
  const payload = {
    format: "asaverse-character-design",
    version: 1,
    exported_at: new Date().toISOString(),
    design: {
      id: d.id,
      design_name: d.design_name,
      design_type: d.design_type,
      canvas_width: d.canvas_width,
      canvas_height: d.canvas_height || d.canvas_width,
      pixel_data: d.pixel_data || {},
      palette: d.palette || [],
      position_x: d.position_x ?? 0,
      position_y: d.position_y ?? 0,
      is_published: d.is_published,
      is_default_base: d.is_default_base ?? false
    }
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${d.design_name.trim().replace(/[^a-z0-9_-]+/gi, "-") || d.design_type}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
export default function DesignList({ items, onEdit, onDelete, onToggle, onDefault, allowDelete }: Props) {
  return <div className="grid gap-2">
    {items.map(d => <article key={d.id}
      className="flex flex-wrap items-center gap-3 rounded border border-slate-700 p-3">
      <PixelPreview design={d} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{d.design_name}</p>
        <p className="text-xs text-slate-400">
          {d.design_type} · {d.canvas_width}×{d.canvas_height || d.canvas_width}
          {d.is_default_base ? " · Default" : ""}
        </p>
      </div>
      <button onClick={() => onEdit(d)}
        className="rounded bg-slate-700 px-2 py-1 text-xs">Edit</button>
      <button onClick={() => exportDesign(d)}
        className="rounded bg-emerald-700 px-2 py-1 text-xs">Export JSON</button>
      <button onClick={() => onToggle(d)}
        className="rounded bg-cyan-800 px-2 py-1 text-xs">
        {d.is_published ? "Unpublish" : "Publish"}
      </button>
      <button onClick={() => onDefault(d)} className={`rounded px-2 py-1 text-xs ${d.is_default_base ? "bg-amber-700" : "bg-slate-700"}`}>{d.is_default_base ? "Unset Default" : "Set Default"}</button>
      {allowDelete && <button onClick={() => onDelete(d)}
        className="rounded bg-red-900 px-2 py-1 text-xs">Delete</button>}
    </article>)}
  </div>;
}
