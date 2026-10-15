export function readReferencePixels(imageUrl: string, size: number): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) { reject(new Error("Could not create an image canvas.")); return; }
      context.imageSmoothingEnabled = false;
      context.drawImage(image, 0, 0, size, size);
      const data = context.getImageData(0, 0, size, size).data, pixels: Record<string, string> = {};
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        if (data[i + 3] >= 36) pixels[`${x},${y}`] = `#${[data[i], data[i + 1], data[i + 2]].map(v => v.toString(16).padStart(2, "0")).join("")}`;
      }
      resolve(pixels);
    };
    image.onerror = () => reject(new Error("Could not read the reference image."));
    image.src = imageUrl;
  });
}
