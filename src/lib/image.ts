/** Scales (width, height) so the long edge is at most `max`, keeping aspect ratio. */
export function fitWithin(width: number, height: number, max = 1568) {
  const longEdge = Math.max(width, height);
  if (longEdge <= max) return { width, height };
  const scale = max / longEdge;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Small JPEG preview of a photo, for the thumbnail strip and History.
 * Rejects when this browser can't decode the file (e.g. HEIC outside Safari),
 * so the caller can say so instead of showing a broken thumbnail.
 */
export async function makeThumbnail(file: File, max = 320): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const size = fitWithin(bitmap.width, bitmap.height, max);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.7);
}
