import type { BlockedArea, PlacedAsset } from "./saveLoad";

export type RenderCamera = {
  x: number;
  y: number;
  zoom: number;
};

export type RenderViewport = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  zoom: number;
};

export function getRenderViewport(camera: RenderCamera, viewportWidth: number, viewportHeight: number): RenderViewport {
  const zoom = Math.max(0.001, camera.zoom || 1);
  const halfWidth = viewportWidth / 2;
  const halfHeight = viewportHeight / 2;

  return {
    left: camera.x - halfWidth / zoom,
    top: camera.y - halfHeight / zoom,
    right: camera.x + halfWidth / zoom,
    bottom: camera.y + halfHeight / zoom,
    width: viewportWidth,
    height: viewportHeight,
    zoom,
  };
}

export function getAdaptiveRenderScale(zoom: number): number {
  if (zoom < 0.9) return 0.5;
  if (zoom < 1.45) return 0.75;
  return 1;
}

export function intersectsViewport(
  x: number,
  y: number,
  width: number,
  height: number,
  viewport: RenderViewport
): boolean {
  return x < viewport.right && x + width > viewport.left && y < viewport.bottom && y + height > viewport.top;
}

export function buildSpatialIndex<T extends { x: number; y: number; width: number; height: number; id: string }>(
  items: T[],
  cellSize = 64
): Map<string, T[]> {
  const index = new Map<string, T[]>();

  for (const item of items) {
    const minCellX = Math.floor(item.x / cellSize);
    const maxCellX = Math.floor((item.x + item.width) / cellSize);
    const minCellY = Math.floor(item.y / cellSize);
    const maxCellY = Math.floor((item.y + item.height) / cellSize);

    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
        const key = `${cellX}:${cellY}`;
        const bucket = index.get(key) ?? [];
        bucket.push(item);
        index.set(key, bucket);
      }
    }
  }

  return index;
}

export function getVisiblePlacements(
  placements: PlacedAsset[],
  viewport: RenderViewport,
  cellSize = 64
): PlacedAsset[] {
  const index = buildSpatialIndex(placements, cellSize);
  const visible = new Map<string, PlacedAsset>();
  const minCellX = Math.floor(viewport.left / cellSize);
  const maxCellX = Math.floor(viewport.right / cellSize);
  const minCellY = Math.floor(viewport.top / cellSize);
  const maxCellY = Math.floor(viewport.bottom / cellSize);

  for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
    for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
      const bucket = index.get(`${cellX}:${cellY}`) ?? [];
      for (const placement of bucket) {
        if (visible.has(placement.id)) continue;
        if (intersectsViewport(placement.x, placement.y, placement.width, placement.height, viewport)) {
          visible.set(placement.id, placement);
        }
      }
    }
  }

  return Array.from(visible.values());
}

export function getVisibleBlockedAreas(
  blockedAreas: BlockedArea[],
  viewport: RenderViewport,
  cellSize = 64
): BlockedArea[] {
  const index = buildSpatialIndex(blockedAreas, cellSize);
  const visible = new Map<string, BlockedArea>();
  const minCellX = Math.floor(viewport.left / cellSize);
  const maxCellX = Math.floor(viewport.right / cellSize);
  const minCellY = Math.floor(viewport.top / cellSize);
  const maxCellY = Math.floor(viewport.bottom / cellSize);

  for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
    for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
      const bucket = index.get(`${cellX}:${cellY}`) ?? [];
      for (const blockedArea of bucket) {
        if (visible.has(blockedArea.id)) continue;
        if (intersectsViewport(blockedArea.x, blockedArea.y, blockedArea.width, blockedArea.height, viewport)) {
          visible.set(blockedArea.id, blockedArea);
        }
      }
    }
  }

  return Array.from(visible.values());
}
