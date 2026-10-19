/**
 * Image helpers shared by the inline catalog editors.
 *
 * Card media must never be distorted, so every uploaded file is normalised
 * before it is stored: bounded to a sensible resolution and encoded as JPEG
 * (or kept as-is for SVG/GIF). This also keeps localStorage well under the
 * browser quota when several images are replaced.
 */

export const MAX_IMAGE_FILE_BYTES = 8 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read that image file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('That file is not a readable image.'));
    image.src = src;
  });
}

async function compressDataUrl(
  dataUrl: string,
  maxDimension: number,
  quality: number
): Promise<string> {
  const image = await loadImage(dataUrl);
  const widestSide = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const scale = widestSide > maxDimension ? maxDimension / widestSide : 1;
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return dataUrl;

  // A white matte avoids black fringes when a transparent PNG is re-encoded.
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function optimizeImageFile(
  file: File,
  options: { maxDimension?: number; quality?: number } = {}
): Promise<string> {
  const { maxDimension = 1200, quality = 0.82 } = options;

  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (PNG, JPG, WEBP or GIF).');
  }
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    throw new Error('That image is larger than 8 MB. Please choose a smaller file.');
  }

  const raw = await readFileAsDataUrl(file);

  try {
    // Rasterising SVG/GIF covers as well keeps localStorage under quota; card
    // art is static, so losing GIF animation is an acceptable trade-off.
    return await compressDataUrl(raw, maxDimension, quality);
  } catch {
    // A browser that cannot decode the file still gets a usable data URL.
    return raw;
  }
}
