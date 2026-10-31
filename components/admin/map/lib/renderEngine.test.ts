import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { type BlockedArea, type PlacedAsset } from "./saveLoad";
import { buildSpatialIndex, getAdaptiveRenderScale, getRenderViewport, getVisibleBlockedAreas, getVisiblePlacements } from "./renderEngine";

describe("renderEngine", () => {
  it("calculates viewport bounds correctly from a camera and canvas size", () => {
    const viewport = getRenderViewport({ x: 100, y: 200, zoom: 2 }, 80, 40);

    assert.equal(viewport.left, 80);
    assert.equal(viewport.top, 190);
    assert.equal(viewport.right, 120);
    assert.equal(viewport.bottom, 210);
    assert.equal(viewport.zoom, 2);
  });

  it("keeps only placements inside the visible world viewport", () => {
    const viewport = getRenderViewport({ x: 100, y: 100, zoom: 1 }, 80, 80);
    const placements: PlacedAsset[] = [
      { id: "inside", x: 90, y: 90, width: 16, height: 16, layerId: "ground", assetId: "a1", name: "Inside", collisionMode: "walkable", rotation: 0 },
      { id: "outside", x: 250, y: 250, width: 16, height: 16, layerId: "ground", assetId: "a2", name: "Outside", collisionMode: "walkable", rotation: 0 },
    ];

    const visible = getVisiblePlacements(placements, viewport);
    assert.deepEqual(visible.map((placement) => placement.id), ["inside"]);
  });

  it("drops blocked areas that are outside the rendered viewport", () => {
    const viewport = getRenderViewport({ x: 0, y: 0, zoom: 1 }, 100, 100);
    const blockedAreas: BlockedArea[] = [
      { id: "visible", x: 0, y: 0, width: 20, height: 20, shape: "rectangle", label: "A" },
      { id: "hidden", x: 300, y: 300, width: 20, height: 20, shape: "rectangle", label: "B" },
    ];

    const visible = getVisibleBlockedAreas(blockedAreas, viewport);
    assert.deepEqual(visible.map((area) => area.id), ["visible"]);
  });

  it("indexes assets by world cells to support fast viewport queries", () => {
    const placed: PlacedAsset[] = [
      { id: "p1", assetId: "a1", x: 0, y: 0, width: 16, height: 16, layerId: "ground", collisionMode: "walkable", rotation: 0 },
      { id: "p2", assetId: "a2", x: 100, y: 50, width: 16, height: 16, layerId: "ground", collisionMode: "walkable", rotation: 0 },
    ];

    const index = buildSpatialIndex(placed, 64);
    assert.ok(index.has("0:0"));
    assert.ok(index.has("1:0"));
    assert.ok(index.has("1:0"));
  });

  it("reduces draw detail when the camera is zoomed far out", () => {
    assert.equal(getAdaptiveRenderScale(0.5), 0.5);
    assert.equal(getAdaptiveRenderScale(0.9), 0.75);
    assert.equal(getAdaptiveRenderScale(1.5), 1);
  });
});
