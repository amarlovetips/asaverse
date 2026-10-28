"use client";

import { useEffect, useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

const CELL = 10;

type Point = { x: number; y: number };

type Props = {
  size: number;
  zoom: number;
  pixels: Record<string, string>;
  tool: "paint" | "erase" | "select";
  color: string;
  onPixelsChange: (pixels: Record<string, string>) => void;
  selected: Point[];
  onSelect: (points: Point[]) => void;
};

// Standalone equipment-animation frame board. Concepts follow the studio
// canvases, but this is separate Equipment code and state.
export default function EquipmentFrameBoard({ size, zoom, pixels, tool, color, onPixelsChange, selected, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const working = useRef<Record<string, string>>(pixels);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const marquee = useRef<{ start: Point; end: Point } | null>(null);
  const dragging = useRef(false);
  const dragOrigin = useRef<Point | null>(null);
  const dragOffset = useRef<Point>({ x: 0, y: 0 });
  const drawRef = useRef<() => void>(() => {});
  const drawFrame = useRef(0);
  const extent = size * CELL;

  function scheduleDraw() {
    if (drawFrame.current) return;
    drawFrame.current = requestAnimationFrame(() => { drawFrame.current = 0; drawRef.current(); });
  }

  useEffect(() => () => {
    if (drawFrame.current) cancelAnimationFrame(drawFrame.current);
    drawFrame.current = 0;
  }, []);

  function draw() {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, extent, extent);
    context.fillStyle = "#202832";
    context.fillRect(0, 0, extent, extent);
    for (const [key, fill] of Object.entries(pixels)) {
      const [x, y] = key.split(",").map(Number);
      if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < size && y >= 0 && y < size && /^#[0-9a-f]{6}$/i.test(fill)) {
        context.fillStyle = fill;
        context.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
    context.strokeStyle = "rgba(203, 213, 225, 0.14)";
    context.lineWidth = 0.5;
    context.beginPath();
    for (let index = 0; index <= size; index++) {
      const coordinate = index * CELL + 0.5;
      context.moveTo(coordinate, 0);
      context.lineTo(coordinate, extent);
      context.moveTo(0, coordinate);
      context.lineTo(extent, coordinate);
    }
    context.stroke();
    const activeMarquee = marquee.current;
    if (activeMarquee && !dragging.current) {
      context.strokeStyle = "#facc15";
      context.lineWidth = 1.5;
      context.setLineDash([4, 3]);
      context.strokeRect(
        Math.min(activeMarquee.start.x, activeMarquee.end.x) * CELL + 0.5,
        Math.min(activeMarquee.start.y, activeMarquee.end.y) * CELL + 0.5,
        (Math.abs(activeMarquee.start.x - activeMarquee.end.x) + 1) * CELL,
        (Math.abs(activeMarquee.start.y - activeMarquee.end.y) + 1) * CELL,
      );
      context.setLineDash([]);
    }
    if (selected.length) {
      const offset = dragging.current ? dragOffset.current : { x: 0, y: 0 };
      const keys = new Set(selected.map(point => `${point.x},${point.y}`));
      context.fillStyle = "rgba(250, 204, 21, 0.14)";
      context.strokeStyle = "#facc15";
      context.lineWidth = 1.2;
      for (const point of selected) {
        const x = point.x + offset.x, y = point.y + offset.y;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        context.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        if (!keys.has(`${point.x - 1},${point.y}`)) { context.beginPath(); context.moveTo(x * CELL + 1, y * CELL + 1); context.lineTo(x * CELL + 1, (y + 1) * CELL - 1); context.stroke(); }
        if (!keys.has(`${point.x + 1},${point.y}`)) { context.beginPath(); context.moveTo((x + 1) * CELL - 1, y * CELL + 1); context.lineTo((x + 1) * CELL - 1, (y + 1) * CELL - 1); context.stroke(); }
        if (!keys.has(`${point.x},${point.y - 1}`)) { context.beginPath(); context.moveTo(x * CELL + 1, y * CELL + 1); context.lineTo((x + 1) * CELL - 1, y * CELL + 1); context.stroke(); }
        if (!keys.has(`${point.x},${point.y + 1}`)) { context.beginPath(); context.moveTo(x * CELL + 1, (y + 1) * CELL - 1); context.lineTo((x + 1) * CELL - 1, (y + 1) * CELL - 1); context.stroke(); }
      }
    }
  }

  useLayoutEffect(() => {
    working.current = pixels;
    drawRef.current = draw;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixels, size, selected]);

  function coordinate(event: ReactPointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(size - 1, Math.floor((event.clientX - rect.left) / rect.width * size))),
      y: Math.max(0, Math.min(size - 1, Math.floor((event.clientY - rect.top) / rect.height * size))),
    };
  }

  function paintAt(point: Point) {
    const key = `${point.x},${point.y}`;
    if (tool === "erase") {
      if (!(key in working.current)) return;
      working.current = { ...working.current };
      delete working.current[key];
    } else {
      if (working.current[key] === color) return;
      working.current = { ...working.current, [key]: color };
    }
    dirty.current = true;
    draw();
  }

  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0) return;
    const point = coordinate(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    if (tool === "select") {
      const selectedKeys = new Set(selected.map(pixel => `${pixel.x},${pixel.y}`));
      if (selectedKeys.has(`${point.x},${point.y}`)) {
        dragging.current = true;
        dragOrigin.current = point;
        dragOffset.current = { x: 0, y: 0 };
      } else {
        dragging.current = false;
        marquee.current = { start: point, end: point };
      }
      scheduleDraw();
      return;
    }
    paintAt(point);
  }

  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || tool !== "select") return;
    const point = coordinate(event);
    if (dragging.current && dragOrigin.current) {
      dragOffset.current = { x: point.x - dragOrigin.current.x, y: point.y - dragOrigin.current.y };
    } else if (marquee.current) {
      marquee.current = { start: marquee.current.start, end: point };
    }
    scheduleDraw();
  }

  function finish() {
    if (!drawing.current) return;
    drawing.current = false;
    if (tool === "select") {
      const activeMarquee = marquee.current;
      const offset = dragOffset.current;
      const wasDragging = dragging.current;
      marquee.current = null;
      dragging.current = false;
      dragOrigin.current = null;
      dragOffset.current = { x: 0, y: 0 };
      if (activeMarquee) {
        const left = Math.min(activeMarquee.start.x, activeMarquee.end.x);
        const right = Math.max(activeMarquee.start.x, activeMarquee.end.x);
        const top = Math.min(activeMarquee.start.y, activeMarquee.end.y);
        const bottom = Math.max(activeMarquee.start.y, activeMarquee.end.y);
        const points: Point[] = [];
        for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++)
          if (pixels[`${x},${y}`] !== undefined) points.push({ x, y });
        onSelect(points);
      } else if (wasDragging && (offset.x || offset.y)) {
        const next = { ...pixels };
        const colors = selected.map(point => pixels[`${point.x},${point.y}`]);
        for (const point of selected) delete next[`${point.x},${point.y}`];
        const moved: Point[] = [];
        selected.forEach((point, index) => {
          const x = point.x + offset.x, y = point.y + offset.y;
          if (x < 0 || y < 0 || x >= size || y >= size || colors[index] === undefined) return;
          next[`${x},${y}`] = colors[index];
          moved.push({ x, y });
        });
        onPixelsChange(next);
        onSelect(moved);
      }
      scheduleDraw();
      return;
    }
    if (dirty.current) {
      onPixelsChange(working.current);
      dirty.current = false;
    }
  }

  return <canvas ref={canvasRef} width={extent} height={extent}
    onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}
    aria-label="Equipment animation frame board" tabIndex={0}
    className="block touch-none border border-slate-600 [image-rendering:pixelated]"
    style={{ width: size * zoom, height: size * zoom, cursor: tool === "select" ? "default" : "crosshair" }} />;
}
