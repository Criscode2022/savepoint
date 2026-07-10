export const COVER_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif";

export const COVER_IMAGE_MAX_INPUT_BYTES = 5 * 1024 * 1024;
export const COVER_IMAGE_MAX_OUTPUT_BYTES = 480 * 1024;
export const COVER_IMAGE_MAX_WIDTH = 960;
export const COVER_IMAGE_JPEG_QUALITY = 0.82;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isAllowedImageType(type: string): boolean {
  return ALLOWED_MIME_TYPES.has(type);
}

export function isDataUrlImage(value: string): boolean {
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(value);
}

export function isHttpImageUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function normalizeCoverImage(
  value?: string | null,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (isDataUrlImage(trimmed) || isHttpImageUrl(trimmed)) {
    return trimmed;
  }

  return null;
}

export function formatImageSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Invalid image file"));
    image.src = src;
  });
}

function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64.length * 3) / 4);
}

function canvasToJpegDataUrl(
  canvas: HTMLCanvasElement,
  quality: number,
): string {
  return canvas.toDataURL("image/jpeg", quality);
}

async function resizeToJpegDataUrl(
  file: File,
  maxWidth: number,
  quality: number,
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(objectUrl);
    const scale = Math.min(1, maxWidth / Math.max(image.width, 1));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not process image");
    }

    context.drawImage(image, 0, 0, width, height);

    let nextQuality = quality;
    let dataUrl = canvasToJpegDataUrl(canvas, nextQuality);

    while (
      estimateDataUrlBytes(dataUrl) > COVER_IMAGE_MAX_OUTPUT_BYTES &&
      nextQuality > 0.5
    ) {
      nextQuality -= 0.08;
      dataUrl = canvasToJpegDataUrl(canvas, nextQuality);
    }

    if (estimateDataUrlBytes(dataUrl) > COVER_IMAGE_MAX_OUTPUT_BYTES) {
      throw new Error(
        "Image is still too large after compression. Try a smaller file.",
      );
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function processCoverImageFile(file: File): Promise<string> {
  if (!isAllowedImageType(file.type)) {
    throw new Error("Use JPG, PNG, WebP, or GIF.");
  }

  if (file.size > COVER_IMAGE_MAX_INPUT_BYTES) {
    throw new Error(
      `Image must be ${formatImageSize(COVER_IMAGE_MAX_INPUT_BYTES)} or smaller.`,
    );
  }

  if (file.type === "image/gif") {
    const dataUrl = await readFileAsDataUrl(file);
    if (estimateDataUrlBytes(dataUrl) > COVER_IMAGE_MAX_OUTPUT_BYTES) {
      throw new Error(
        `GIF must be ${formatImageSize(COVER_IMAGE_MAX_OUTPUT_BYTES)} or smaller.`,
      );
    }
    return dataUrl;
  }

  return resizeToJpegDataUrl(
    file,
    COVER_IMAGE_MAX_WIDTH,
    COVER_IMAGE_JPEG_QUALITY,
  );
}
