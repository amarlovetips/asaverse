import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { compactMapData, normalizeLayerGroup, pruneMapVersionHistory, rectsIntersect, resolveNonOverwritePlacement, transformPlacementSelection, type PlacedAsset } from "./saveLoad";

describe("pruneMapVersionHistory", () => {
  it("keeps only the newest entries up to the configured limit", () => {
    const ids = ["v11", "v10", "v9", "v8", "v7", "v6", "v5", "v4", "v3", "v2", "v1"];
    assert.deepEqual(pruneMapVersionHistory(ids, 10), ["v1"]);
  });

  it("leaves a full set alone when it is already at the limit", () => {
    const ids = ["v10", "v9", "v8", "v7", "v6", "v5", "v4", "v3", "v2", "v1"];
    assert.deepEqual(pruneMapVersionHistory(ids, 10), []);
  });
});

describe("normalizeLayerGroup", () => {
  it("keeps ground entries in ground and objects in objects", () => {
    assert.equal(normalizeLayerGroup({ id: "layer_ground_1", name: "Ground 1" }), "ground");
    assert.equal(normalizeLayerGroup({ id: "layer_objects_1", name: "Buildings & Trees 1" }), "objects");
    assert.equal(normalizeLayerGroup("ground"), "ground");
    assert.equal(normalizeLayerGroup("objects"), "objects");
  });
});

describe("compactMapData", () => {
  it("drops redundant metadata but preserves required map data", () => {
    const result = compactMapData({
      id: "map-1",
      name: "Test",
      layers: [{ id: "g1", name: "Ground", visible: true, locked: false, order: 0, group: "ground", opacity: 1 }],
      placements: [{ id: "p1", assetId: "a1", x: 10, y: 20, width: 16, height: 16, layerId: "g1", opacity: 1, collision: { x: 4, y: 8, width: 8, height: 8 }, collisionMode: "custom" }],
      blockedAreas: [{ id: "b1", x: 0, y: 0, width: 10, height: 10, shape: "rectangle", label: "Blocked" }],
      camera: { x: 0, y: 0, zoom: 1 },
      updated_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
    });

    assert.equal(result.layers[0].opacity, 1);
    assert.equal(result.placements[0].collision?.width, 8);
    assert.equal(result.blockedAreas[0].label, "Blocked");
  });
});

describe("transformPlacementSelection", () => {
  it("flips and rotates selected placements around their selection center", () => {
    const placements: PlacedAsset[] = [
      { id: "p1", assetId: "a1", x: 10, y: 20, width: 20, height: 30, layerId: "ground", rotation: 0 },
      { id: "p2", assetId: "a2", x: 40, y: 50, width: 10, height: 10, layerId: "ground", rotation: 0 },
    ];

    const flipped = transformPlacementSelection(placements, ["p1"], "horizontal");
    assert.equal(flipped[0].x, 10);
    assert.equal(flipped[0].rotation, 0);

    const rotated = transformPlacementSelection(placements, ["p1"], "rotate-right");
    assert.equal(rotated[0].width, 30);
    assert.equal(rotated[0].height, 20);
    assert.equal(rotated[0].rotation, 90);
  });
});

describe("resolveNonOverwritePlacement", () => {
  it("moves a placement to the nearest free adjacent slot rather than overwriting a tile in the same layer", () => {
    const placements: PlacedAsset[] = [
      { id: "p1", assetId: "a1", x: 0, y: 0, width: 16, height: 16, layerId: "layer_ground", collisionMode: "walkable" },
      { id: "p2", assetId: "a2", x: 16, y: 0, width: 16, height: 16, layerId: "layer_ground", collisionMode: "walkable" },
    ];

    const result = resolveNonOverwritePlacement({
      x: 16,
      y: 0,
      width: 16,
      height: 16,
      layerId: "layer_ground",
      placements,
      snapToGrid: true,
      cellSize: 16,
    });

    assert.equal(result.overlapped, true);
    assert.ok(!placements.some((placement) => rectsIntersect({ x: result.x, y: result.y, width: 16, height: 16 }, placement)));
    assert.ok(Math.abs(result.x - 16) <= 16 && Math.abs(result.y) <= 16);
  });
});
