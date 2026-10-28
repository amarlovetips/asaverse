export const ARTBOARD_PRESETS = [16, 32, 64] as const;
export const MAX_ARTBOARD_DIMENSION = 128;

export function validArtboardDimensions(width: number, height: number) {
  return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 &&
    width <= MAX_ARTBOARD_DIMENSION && height <= MAX_ARTBOARD_DIMENSION;
}



