export type CharacterItem = {
  id: string;
  design_name: string;
  design_type: string;
  canvas_width: number;
  canvas_height: number;
  pixel_data: Record<string, string>;
  updated_at: string;
  is_default_base?: boolean;
  position_x?: number;
  position_y?: number;
  source?: "supabase";
  pixel_data_json?: unknown;
  idle_frames?: IdleFrameData[] | null;
};

export type IdleFrameData = {
  pixelData: Record<string, string>;
};
