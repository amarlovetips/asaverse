import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEventExecutionPlan,
  createAreaTrigger,
  normalizeSpecialEventTrigger,
  resizeEventCoordinates,
} from "./specialEvents.js";

test("area trigger creation preserves the configured shape and action", () => {
  const trigger = createAreaTrigger({
    name: "Door",
    triggerCondition: "player-enters",
    actionType: "travel-to-map",
    shape: { type: "rectangle", x: 12, y: 18, width: 80, height: 40 },
  });

  assert.equal(trigger.name, "Door");
  assert.equal(trigger.triggerCondition, "player-enters");
  assert.equal(trigger.actionType, "travel-to-map");
  assert.equal(trigger.shape.width, 80);
  assert.equal(trigger.shape.height, 40);
});

test("map resizing rescales trigger coordinates without changing aspect ratio", () => {
  const events = [
    createAreaTrigger({
      id: "a1",
      name: "Entrance",
      shape: { type: "rectangle", x: 40, y: 30, width: 60, height: 50 },
    }),
  ];

  const resized = resizeEventCoordinates(events, 200, 120, 400, 240);
  assert.equal(resized[0].shape.x, 80);
  assert.equal(resized[0].shape.y, 60);
  assert.equal(resized[0].shape.width, 120);
  assert.equal(resized[0].shape.height, 100);
});

test("execution plan preserves destination values for map travel and object actions", () => {
  const trigger = normalizeSpecialEventTrigger({
    id: "travel-1",
    name: "Forest Travel",
    triggerCondition: "player-enters",
    actionType: "travel-to-map",
    destinationMapId: "forest-map",
    destinationSpawnPoint: { x: 120, y: 210 },
  });

  const plan = buildEventExecutionPlan(trigger, { destinationMapId: "override-map", destinationSpawnPoint: { x: 5, y: 5 } });
  assert.equal(plan.actionType, "travel-to-map");
  assert.equal(plan.actionConfig.destinationMapId, "forest-map");
  assert.deepEqual(plan.actionConfig.destinationSpawnPoint, { x: 120, y: 210 });
});
