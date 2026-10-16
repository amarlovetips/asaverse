import type { CharacterItem } from "../idle-animation/types";
import type { IdleAnimationFrameJson, WalkingAnimationJson } from "@/lib/character-design-json";
export type WalkCharacterItem = CharacterItem & {
  walking_animation?: WalkingAnimationJson | null;
  walking_side_node?: boolean;
  back_pixel_data?: Record<string, string>;
  back_idle_frames?: IdleAnimationFrameJson[] | null;
  back_walking_animation?: WalkingAnimationJson | null;
};
