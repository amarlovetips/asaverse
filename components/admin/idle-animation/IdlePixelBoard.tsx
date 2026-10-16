"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { IdlePixelShape } from "./IdleShapeSelector";
import type { IdlePixelTool } from "./IdlePixelToolSelector";
import type { PixelCoordinate } from "./IdlePixelMoveControls";
import IdleCoordinateRulers from "./IdleCoordinateRulers";

const CELL = 10;

type Props = {
  size: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  pixels: Record<string, string>;
  bodyPixels: Record<string, string>;
  facePixels: Record<string, string>;
  showBody: boolean;
  showFace: boolean;
  extraLayers?: { pixels: Record<string, string>; visible: boolean }[];
  showPixels?: boolean;
  overlayOpacity?: number;
  color: string;
  tool: IdlePixelTool;
  shape: IdlePixelShape;
  selectedPixels: PixelCoordinate[];
  onSelectPixels: (pixels: PixelCoordinate[]) => void;
  onMoveSelection: (dx: number, dy: number) => boolean;
  onPixelsChange: (pixels: Record<string, string>) => void;
};

type Point = { x: number; y: number };
type ZoomAnchor = { x: number; y: number; pointerX: number; pointerY: number };
type PanOrigin = { pointerId: number; x: number; y: number; left: number; top: number };
const EMPTY_EXTRA_LAYERS: NonNullable<Props["extraLayers"]> = [];

export default function IdlePixelBoard({ size, zoom, onZoomChange, pixels, bodyPixels, facePixels, showBody, showFace, extraLayers = EMPTY_EXTRA_LAYERS, showPixels = true, overlayOpacity = 0.38, color, tool, shape, selectedPixels, onSelectPixels, onMoveSelection, onPixelsChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const zoomAnchor = useRef<ZoomAnchor | null>(null);
  const panOrigin = useRef<PanOrigin | null>(null);
  const workingPixels = useRef<Record<string, string>>(pixels);
  const drawing = useRef(false);
  const startPoint = useRef<Point | null>(null);
  const previousPoint = useRef<Point | null>(null);
  const selectionStart = useRef<Point | null>(null);
  const draggingSelection = useRef(false);
  const dragOrigin = useRef<Point | null>(null);
  const dirty = useRef(false);
  const [draftEnd, setDraftEnd] = useState<Point | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const extent = size * CELL;

  useEffect(() => {
    workingPixels.current = pixels;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, extent, extent);
    drawGridBackground(context, extent);

    if (showBody) {
      context.globalAlpha = overlayOpacity;
      drawPixels(context, bodyPixels, size);
      context.globalAlpha = 1;
    }
    if (showFace) {
      context.globalAlpha = overlayOpacity;
      drawPixels(context, facePixels, size);
      context.globalAlpha = 1;
    }
    for (const layer of extraLayers) if (layer.visible) {
      context.globalAlpha = overlayOpacity;
      drawPixels(context, layer.pixels, size);
      context.globalAlpha = 1;
    }
    const displayPixels = { ...pixels };
    if (draggingSelection.current && (dragOffset.x || dragOffset.y)) {
      const moved = selectedPixels.map(point => ({ x: point.x + dragOffset.x, y: point.y + dragOffset.y }));
      selectedPixels.forEach(point => delete displayPixels[point.x + "," + point.y]);
      moved.forEach((point, index) => {
        if (point.x >= 0 && point.y >= 0 && point.x < size && point.y < size) {
          displayPixels[point.x + "," + point.y] = pixels[selectedPixels[index].x + "," + selectedPixels[index].y];
        }
      });
    }
    if (showPixels) drawPixels(context, displayPixels, size);

    if (draftEnd && startPoint.current && shape !== "freehand" && tool !== "select" && tool !== "erase") {
      context.globalAlpha = 0.7;
      context.fillStyle = color || "#ffffff";
      for (const point of shapePoints(startPoint.current, draftEnd, shape)) {
        context.fillRect(point.x * CELL + 1, point.y * CELL + 1, CELL - 1, CELL - 1);
      }
      context.globalAlpha = 1;
    }

    for (let index = 0; index <= size; index++) {
      const major = index % 10 === 0;
      const coordinate = index * CELL + 0.5;
      context.beginPath();
      context.strokeStyle = major ? "rgba(203, 213, 225, 0.30)" : "rgba(203, 213, 225, 0.14)";
      context.lineWidth = major ? 1 : 0.5;
      context.moveTo(coordinate, 0);
      context.lineTo(coordinate, extent);
      context.moveTo(0, coordinate);
      context.lineTo(extent, coordinate);
      context.stroke();
    }
    if (selectedPixels.length) {
      context.fillStyle = "rgba(250, 204, 21, 0.12)";
      context.strokeStyle = "#facc15";
      context.lineWidth = 1.5;
      context.setLineDash([3, 2]);
      for (const pixel of selectedPixels) {
        const x = pixel.x + (draggingSelection.current ? dragOffset.x : 0);
        const y = pixel.y + (draggingSelection.current ? dragOffset.y : 0);
        context.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        context.strokeRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      }
      context.setLineDash([]);
    }
    if (selectionStart.current && draftEnd && !draggingSelection.current) {
      context.strokeStyle = "#facc15";
      context.lineWidth = 1.5;
      context.setLineDash([4, 3]);
      const left = Math.min(selectionStart.current.x, draftEnd.x) * CELL + 1;
      const top = Math.min(selectionStart.current.y, draftEnd.y) * CELL + 1;
      const width = (Math.abs(selectionStart.current.x - draftEnd.x) + 1) * CELL - 2;
      const height = (Math.abs(selectionStart.current.y - draftEnd.y) + 1) * CELL - 2;
      context.strokeRect(left, top, width, height);
      context.setLineDash([]);
    }
  }, [pixels, bodyPixels, facePixels, showBody, showFace, extraLayers, showPixels, overlayOpacity, size, extent, color, tool, shape, draftEnd, selectedPixels, dragOffset]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const anchor = zoomAnchor.current;
    if (!viewport || !anchor) return;
    zoomAnchor.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const viewportRect = viewport.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    viewport.scrollLeft += canvasRect.left - viewportRect.left + canvasRect.width * anchor.x - anchor.pointerX;
    viewport.scrollTop += canvasRect.top - viewportRect.top + canvasRect.height * anchor.y - anchor.pointerY;
  }, [zoom]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const delta = event.deltaY || event.deltaX;
      if (!delta) return;
      const nextZoom = Math.max(0.5, Math.min(4, +(zoom * Math.pow(1.0015, -delta)).toFixed(3)));
      if (nextZoom === zoom) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      const bounds = viewport.getBoundingClientRect();
      if (rect) zoomAnchor.current = {
        x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
        pointerX: event.clientX - bounds.left,
        pointerY: event.clientY - bounds.top,
      };
      onZoomChange(nextZoom);
    };
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [zoom, onZoomChange]);

  function panStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 1) return;
    event.preventDefault();
    event.stopPropagation();
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.setPointerCapture(event.pointerId);
    panOrigin.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
  }

  function panMove(event: ReactPointerEvent<HTMLDivElement>) {
    const origin = panOrigin.current;
    const viewport = viewportRef.current;
    if (!origin || origin.pointerId !== event.pointerId || !viewport) return;
    event.preventDefault();
    viewport.scrollLeft = origin.left - (event.clientX - origin.x);
    viewport.scrollTop = origin.top - (event.clientY - origin.y);
  }

  function panEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (panOrigin.current?.pointerId !== event.pointerId) return;
    panOrigin.current = null;
    if (viewportRef.current?.hasPointerCapture(event.pointerId)) viewportRef.current.releasePointerCapture(event.pointerId);
  }

  function coordinate(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(size - 1, Math.floor((event.clientX - rect.left) / rect.width * size))),
      y: Math.max(0, Math.min(size - 1, Math.floor((event.clientY - rect.top) / rect.height * size))),
    };
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLCanvasElement>) {
    if (tool !== "select" || !selectedPixels.length) return;
    const direction = event.key === "ArrowUp" ? [0, -1]
      : event.key === "ArrowDown" ? [0, 1]
      : event.key === "ArrowLeft" ? [-1, 0]
      : event.key === "ArrowRight" ? [1, 0] : null;
    if (!direction) return;
    event.preventDefault();
    const distance = event.shiftKey ? 10 : 1;
    onMoveSelection(direction[0] * distance, direction[1] * distance);
  }

  function setPixel(context: CanvasRenderingContext2D, point: Point) {
    const key = point.x + "," + point.y;
    if (tool === "erase") {
      delete workingPixels.current[key];
      paintEmptyCell(context, point.x, point.y);
      const overlays = [showBody ? bodyPixels : {}, showFace ? facePixels : {}, ...extraLayers.filter(layer => layer.visible).map(layer => layer.pixels)];
      for (const overlay of overlays) {
        if (/^#[0-9a-f]{6}$/i.test(overlay[key] || "")) {
          context.globalAlpha = overlayOpacity;
          context.fillStyle = overlay[key];
          context.fillRect(point.x * CELL, point.y * CELL, CELL, CELL);
          context.globalAlpha = 1;
        }
      }
      dirty.current = true;
      return;
    }
    if (!color) return;
    workingPixels.current = { ...workingPixels.current, [key]: color };
    if (showPixels) {
      context.fillStyle = color;
      context.fillRect(point.x * CELL + 1, point.y * CELL + 1, CELL - 1, CELL - 1);
    }
    dirty.current = true;
  }

  function paintSegment(context: CanvasRenderingContext2D, from: Point, to: Point) {
    const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
    for (let step = 0; step <= steps; step++) {
      const point = {
        x: Math.round(from.x + (to.x - from.x) * step / Math.max(1, steps)),
        y: Math.round(from.y + (to.y - from.y) * step / Math.max(1, steps)),
      };
      setPixel(context, point);
    }
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0) return;
    const point = coordinate(event);
    if (tool === "select") {
      event.currentTarget.focus({ preventScroll: true });
      const selectionKeys = new Set(selectedPixels.map(pixel => pixel.x + "," + pixel.y));
      const pointKey = point.x + "," + point.y;
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        const clickedPixels = pixelsInRectangle(point, point, pixels);
        const nextSelection = new Map(selectedPixels.map(pixel => [pixel.x + "," + pixel.y, pixel]));
        for (const pixel of clickedPixels) {
          const key = pixel.x + "," + pixel.y;
          if ((event.ctrlKey || event.metaKey) && nextSelection.has(key)) nextSelection.delete(key);
          else nextSelection.set(key, pixel);
        }
        onSelectPixels([...nextSelection.values()]);
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      drawing.current = true;
      if (selectionKeys.has(pointKey)) {
        draggingSelection.current = true;
        dragOrigin.current = point;
        setDragOffset({ x: 0, y: 0 });
      } else {
        draggingSelection.current = false;
        selectionStart.current = point;
        setDraftEnd(point);
        onSelectPixels(pixelsInRectangle(point, point, pixels));
      }
      return;
    }
    if (shape !== "freehand" && tool === "paint") {
      startPoint.current = point;
      setDraftEnd(point);
      event.currentTarget.setPointerCapture(event.pointerId);
      drawing.current = true;
      return;
    }
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    previousPoint.current = point;
    paintSegment(context, point, point);
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const point = coordinate(event);
    if (tool === "select") {
      if (draggingSelection.current && dragOrigin.current) {
        setDragOffset({ x: point.x - dragOrigin.current.x, y: point.y - dragOrigin.current.y });
      } else if (selectionStart.current) {
        setDraftEnd(point);
        onSelectPixels(pixelsInRectangle(selectionStart.current, point, pixels));
      }
      return;
    }
    if (shape !== "freehand" && tool === "paint") {
      setDraftEnd(point);
      return;
    }
    if (!previousPoint.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    paintSegment(context, previousPoint.current, point);
    previousPoint.current = point;
  }

  function finish(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    if (tool === "select") {
      if (draggingSelection.current && (dragOffset.x || dragOffset.y)) onMoveSelection(dragOffset.x, dragOffset.y);
      drawing.current = false;
      draggingSelection.current = false;
      dragOrigin.current = null;
      selectionStart.current = null;
      setDragOffset({ x: 0, y: 0 });
      setDraftEnd(null);
      return;
    }
    const endpoint = coordinate(event);
    if (shape !== "freehand" && tool === "paint" && startPoint.current) {
      const context = event.currentTarget.getContext("2d");
      if (context) {
        for (const point of shapePoints(startPoint.current, endpoint, shape)) setPixel(context, point);
      }
    }
    drawing.current = false;
    previousPoint.current = null;
    startPoint.current = null;
    setDraftEnd(null);
    if (dirty.current) onPixelsChange(workingPixels.current);
    dirty.current = false;
  }

  return <section className="flex h-full min-h-0 flex-col" aria-label="Pixel art board">
    <div ref={viewportRef} onPointerDown={panStart} onPointerMove={panMove} onPointerUp={panEnd} onPointerCancel={panEnd}
      onLostPointerCapture={panEnd} onAuxClick={event => event.preventDefault()}
      className="flex min-h-0 flex-1 items-start justify-start overflow-auto overscroll-contain rounded-lg border border-slate-800 bg-[#0b1018] p-2 sm:p-3">
      <div className="m-auto grid grid-cols-[24px_minmax(0,1fr)] grid-rows-[24px_auto] gap-x-1" style={{ width: `${zoom * 100}%`, maxWidth: zoom <= 1 ? "min(100%, 74vh)" : undefined, minWidth: zoom > 1 ? `${zoom * 100}%` : undefined }}>
        <div />
        <IdleCoordinateRulers size={size} axis="x" />
        <div className="relative min-h-0">
          <IdleCoordinateRulers size={size} axis="y" />
        </div>
        <canvas ref={canvasRef} width={extent} height={extent} aria-label="Numbered idle animation pixel board"
          onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}
          onKeyDown={moveWithKeyboard} tabIndex={0} title="Scroll to zoom. Select pixels with Shift-click or Ctrl/Command-click; use arrow keys to move."
          className="block h-auto w-full touch-none cursor-crosshair border border-slate-600 outline-none focus-visible:border-cyan-400 [image-rendering:pixelated]"
          style={{ aspectRatio: "1 / 1" }} />
      </div>
    </div>
  </section>;
}

function drawPixels(context: CanvasRenderingContext2D, pixels: Record<string, string>, size: number) {
  for (const [key, fill] of Object.entries(pixels)) {
    const [x, y] = key.split(",").map(Number);
    if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < size && y >= 0 && y < size && /^#[0-9a-f]{6}$/i.test(fill)) {
      context.fillStyle = fill;
      context.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
}

function drawGridBackground(context: CanvasRenderingContext2D, extent: number) {
  context.fillStyle = "#202832";
  context.fillRect(0, 0, extent, extent);
}

function paintEmptyCell(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillStyle = "#202832";
  context.fillRect(x * CELL, y * CELL, CELL, CELL);
}

function pixelsInRectangle(start: Point, end: Point, pixels: Record<string, string>): Point[] {
  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);
  return Object.keys(pixels).flatMap(key => {
    const [x, y] = key.split(",").map(Number);
    return Number.isInteger(x) && Number.isInteger(y) && x >= left && x <= right && y >= top && y <= bottom ? [{ x, y }] : [];
  });
}

function shapePoints(start: Point, end: Point, shape: IdlePixelShape): Point[] {
  const points: Point[] = [];
  if (shape === "line") {
    const steps = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
    for (let step = 0; step <= steps; step++) points.push({
      x: Math.round(start.x + (end.x - start.x) * step / Math.max(1, steps)),
      y: Math.round(start.y + (end.y - start.y) * step / Math.max(1, steps)),
    });
    return points;
  }
  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);
  if (shape === "rectangle") {
    for (let x = left; x <= right; x++) {
      points.push({ x, y: top });
      if (bottom !== top) points.push({ x, y: bottom });
    }
    for (let y = top + 1; y < bottom; y++) {
      points.push({ x: left, y });
      if (right !== left) points.push({ x: right, y });
    }
    return points;
  }
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const radiusX = Math.max((right - left) / 2, 0.5);
  const radiusY = Math.max((bottom - top) / 2, 0.5);
  for (let x = left; x <= right; x++) for (let y = top; y <= bottom; y++) {
    const distance = Math.abs(((x - centerX) ** 2 / radiusX ** 2) + ((y - centerY) ** 2 / radiusY ** 2) - 1);
    if (distance <= 0.9) points.push({ x, y });
  }
  return points.length ? points : [{ x: Math.round(centerX), y: Math.round(centerY) }];
}
