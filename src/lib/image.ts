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

/**
 * Prepares a photo for the AI: long edge ≤ 1568 px (Claude downsizes beyond
 * that anyway), re-encoded as JPEG, which also strips EXIF/location data.
 * Steps quality down if a huge photo is still over the upload limit.
 */
export async function compressForUpload(file: File, maxBytes = 3.8 * 1024 * 1024): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const size = fitWithin(bitmap.width, bitmap.height, 1568);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.fillStyle = "#ffffff"; // transparent PNGs become white, not black
  context.fillRect(0, 0, size.width, size.height);
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  for (const quality of [0.82, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= maxBytes) return blob;
  }
  throw new Error("Photo too large");
}

export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
