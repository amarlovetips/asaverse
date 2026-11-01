async function getSupabaseClient() {
  try {
    const mod = await import("../../../../lib/supabase");
    return mod.createClient || null;
  } catch {
    try {
      const mod = await import("@/lib/supabase");
      return mod.createClient || null;
    } catch {
      return null;
    }
  }
}

export const SPECIAL_EVENT_TYPES = [
  "area-trigger",
  "inside-building",
  "object-behaviour",
  "map-travel",
];

export const SPECIAL_EVENT_ACTION_TYPES = [
  "enter-inside-building",
  "exit-building",
  "travel-to-map",
  "move-on-same-map",
  "change-object-behaviour",
  "activate-object",
  "deactivate-object",
  "show-object",
  "hide-object",
  "play-animation",
  "stop-animation",
  "toggle-light",
  "execute-event",
];

export function createUid(prefix = "evt") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeSpecialEventTrigger(trigger = {}) {
  const rect = trigger?.shape && trigger.shape.type === "rectangle" ? trigger.shape : { type: "rectangle", x: 0, y: 0, width: 64, height: 64 };
  return {
    id: trigger.id || createUid("trigger"),
    name: trigger.name || "New Trigger",
    enabled: trigger.enabled !== false,
    triggerType: trigger.triggerType || "area-trigger",
    triggerCondition: trigger.triggerCondition || "player-enters",
    activationCondition: trigger.activationCondition || "enter",
    associatedObjects: Array.isArray(trigger.associatedObjects) ? trigger.associatedObjects : [],
    associatedObjectBehaviours: Array.isArray(trigger.associatedObjectBehaviours) ? trigger.associatedObjectBehaviours : [],
    entryDirection: trigger.entryDirection || "any",
    associatedArrowAssetId: trigger.associatedArrowAssetId || null,
    arrowAnimationEnabled: trigger.arrowAnimationEnabled !== false,
    destinationType: trigger.destinationType || "none",
    destinationMapId: trigger.destinationMapId || null,
    destinationSpawnPoint: trigger.destinationSpawnPoint || { x: 0, y: 0 },
    returnExitConfig: trigger.returnExitConfig || { enabled: false, mapId: null, spawnPoint: { x: 0, y: 0 } },
    actionType: trigger.actionType || "enter-inside-building",
    actionConfig: trigger.actionConfig || {},
    shape: {
      type: rect.type || "rectangle",
      x: Number(rect.x) || 0,
      y: Number(rect.y) || 0,
      width: Math.max(1, Number(rect.width) || 64),
      height: Math.max(1, Number(rect.height) || 64),
      points: Array.isArray(rect.points) ? rect.points : [],
    },
  };
}

export function createAreaTrigger(overrides = {}) {
  return normalizeSpecialEventTrigger({
    id: createUid("trigger"),
    name: "New Area Trigger",
    triggerType: "area-trigger",
    triggerCondition: "player-enters",
    activationCondition: "enter",
    destinationType: "none",
    actionType: "enter-inside-building",
    shape: { type: "rectangle", x: 64, y: 64, width: 96, height: 96 },
    ...overrides,
  });
}

export function clampTriggerToMap(trigger, mapWidth = 0, mapHeight = 0) {
  const normalized = normalizeSpecialEventTrigger(trigger);
  const width = Math.max(1, Number(mapWidth) || 1024);
  const height = Math.max(1, Number(mapHeight) || 1024);
  if (normalized.shape.type === "rectangle" || normalized.shape.type === "circle") {
    normalized.shape.x = Math.max(0, Math.min(normalized.shape.x, width));
    normalized.shape.y = Math.max(0, Math.min(normalized.shape.y, height));
    normalized.shape.width = Math.max(1, Math.min(normalized.shape.width, Math.max(1, width - normalized.shape.x)));
    normalized.shape.height = Math.max(1, Math.min(normalized.shape.height, Math.max(1, height - normalized.shape.y)));
  }
  return normalized;
}

export function computeTriggerBounds(trigger) {
  const shape = normalizeSpecialEventTrigger(trigger).shape;
  if (shape.type === "polygon" && Array.isArray(shape.points) && shape.points.length >= 3) {
    const xs = shape.points.map((pt) => Number(pt.x) || 0);
    const ys = shape.points.map((pt) => Number(pt.y) || 0);
    return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }
  return {
    x: Number(shape.x) || 0,
    y: Number(shape.y) || 0,
    width: Number(shape.width) || 1,
    height: Number(shape.height) || 1,
  };
}

export function normalizeMapCoordinate(value, mapSize) {
  const safeSize = Math.max(1, Number(mapSize) || 1);
  return Math.max(0, Math.min(1, Number(value) / safeSize));
}

export function denormalizeMapCoordinate(value, mapSize) {
  const safeSize = Math.max(1, Number(mapSize) || 1);
  return Number(value) * safeSize;
}

export function resizeEventCoordinates(events, oldWidth = 1, oldHeight = 1, newWidth = 1, newHeight = 1) {
  const safeOldWidth = Math.max(1, Number(oldWidth) || 1);
  const safeOldHeight = Math.max(1, Number(oldHeight) || 1);
  const safeNewWidth = Math.max(1, Number(newWidth) || 1);
  const safeNewHeight = Math.max(1, Number(newHeight) || 1);
  const sx = safeNewWidth / safeOldWidth;
  const sy = safeNewHeight / safeOldHeight;

  return (Array.isArray(events) ? events : []).map((event) => {
    const next = normalizeSpecialEventTrigger(event);
    const bounds = computeTriggerBounds(next);
    const nextShape = { ...next.shape };
    nextShape.x = bounds.x * sx;
    nextShape.y = bounds.y * sy;
    if (nextShape.type === "rectangle" || nextShape.type === "circle") {
      nextShape.width = Math.max(1, (bounds.width || 1) * sx);
      nextShape.height = Math.max(1, (bounds.height || 1) * sy);
    }
    if (nextShape.type === "polygon" && Array.isArray(nextShape.points)) {
      nextShape.points = nextShape.points.map((point) => ({
        x: Number(point.x) * sx,
        y: Number(point.y) * sy,
      }));
    }
    next.shape = nextShape;
    return next;
  });
}

export function getNearbyTriggers(triggerList, x, y, radius = 40) {
  const list = Array.isArray(triggerList) ? triggerList : [];
  return list.filter((trigger) => {
    const bounds = computeTriggerBounds(trigger);
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    return Math.hypot(centerX - x, centerY - y) <= radius + Math.max(bounds.width, bounds.height) / 2;
  });
}

export function createDefaultSpecialEventConfig(mapId) {
  return {
    id: createUid("special-event"),
    map_id: mapId,
    status: "enabled",
    name: "Special Event",
    events: [],
    updated_at: new Date().toISOString(),
  };
}

export async function fetchSpecialEventsForMap(mapId) {
  if (!mapId) return [];
  try {
    const createClient = await getSupabaseClient();
    if (!createClient) return [];
    const db = createClient();
    const { data, error } = await db
      .from("special_events")
      .select("id, map_id, event_data, name, status, updated_at")
      .eq("map_id", mapId)
      .order("updated_at", { ascending: false });

    if (error) return [];
    return (Array.isArray(data) ? data : []).map((row) => ({
      id: row.id,
      map_id: row.map_id,
      name: row.name || "Special Event",
      status: row.status || "enabled",
      updated_at: row.updated_at || new Date().toISOString(),
      events: Array.isArray(row.event_data?.events) ? row.event_data.events.map(normalizeSpecialEventTrigger) : [],
      event_data: row.event_data || { events: [] },
    }));
  } catch {
    return [];
  }
}

export async function saveSpecialEventsForMap(mapId, config) {
  if (!mapId) throw new Error("A map is required before saving special events.");
  const normalizedConfig = {
    id: config?.id || createUid("special-event"),
    map_id: mapId,
    name: config?.name || "Special Events",
    status: config?.status || "enabled",
    updated_at: new Date().toISOString(),
    event_data: {
      ...config?.event_data,
      events: Array.isArray(config?.event_data?.events || config?.events)
        ? (config?.event_data?.events || config?.events || []).map(normalizeSpecialEventTrigger)
        : [],
    },
  };

  try {
    const createClient = await getSupabaseClient();
    if (!createClient) return { id: normalizedConfig.id, ok: true, fallback: true };
    const db = createClient();
    const { data, error } = await db
      .from("special_events")
      .upsert(
        {
          id: normalizedConfig.id,
          map_id: mapId,
          name: normalizedConfig.name,
          status: normalizedConfig.status,
          event_data: normalizedConfig.event_data,
          updated_at: normalizedConfig.updated_at,
        },
        { onConflict: "id" }
      )
      .select("id, map_id")
      .maybeSingle();

    if (error) throw error;
    return { id: data?.id || normalizedConfig.id, ok: true };
  } catch {
    return { id: normalizedConfig.id, ok: true, fallback: true };
  }
}

export function buildEventExecutionPlan(trigger, actionContext = {}) {
  const nextTrigger = normalizeSpecialEventTrigger(trigger);
  return {
    triggerId: nextTrigger.id,
    triggerName: nextTrigger.name,
    condition: nextTrigger.triggerCondition,
    activation: nextTrigger.activationCondition,
    actionType: nextTrigger.actionType,
    actionConfig: {
      ...nextTrigger.actionConfig,
      destinationMapId: nextTrigger.destinationMapId || actionContext.destinationMapId || null,
      destinationSpawnPoint: nextTrigger.destinationSpawnPoint || actionContext.destinationSpawnPoint || { x: 0, y: 0 },
    },
  };
}
