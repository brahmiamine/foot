import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

export interface StoredRegulatoryDocument {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
  checksum: string;
}

/**
 * Abstraction de stockage P0-001. L'adaptateur local est volontairement
 * isolé pour pouvoir être remplacé par un object storage + antivirus sans
 * modifier le workflow métier ni les entités réglementaires.
 */
export async function storeRegulatoryDocument(
  clubId: string,
  applicationId: string,
  file: File,
): Promise<StoredRegulatoryDocument> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Format non autorisé. Formats acceptés : PDF, JPEG, PNG, WebP");
  }
  if (file.size <= 0 || file.size > MAX_DOCUMENT_SIZE) {
    throw new Error("Le document doit avoir une taille comprise entre 1 octet et 10 Mo");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) || "document";
  const storedName = `${Date.now()}-${randomUUID()}-${safeOriginalName}`;
  const relativeDirectory = join("uploads", "regulatory", clubId, applicationId);
  const directory = join(process.cwd(), "public", relativeDirectory);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, storedName), bytes, { flag: "wx" });

  return {
    fileUrl: `/${relativeDirectory.replaceAll("\\", "/")}/${storedName}`,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    checksum,
  };
}
