export function drawPixelGrid(ctx: CanvasRenderingContext2D, width: number, height: number, zoom: number, pixels: Record<string, string>) {
  const extentX = width * zoom, extentY = height * zoom;
  ctx.clearRect(0, 0, extentX, extentY); ctx.imageSmoothingEnabled = false;
  for (const [key, color] of Object.entries(pixels)) {
    const [x, y] = key.split(",").map(Number);
    if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < width && y < height) {
      ctx.fillStyle = color; ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
    }
  }
  ctx.beginPath(); ctx.strokeStyle = "rgba(255,255,255,0.09)"; ctx.lineWidth = 0.5;
  for (let x = 0; x <= width; x++) { const pos = x * zoom + 0.25; ctx.moveTo(pos, 0); ctx.lineTo(pos, extentY); }
  for (let y = 0; y <= height; y++) { const pos = y * zoom + 0.25; ctx.moveTo(0, pos); ctx.lineTo(extentX, pos); }
  ctx.stroke();
}
