"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, Circle, Hand, MapPinned, MousePointer2, MoveDiagonal, PenTool, Plus, Search, Square, Trash2, Undo2, Redo2, ZoomIn, ZoomOut, ScanLine, Sparkles, Layers3, Map, Route, Compass, Wand2 } from "lucide-react";
import { listMaps, loadMap } from "./lib/saveLoad";
import { fetchSpecialEventsForMap, normalizeSpecialEventTrigger, saveSpecialEventsForMap } from "./lib/specialEvents.js";

const TOOLS = [
  { key: "select", label: "Select", icon: MousePointer2 },
  { key: "move", label: "Move", icon: Hand },
  { key: "pen", label: "Pen", icon: PenTool },
  { key: "rectangle", label: "Rectangle", icon: Square },
  { key: "ellipse", label: "Ellipse", icon: Circle },
  { key: "resize", label: "Resize", icon: MoveDiagonal },
  { key: "delete", label: "Delete", icon: Trash2 },
  { key: "undo", label: "Undo", icon: Undo2 },
  { key: "redo", label: "Redo", icon: Redo2 },
  { key: "zoom-in", label: "Zoom In", icon: ZoomIn },
  { key: "zoom-out", label: "Zoom Out", icon: ZoomOut },
  { key: "fit", label: "Fit", icon: ScanLine },
] as const;

const ADD_ITEMS = [
  { key: "event", label: "Add Event / Function", icon: Sparkles },
  { key: "area-trigger", label: "Add Area Trigger", icon: Square },
  { key: "object-behaviour", label: "Add Object Behaviour", icon: Layers3 },
  { key: "asset", label: "Add Tiles & Objects Asset", icon: Map },
  { key: "interaction", label: "Add Interaction", icon: Compass },
  { key: "map-travel", label: "Add Map Travel Connection", icon: Route },
  { key: "building-connection", label: "Add Building Interior Connection", icon: Building2 },
  { key: "entry-exit", label: "Add Entry / Exit Point", icon: MapPinned },
  { key: "spawn-point", label: "Add Spawn Point", icon: MapPinned },
  { key: "action", label: "Add Other Supported Event Actions", icon: Wand2 },
] as const;

type MapBounds = { width: number; height: number };
type EventShape = { type?: string; x?: number; y?: number; width?: number; height?: number; points?: Array<{ x: number; y: number }> };
type EventRecord = {
  id: string;
  name?: string;
  enabled?: boolean;
  triggerCondition?: string;
  actionType?: string;
  triggerType?: string;
  shape?: EventShape;
  associatedObjects?: Array<string>;
  associatedArrowAssetId?: string | null;
  destinationMapId?: string | null;
  destinationType?: string;
};
type MapListItem = { id: string; name?: string; is_published?: boolean; updated_at?: string };
type MapDataLike = { id?: string; name?: string; bounds?: MapBounds; placements?: Array<{ x: number; y: number; width: number; height: number }> };

function createEventId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getMapBounds(mapData: MapDataLike | null | undefined): MapBounds {
  if (mapData?.bounds && Number.isFinite(mapData.bounds.width) && Number.isFinite(mapData.bounds.height)) {
    return { width: mapData.bounds.width, height: mapData.bounds.height };
  }
  return { width: 2048, height: 2048 };
}

export default function SpecialEventsWorkspace() {
  const [maps, setMaps] = useState<MapListItem[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [mapData, setMapData] = useState<MapDataLike | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<(typeof TOOLS)[number]["key"]>("select");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [zoom, setZoom] = useState(0.72);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [eventHistory, setEventHistory] = useState<EventRecord[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const filteredMaps = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return maps;
    return maps.filter((map) => `${map.name ?? ""} ${map.id ?? ""}`.toLowerCase().includes(term));
  }, [maps, searchTerm]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? events[0] ?? null,
    [events, selectedEventId]
  );

  const mapBounds = useMemo(() => getMapBounds(mapData), [mapData]);

  const snapshotEvents = (nextEvents: EventRecord[]) => {
    setEvents(nextEvents);
    setEventHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const nextHistory = [...trimmed, nextEvents];
      const limited = nextHistory.slice(-30);
      setHistoryIndex(limited.length - 1);
      return limited;
    });
  };

  const commitEventSelection = (nextEvents: EventRecord[], nextSelectedId?: string | null) => {
    setEvents(nextEvents);
    setSelectedEventId(nextSelectedId ?? (nextEvents[0]?.id ?? null));
    setEventHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const nextHistory = [...trimmed, nextEvents];
      const limited = nextHistory.slice(-30);
      setHistoryIndex(limited.length - 1);
      return limited;
    });
  };

  function applyToolAction(toolKey: (typeof TOOLS)[number]["key"]) {
    setActiveTool(toolKey);

    if (toolKey === "undo") {
      if (historyIndex <= 0) return;
      const previousIndex = Math.max(0, historyIndex - 1);
      const previousEvents = eventHistory[previousIndex] ?? [];
      setHistoryIndex(previousIndex);
      setEvents(previousEvents);
      setSelectedEventId(previousEvents[0]?.id ?? null);
      return;
    }

    if (toolKey === "redo") {
      if (historyIndex >= eventHistory.length - 1) return;
      const nextIndex = historyIndex + 1;
      const nextEvents = eventHistory[nextIndex] ?? [];
      setHistoryIndex(nextIndex);
      setEvents(nextEvents);
      setSelectedEventId(nextEvents[0]?.id ?? null);
      return;
    }

    if (toolKey === "delete" && selectedEventId) {
      const remaining = events.filter((event) => event.id !== selectedEventId);
      commitEventSelection(remaining, remaining[0]?.id ?? null);
      return;
    }

    if (toolKey === "fit") {
      setZoom(0.72);
      setPan({ x: 0, y: 0 });
    }

    if (toolKey === "zoom-in") {
      setZoom((value) => Math.min(2.8, Number((value + 0.12).toFixed(2))));
    }

    if (toolKey === "zoom-out") {
      setZoom((value) => Math.max(0.28, Number((value - 0.12).toFixed(2))));
    }
  }

  useEffect(() => {
    let live = true;
    async function initMaps() {
      setLoading(true);
      try {
        const items = await listMaps();
        if (!live) return;
        setMaps(items || []);
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const mapIdFromQuery = params.get("mapId");
          if (mapIdFromQuery && items?.some((map) => map.id === mapIdFromQuery)) {
            setSelectedMapId(mapIdFromQuery);
          }
        }
      } catch {
        if (live) setMaps([]);
      } finally {
        if (live) setLoading(false);
      }
    }
    void initMaps();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (selectedMapId) {
      params.set("mapId", selectedMapId);
    } else {
      params.delete("mapId");
    }
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [selectedMapId]);

  useEffect(() => {
    if (!selectedMapId) return;

    const mapId = selectedMapId;
    let live = true;
    async function loadSelectedMap() {
      try {
        const currentMap = await loadMap(mapId);
        const rows = await fetchSpecialEventsForMap(mapId);
        if (!live) return;
        const allEvents = Array.isArray(rows?.[0]?.events) ? rows[0].events : [];
        setMapData(currentMap);
        setEvents(allEvents);
        setSelectedEventId(allEvents[0]?.id ?? null);
        setEventHistory([allEvents]);
        setHistoryIndex(0);
      } catch {
        if (live) {
          setMapData(null);
          setEvents([]);
          setSelectedEventId(null);
          setEventHistory([[]]);
          setHistoryIndex(0);
        }
      }
    }

    void loadSelectedMap();
    return () => { live = false; };
  }, [selectedMapId]);

  const handleOpenMap = (mapId: string) => {
    setSelectedMapId(mapId);
  };

  const handleBackToMaps = () => {
    setSelectedMapId(null);
    setMapData(null);
    setEvents([]);
    setSelectedEventId(null);
    setEventHistory([[]]);
    setHistoryIndex(0);
  };

  const handleCreateTrigger = (kind: (typeof ADD_ITEMS)[number]["key"]) => {
    const baseShape = { type: "rectangle", x: 120 + events.length * 32, y: 120 + events.length * 24, width: 160, height: 120 };
    const defaults: Record<string, Partial<EventRecord>> = {
      event: { name: "New Function Event", triggerType: "area-trigger", triggerCondition: "player-enters", actionType: "execute-event" },
      "area-trigger": { name: "New Area Trigger", triggerType: "area-trigger", triggerCondition: "player-enters", actionType: "activate-object" },
      "object-behaviour": { name: "Object Behaviour", triggerType: "object-behaviour", triggerCondition: "player-interacts", actionType: "change-object-behaviour" },
      asset: { name: "Tiles & Objects Asset", triggerType: "area-trigger", triggerCondition: "player-interacts", actionType: "show-object", associatedArrowAssetId: "asset-library-item" },
      interaction: { name: "Interaction", triggerType: "area-trigger", triggerCondition: "player-interacts", actionType: "toggle-light" },
      "map-travel": { name: "Map Travel", triggerType: "map-travel", triggerCondition: "player-interacts", actionType: "travel-to-map", destinationType: "map" },
      "building-connection": { name: "Building Connection", triggerType: "inside-building", triggerCondition: "player-enters", actionType: "enter-inside-building" },
      "entry-exit": { name: "Entry / Exit Point", triggerType: "area-trigger", triggerCondition: "player-enters", actionType: "exit-building" },
      "spawn-point": { name: "Spawn Point", triggerType: "area-trigger", triggerCondition: "player-enters", actionType: "move-on-same-map" },
      action: { name: "Supported Action", triggerType: "area-trigger", triggerCondition: "player-clicks", actionType: "show-object" },
    };

    const trigger = normalizeSpecialEventTrigger({
      ...defaults[kind],
      id: createEventId("trigger"),
      shape: baseShape,
    });

    const nextEvents = [...events, trigger];
    commitEventSelection(nextEvents, trigger.id);
    setShowAddMenu(false);
  };

  const handleUpdateSelected = (changes: Partial<EventRecord> & { shape?: EventShape }) => {
    if (!selectedEvent) return;
    const updated = normalizeSpecialEventTrigger({ ...selectedEvent, ...changes });
    const nextEvents = events.map((event) => (event.id === selectedEvent.id ? updated : event));
    snapshotEvents(nextEvents);
  };

  const handleSave = async () => {
    if (!selectedMapId) return;
    const payload = {
      id: `${selectedMapId}-special-events`,
      name: `Special Events for ${mapData?.name || selectedMapId}`,
      status: "enabled",
      event_data: { events },
    };
    const result = await saveSpecialEventsForMap(selectedMapId, payload);
    if (result?.ok) {
      setSaveStatus("Saved");
      setTimeout(() => setSaveStatus(null), 1800);
    }
  };

  return (
    <div className="h-full min-h-0 min-w-0 bg-slate-950 text-slate-200">
      {!selectedMapId ? (
        <div className="flex h-full flex-col p-4">
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-400">Special Events</div>
              <h2 className="text-xl font-semibold text-white">Saved maps</h2>
            </div>
            <div className="relative w-[280px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search map"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <div className="col-span-full rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-slate-400">Loading maps…</div>
            ) : filteredMaps.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center text-slate-400">
                No saved maps found.
              </div>
            ) : (
              filteredMaps.map((map) => (
                <button
                  key={map.id}
                  type="button"
                  onClick={() => handleOpenMap(map.id)}
                  className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 text-left transition hover:border-cyan-500 hover:bg-slate-900"
                >
                  <div className="flex h-32 items-center justify-center border-b border-slate-800 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.18),_transparent_60%)]">
                    <div className="flex h-20 w-28 items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-950/80 text-xs uppercase tracking-[0.2em] text-slate-400">
                      {map.name?.slice(0, 2)?.toUpperCase() || "MAP"}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-base font-semibold text-white">{map.name || "Untitled map"}</div>
                        <div className="mt-1 text-[11px] text-slate-400">{map.id}</div>
                      </div>
                      {map.is_published ? (
                        <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-300">
                          Published
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 text-[11px] text-slate-400">
                      {map.updated_at ? new Date(map.updated_at).toLocaleString() : "No recent update"}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/70 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToMaps}
                className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 hover:border-slate-500"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Maps
              </button>
              <div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-400">Map ID</div>
                <div className="text-sm font-medium text-white">{selectedMapId}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddMenu((value) => !value)}
                className="flex items-center gap-2 rounded border border-cyan-500 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100 hover:border-cyan-500"
              >
                Save
              </button>
              {saveStatus ? <span className="text-xs text-emerald-300">{saveStatus}</span> : null}
            </div>
          </div>

          {showAddMenu ? (
            <div className="absolute right-4 top-16 z-20 w-72 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
              <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">Add workspace item</div>
              <div className="grid gap-1.5">
                {ADD_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleCreateTrigger(item.key)}
                      className="flex items-center gap-2 rounded border border-slate-800 bg-slate-950/60 px-2 py-2 text-left text-sm text-slate-100 hover:border-cyan-500 hover:bg-slate-900"
                    >
                      <Icon className="h-4 w-4 text-cyan-300" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <main className="relative min-w-0 flex-1 border-r border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/60 px-3 py-2">
                {TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  const isActive = activeTool === tool.key;
                  return (
                    <button
                      key={tool.key}
                      type="button"
                      onClick={() => applyToolAction(tool.key)}
                      title={tool.label}
                      className={`flex items-center gap-1 rounded border px-2 py-1.5 text-xs font-medium ${
                        isActive ? "border-cyan-500 bg-cyan-500/10 text-cyan-200" : "border-slate-700 bg-slate-950 text-slate-300"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{tool.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="relative h-[calc(100%-49px)] overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.12),_transparent_60%)]" />
                <div
                  className="absolute left-1/2 top-1/2 origin-center"
                  style={{
                    width: mapBounds.width,
                    height: mapBounds.height,
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) translate(-50%, -50%)`,
                  }}
                >
                  <div className="h-full w-full rounded-xl border-2 border-slate-700 bg-slate-900/80 shadow-[0_0_0_1px_rgba(15,23,42,1)]">
                    <div className="h-full w-full bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px]" />
                    {mapData?.placements?.map((placement, index) => (
                      <div
                        key={`${placement.x}-${placement.y}-${index}`}
                        className="absolute rounded border border-slate-500 bg-cyan-500/10"
                        style={{
                          left: placement.x,
                          top: placement.y,
                          width: placement.width,
                          height: placement.height,
                        }}
                      />
                    ))}
                    {events.map((event) => {
                      const normalized = normalizeSpecialEventTrigger(event);
                      const bounds = {
                        x: normalized.shape.x,
                        y: normalized.shape.y,
                        width: normalized.shape.width,
                        height: normalized.shape.height,
                      };
                      const isSelected = selectedEvent?.id === event.id;
                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => setSelectedEventId(event.id)}
                          className={`absolute overflow-hidden rounded border text-left ${
                            isSelected ? "border-amber-300 bg-amber-500/20 shadow-[0_0_12px_rgba(251,191,36,0.35)]" : "border-cyan-400 bg-cyan-500/10"
                          }`}
                          style={{
                            left: bounds.x,
                            top: bounds.y,
                            width: bounds.width,
                            height: bounds.height,
                          }}
                        >
                          <div className="truncate bg-slate-950/70 px-1 text-[10px] text-cyan-100">{event.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </main>

            <aside className="w-[360px] bg-slate-900/70 p-3">
              <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-slate-400">Selected tool</div>
              <div className="mb-4 rounded border border-slate-700 bg-slate-950 p-2 text-sm text-slate-200">
                {TOOLS.find((tool) => tool.key === activeTool)?.label ?? "Select"}
              </div>

              <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-slate-400">Properties</div>
              {selectedEvent ? (
                <div className="space-y-3 text-sm">
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-400">Area Name</span>
                    <input
                      value={selectedEvent.name ?? ""}
                      onChange={(event) => handleUpdateSelected({ name: event.target.value })}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-white outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-400">Shape</span>
                    <select
                      value={selectedEvent.shape?.type ?? "rectangle"}
                      onChange={(event) => handleUpdateSelected({ shape: { ...selectedEvent.shape, type: event.target.value } })}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-white outline-none"
                    >
                      <option value="rectangle">Rectangle</option>
                      <option value="circle">Circle</option>
                      <option value="polygon">Polygon</option>
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-xs text-slate-400">X</span>
                      <input type="number" value={Math.round(selectedEvent.shape?.x ?? 0)} onChange={(event) => handleUpdateSelected({ shape: { ...selectedEvent.shape, x: Number(event.target.value) || 0 } })} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-white outline-none" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-slate-400">Y</span>
                      <input type="number" value={Math.round(selectedEvent.shape?.y ?? 0)} onChange={(event) => handleUpdateSelected({ shape: { ...selectedEvent.shape, y: Number(event.target.value) || 0 } })} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-white outline-none" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-slate-400">Width</span>
                      <input type="number" value={Math.round(selectedEvent.shape?.width ?? 120)} onChange={(event) => handleUpdateSelected({ shape: { ...selectedEvent.shape, width: Math.max(1, Number(event.target.value) || 1) } })} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-white outline-none" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-slate-400">Height</span>
                      <input type="number" value={Math.round(selectedEvent.shape?.height ?? 90)} onChange={(event) => handleUpdateSelected({ shape: { ...selectedEvent.shape, height: Math.max(1, Number(event.target.value) || 1) } })} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-white outline-none" />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-400">Trigger Condition</span>
                    <select value={selectedEvent.triggerCondition ?? "player-enters"} onChange={(event) => handleUpdateSelected({ triggerCondition: event.target.value })} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-white outline-none">
                      <option value="player-enters">Player enters an area</option>
                      <option value="player-leaves">Player leaves an area</option>
                      <option value="player-interacts">Player interacts with object</option>
                      <option value="player-clicks">Player clicks object</option>
                      <option value="interaction-key">E key interaction</option>
                      <option value="event-activation">Event activation</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-400">Associated Actions</span>
                    <select value={selectedEvent.actionType ?? "activate-object"} onChange={(event) => handleUpdateSelected({ actionType: event.target.value })} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-white outline-none">
                      <option value="activate-object">Activate object</option>
                      <option value="deactivate-object">Deactivate object</option>
                      <option value="show-object">Show object</option>
                      <option value="hide-object">Hide object</option>
                      <option value="travel-to-map">Travel to another map</option>
                      <option value="move-on-same-map">Move on same map</option>
                      <option value="change-object-behaviour">Change object behaviour</option>
                      <option value="execute-event">Execute another event</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-400">Destination Map</span>
                    <input
                      value={selectedEvent.destinationMapId ?? ""}
                      onChange={(event) => handleUpdateSelected({ destinationMapId: event.target.value || null })}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-white outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-400">Enabled</span>
                    <input
                      type="checkbox"
                      checked={selectedEvent.enabled !== false}
                      onChange={(event) => handleUpdateSelected({ enabled: event.target.checked })}
                      className="h-4 w-4 accent-cyan-500"
                    />
                  </label>
                </div>
              ) : (
                <div className="rounded border border-dashed border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-400">
                  Select an event on the map to edit its trigger and action settings.
                </div>
              )}
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
