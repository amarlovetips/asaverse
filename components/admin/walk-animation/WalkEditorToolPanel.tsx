"use client";
import IdleShapeSelector, { type IdlePixelShape } from "../idle-animation/IdleShapeSelector";
import type { IdlePixelTool } from "../idle-animation/IdlePixelToolSelector";

const button = "rounded border border-slate-700 px-2 py-1.5 text-[10px] text-slate-200 hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-40";

export default function WalkEditorToolPanel(p: {
  tool: IdlePixelTool;
  shape: IdlePixelShape;
  onShapeChange: (shape: IdlePixelShape) => void;
  color: string;
  selectionCount: number;
  framePixelCount: number;
  hasClipboard: boolean;
  onInvert: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onDeselect: () => void;
  onDelete: () => void;
}) {
  if (p.tool === "select") {
    const noSelection = p.selectionCount === 0;
    return <section className="w-full space-y-2 rounded-lg border border-slate-700 bg-[#0c121b] p-2.5" aria-label="Selection tool controls">
      <header className="flex items-center justify-between gap-2">
        <strong className="text-[11px] font-semibold text-cyan-200">Selection tool</strong>
        <span className="font-mono text-[10px] text-slate-400" aria-live="polite">
          {p.selectionCount ? p.selectionCount + (p.selectionCount === 1 ? " pixel selected" : " pixels selected") : "No selection"}
        </span>
      </header>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" className={button} disabled={p.framePixelCount === 0} onClick={p.onInvert}>Invert Selection</button>
        <button type="button" className={button} disabled={noSelection} onClick={p.onDeselect}>Deselect</button>
        <button type="button" className={button} disabled={noSelection} onClick={p.onCopy}>Copy</button>
        <button type="button" className={button} disabled={noSelection} onClick={p.onCut}>Cut</button>
        <button type="button" className={button} disabled={!p.hasClipboard} onClick={p.onPaste}>Paste</button>
        <button type="button" className={button} disabled={noSelection} onClick={p.onDelete}>Delete Selected Pixels</button>
        <button type="button" className={button} disabled={noSelection} onClick={p.onFlipHorizontal}>Flip Horizontal</button>
        <button type="button" className={button} disabled={noSelection} onClick={p.onFlipVertical}>Flip Vertical</button>
        <button type="button" className={button} disabled={noSelection} onClick={p.onRotateLeft}>Rotate Left</button>
        <button type="button" className={button} disabled={noSelection} onClick={p.onRotateRight}>Rotate Right</button>
      </div>
      <p className="text-[10px] text-slate-500">Drag on the board to select pixels. Drag the selection to move it; Shift-click adds, Ctrl/Command-click toggles.</p>
    </section>;
  }
  if (p.tool === "erase") {
    return <section className="w-full space-y-2 rounded-lg border border-slate-700 bg-[#0c121b] p-2.5" aria-label="Eraser tool settings">
      <strong className="text-[11px] font-semibold text-cyan-200">Eraser tool</strong>
      <p className="text-[10px] text-slate-400">Drag over pixels to erase them from the current frame. Underlying body, face, and layer overlays stay visible while erasing.</p>
    </section>;
  }
  return <section className="w-full space-y-2 rounded-lg border border-slate-700 bg-[#0c121b] p-2.5" aria-label="Pencil tool settings">
    <header className="flex items-center justify-between gap-2">
      <strong className="text-[11px] font-semibold text-cyan-200">Pencil tool</strong>
      <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
        <span className="size-4 rounded-sm border border-slate-600" style={{ backgroundColor: p.color }} aria-hidden="true" />
        <span className="font-mono">{p.color}</span>
      </span>
    </header>
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-400">Shape</span>
      <IdleShapeSelector activeShape={p.shape} onSelect={p.onShapeChange} />
    </div>
    <p className="text-[10px] text-slate-500">Draw pixel by pixel with the selected color. Pick colors from the palette in the toolbar; line, rectangle, and ellipse preview while dragging.</p>
  </section>;
}