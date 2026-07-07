import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function extFromImageType(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export function detectImageType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function validateImageBuffer(buffer: Buffer, mimeType = "") {
  if (!buffer || buffer.length === 0) return "File kosong";
  if (buffer.length > MAX_BYTES) return "Ukuran file maksimal 5 MB";

  const detected = detectImageType(buffer);
  const type = ALLOWED_IMAGE_TYPES.has(mimeType) ? mimeType : detected;
  if (!type || !ALLOWED_IMAGE_TYPES.has(type)) {
    return "Format harus JPG, PNG, atau WEBP";
  }
  return null;
}

export function validateImageFile(file: File) {
  if (!file || file.size === 0) return "File kosong";
  if (file.size > MAX_BYTES) return "Ukuran file maksimal 5 MB";
  if (file.type && !ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Format harus JPG, PNG, atau WEBP";
  }
  return null;
}

export async function savePublicUpload(
  file: File,
  folder: string,
  filenamePrefix: string
): Promise<string> {
  const error = validateImageFile(file);
  if (error) throw new Error(error);

  const buffer = Buffer.from(await file.arrayBuffer());
  const bufferError = validateImageBuffer(buffer, file.type);
  if (bufferError) throw new Error(bufferError);

  const imageType = ALLOWED_IMAGE_TYPES.has(file.type)
    ? file.type
    : detectImageType(buffer) || "image/jpeg";
  const ext = extFromImageType(imageType);
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });

  const filename = `${filenamePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${folder}/${filename}`;
}

export function parsePhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.startsWith("/uploads/"));
}
