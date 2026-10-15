import type { SelectionBounds } from "./SelectionBounds";

export type PixelArtCanvasProps = {
  size: number; zoom: number; pixels: Record<string, string>; part: string; guide: boolean; empty: string;
  imageUrl: string | null; imageOpacity: number; imageVisible: boolean; imageScale: number;
  imageX: number; imageY: number; imageToolActive: boolean;
  referencePixels: Record<string, string>; referenceOpacity: number; selection: SelectionBounds | null;
  onImagePointerDown: (event: React.PointerEvent<HTMLImageElement>) => void;
  onImagePointerMove: (event: React.PointerEvent<HTMLImageElement>) => void;
  onImagePointerUp: (event: React.PointerEvent<HTMLImageElement>) => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
};

export type ReferenceImageProps = Pick<PixelArtCanvasProps,
  "size" | "zoom" | "imageUrl" | "imageOpacity" | "imageVisible" | "imageScale" |
  "imageX" | "imageY" | "imageToolActive" | "onImagePointerDown" | "onImagePointerMove" | "onImagePointerUp">;
