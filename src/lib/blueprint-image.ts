import { BOARD_HEIGHT, BOARD_WIDTH } from "@/lib/strategy";

// One rasterization per floor URL, shared by the enhanced-mode analysis
// and the reinforce/hole click detection.
const imageDataCache = new Map<string, ImageData>();

/**
 * Rasterizes a blueprint to board-resolution pixels, cached per URL.
 * Returns null on a tainted canvas (blueprint served without CORS) — the
 * board still works, markers just place unfitted.
 */
export function getBlueprintImageData(
  image: HTMLImageElement,
  url: string,
): ImageData | null {
  const cached = imageDataCache.get(url);
  if (cached) return cached;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = BOARD_WIDTH;
    canvas.height = BOARD_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    const data = context.getImageData(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    imageDataCache.set(url, data);
    return data;
  } catch {
    return null;
  }
}
