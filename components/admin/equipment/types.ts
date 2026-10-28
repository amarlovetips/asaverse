export type EquipmentCategory = "head" | "clothing" | "relic";

export const EQUIPMENT_CATEGORIES = ["head", "clothing", "relic"] as const;

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  head: "Headgear",
  clothing: "Suits",
  relic: "Relic",
};

export const EQUIPMENT_RARITIES = ["common", "uncommon", "rare", "epic", "legendary"] as const;
export type EquipmentRarity = typeof EQUIPMENT_RARITIES[number];

export type EquipmentPixelMap = Record<string, string>;

export type EquipmentDesign = {
  id: string;
  design_name: string;
  category: EquipmentCategory;
  canvas_width: number;
  canvas_height: number;
  pixel_data: unknown;
  palette: string[];
  is_published: boolean;
  updated_at: string;
};

export type EquipmentDesignForEditor = {
  id: string;
  design_name: string;
  design_type: string;
  canvas_width: number;
  canvas_height: number;
  pixel_data: unknown;
};

export type EquipmentAnimationFrame = { pixelData: EquipmentPixelMap };

export type EquipmentAnimationJson = {
  frames: EquipmentAnimationFrame[];
  frameDurationMs: number;
};

export type EquipmentEffect = {
  equipment_design_id: string;
  rarity: EquipmentRarity;
  power: number;
  xp: number;
  protection: number;
  icon_pixel_data: EquipmentPixelMap;
  icon_canvas_size: number;
  metadata: Record<string, unknown>;
};

export function isEquipmentCategory(value: string): value is EquipmentCategory {
  return (EQUIPMENT_CATEGORIES as readonly string[]).includes(value);
}
