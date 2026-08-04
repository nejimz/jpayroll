import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "employees");

function extForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function mimeForExt(ext: string): string {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

async function removeExistingFiles(employeeId: string) {
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    try {
      await unlink(path.join(UPLOAD_DIR, `${employeeId}.${ext}`));
    } catch {
      // ignore missing
    }
  }
}

/** Save upload to public/uploads/employees and return the public URL path. */
export async function saveEmployeePhoto(employeeId: string, file: File): Promise<string> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Photo must be JPEG, PNG, or WebP");
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error("Photo must be under 2 MB");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await removeExistingFiles(employeeId);

  const ext = extForMime(file.type);
  const filename = `${employeeId}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buf);
  return `/uploads/employees/${filename}`;
}

/** Delete a previously stored employee photo from disk. */
export async function deleteEmployeePhotoFile(photoUrl: string | null | undefined) {
  if (!photoUrl?.startsWith("/uploads/employees/")) return;
  const abs = path.join(process.cwd(), "public", photoUrl.replace(/^\//, ""));
  try {
    await unlink(abs);
  } catch {
    // ignore missing
  }
}

/** Load a stored photo as a data URL for PDF embedding. */
export async function employeePhotoToDataUrl(
  photoUrl: string | null | undefined
): Promise<string | null> {
  if (!photoUrl?.startsWith("/uploads/employees/")) return null;
  const abs = path.join(process.cwd(), "public", photoUrl.replace(/^\//, ""));
  try {
    const buf = await readFile(abs);
    const ext = path.extname(abs).slice(1).toLowerCase();
    return `data:${mimeForExt(ext)};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
