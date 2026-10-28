import { z } from "zod";

/**
 * AsaVerse tile-based map format.
 *
 * A map is a collection of named layers. Each layer has a unique order
 * (render priority, lower = drawn first / behind). Every pixel of every
 * layer is addressed by a keyed string of the form "x,y". This makes it
 * possible to store tiles of arbitrary size (1x1, 15x15, 16x16, ...) without
 * any distortion, because the asset's intrinsic pixel dimensions are never
 * needed in order to place it: the map only stores which asset occupies each
 * cell, and the renderer draws it at its native size.
 *
 * The format is deliberately flat so it can be serialised to JSON and sent
 * through Supabase's jsonb columns. It does not depend on any pixel-grid
 * numbering scheme, so the internal map coordinate system is independent of
 * the visible artboard coordinate system (pan and zoom apply only to
 * display, never to stored data).
 */

/** A single art asset as shipped by Tiles & Objects (supabase). */
export type AssetRecord = {
  id: string;
  name: string;
  category: string;
  canvas_width: number;
  canvas_height: number;
  pixel_data: Record<string, string>;
  updated_at: string;
  is_published: boolean;
};

export type AssetList = AssetRecord[];

/** A cell references an asset and carries its depth/occlusion metadata. */
export type Cell = {
  assetId: string;
  occlusionDepth: number;
};

/** A layer of the map. */
export type MapLayer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  order: number;
  cells: Record<string, Cell>;
};

/** A complete tile-based map. */
export type Map = {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  assets?: AssetList;
  layers: MapLayer[];
  updated_at: string;
  created_at: string;
};

const CellSchema = z.object({
  assetId: z.string(),
  occlusionDepth: z.number().int().min(0).default(0),
});

const MapLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  order: z.number().int().default(0),
  cells: z.record(z.string(), CellSchema),
});

export const MapSchema = z.object({
  id: z.string(),
  name: z.string(),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  tileSize: z.number().int().min(1).default(16),
  assets: z.array(z.any()).optional(),
  layers: z.array(MapLayerSchema),
  updated_at: z.string().optional(),
  created_at: z.string().optional(),
});

export function zodMapToMap(value: unknown): z.infer<typeof MapSchema> {
  return MapSchema.parse(value);
}
