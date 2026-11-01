function keyFor(x, y) {
  return `${x},${y}`;
}

export function selectionPixelsFromRect(selection, pixels = {}) {
  if (!selection) return [];
  const picked = [];
  for (let y = selection.y; y < selection.y + selection.height; y += 1) {
    for (let x = selection.x; x < selection.x + selection.width; x += 1) {
      const color = pixels[keyFor(x, y)];
      if (color) picked.push({ x, y, color });
    }
  }
  return picked;
}

export function moveSelectionPixels({ basePixels, selection, selectedPixels, dx, dy, canvasWidth, canvasHeight }) {
  if (!selection || selectedPixels.length === 0) {
    return {
      pixels: { ...basePixels },
      selection: { ...selection },
      selectedPixels: [...selectedPixels],
      moved: false,
    };
  }

  const nextPixels = { ...basePixels };
  const movedPixels = [];

  for (const pixel of selectedPixels) {
    const nextX = pixel.x + dx;
    const nextY = pixel.y + dy;
    if (nextX < 0 || nextY < 0 || nextX >= canvasWidth || nextY >= canvasHeight) {
      return {
        pixels: { ...basePixels },
        selection: { ...selection },
        selectedPixels: [...selectedPixels],
        moved: false,
      };
    }
  }

  for (const pixel of selectedPixels) delete nextPixels[keyFor(pixel.x, pixel.y)];

  for (const pixel of selectedPixels) {
    const nextX = pixel.x + dx;
    const nextY = pixel.y + dy;
    const nextKey = keyFor(nextX, nextY);
    nextPixels[nextKey] = pixel.color;
    movedPixels.push({ x: nextX, y: nextY, color: pixel.color });
  }

  return {
    pixels: nextPixels,
    selection: { x: selection.x + dx, y: selection.y + dy, width: selection.width, height: selection.height },
    selectedPixels: movedPixels,
    moved: true,
  };
}

export function transformSelectionPixels({ basePixels, selection, selectedPixels, mode, canvasWidth, canvasHeight }) {
  if (!selection || selectedPixels.length === 0) {
    return {
      pixels: { ...basePixels },
      selection: { ...selection },
      selectedPixels: [...selectedPixels],
      changed: false,
    };
  }

  const nextPixels = { ...basePixels };
  const transformedPixels = [];
  const nextSelection = { ...selection };

  for (const pixel of selectedPixels) delete nextPixels[keyFor(pixel.x, pixel.y)];

  const normalizedSelection = {
    x: selection.x,
    y: selection.y,
    width: selection.width,
    height: selection.height,
  };

  for (const pixel of selectedPixels) {
    const relX = pixel.x - normalizedSelection.x;
    const relY = pixel.y - normalizedSelection.y;
    let nextX = pixel.x;
    let nextY = pixel.y;

    if (mode === "flip-horizontal") {
      nextX = normalizedSelection.x + (normalizedSelection.width - 1 - relX);
      nextY = normalizedSelection.y + relY;
    } else if (mode === "flip-vertical") {
      nextX = normalizedSelection.x + relX;
      nextY = normalizedSelection.y + (normalizedSelection.height - 1 - relY);
    } else if (mode === "rotate-left") {
      nextX = normalizedSelection.x + (normalizedSelection.height - 1 - relY);
      nextY = normalizedSelection.y + relX;
    } else if (mode === "rotate-right") {
      nextX = normalizedSelection.x + relY;
      nextY = normalizedSelection.y + (normalizedSelection.width - 1 - relX);
    }

    if (nextX < 0 || nextY < 0 || nextX >= canvasWidth || nextY >= canvasHeight) {
      return {
        pixels: { ...basePixels },
        selection: { ...selection },
        selectedPixels: [...selectedPixels],
        changed: false,
      };
    }

    nextPixels[keyFor(nextX, nextY)] = pixel.color;
    transformedPixels.push({ x: nextX, y: nextY, color: pixel.color });
  }

  if (mode === "rotate-left" || mode === "rotate-right") {
    nextSelection.width = selection.height;
    nextSelection.height = selection.width;
  }

  return {
    pixels: nextPixels,
    selection: nextSelection,
    selectedPixels: transformedPixels,
    changed: true,
  };
}

export function deleteSelectionPixels(basePixels, selectedPixels) {
  const nextPixels = { ...basePixels };
  for (const pixel of selectedPixels) delete nextPixels[keyFor(pixel.x, pixel.y)];
  return nextPixels;
}
