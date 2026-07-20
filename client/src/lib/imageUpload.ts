// Tiny client-side image helper.
//
// We're on Firebase Spark (free tier) so Firebase Storage isn't available.
// Instead we resize/compress avatars to a small JPEG data URL (< ~25 KB) and
// store the data URL directly in the Firestore character doc. That keeps the
// whole feature free and avoids a second service.

const MAX_DIMENSION = 256; // px, longest side
const JPEG_QUALITY = 0.78;
const MAX_BYTES = 60_000; // hard ceiling so we never blow up Firestore doc size

export async function readFileAsImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file doesn't look like an image"));
      img.onload = () => resolve(img);
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** Resize + compress to a small square JPEG data URL. */
export async function compressAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("That image is too large. Pick something under 12 MB.");
  }

  const img = await readFileAsImage(file);

  // Crop to a centered square, then scale down so the largest side <= MAX_DIMENSION.
  const srcSide = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - srcSide) / 2;
  const sy = (img.naturalHeight - srcSide) / 2;

  const side = Math.min(srcSide, MAX_DIMENSION);
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process the image");

  // Smooth downscale
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, srcSide, srcSide, 0, 0, side, side);

  // Try progressively lower quality if the encoded size is too big
  let dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  let quality = JPEG_QUALITY;
  while (dataUrl.length > MAX_BYTES && quality > 0.35) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  if (dataUrl.length > MAX_BYTES) {
    throw new Error("Couldn't compress that image small enough. Try a different one.");
  }
  return dataUrl;
}
