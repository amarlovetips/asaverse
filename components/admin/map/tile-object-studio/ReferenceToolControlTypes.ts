import type { SelectionBounds, SelectionKind } from "./SelectionBounds";
import type { PixelTextLayer } from "../../../../lib/character-design-json";

export type Props = {
  tool: string; strokeWidth: number; onStrokeWidthChange: (width: number) => void;
  onSelectAll: () => void; onInvertSelection: () => void; onCopySelection: () => void;
  onCutSelection: () => void; onPasteSelection: () => void;
  onTransformSelection: (transform: "horizontal" | "vertical" | "clockwise" | "counterclockwise") => void;
  selection: SelectionBounds | null; selectionKind: SelectionKind; polygonCount: number;
  textOrigin: { x: number; y: number } | null; shapeFilled: boolean; shapeFillColor: string | null;
  onToggleFilled: () => void; onApplySelectionFill: (fill: string | null) => void;
  onFinishPolygon: () => void; onClearSelection: () => void; onDeleteSelection: () => void;
  activeText: PixelTextLayer | null; onApplyText: (text: string, scale: number) => void;
  onEditText: (text: string) => void; onScaleText: (scale: number) => void;
  onApplyFilter: (filter: string) => void; onApplyCrop: () => void; onApplyPerspective: (amount: number) => void;
};



