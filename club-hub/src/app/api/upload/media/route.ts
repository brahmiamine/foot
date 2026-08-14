import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/**
 * Allowed file types by category
 */
const ALLOWED_TYPES: Record<string, string[]> = {
  IMAGE: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
  VIDEO: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"],
  DOCUMENT: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  AUDIO: ["audio/mpeg", "audio/wav", "audio/ogg"],
};

/**
 * Maximum file sizes by category (in bytes)
 */
const MAX_FILE_SIZES: Record<string, number> = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  VIDEO: 100 * 1024 * 1024, // 100MB (should use chunked upload for large videos)
  DOCUMENT: 50 * 1024 * 1024, // 50MB
  AUDIO: 50 * 1024 * 1024, // 50MB
};

/**
 * Get media type from MIME type
 */
function getMediaTypeFromMime(mimeType: string): "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO" | null {
  for (const [type, mimes] of Object.entries(ALLOWED_TYPES)) {
    if (mimes.includes(mimeType)) {
      return type as "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO";
    }
  }
  return null;
}

/**
 * Get folder name for media type
 */
function getFolderName(type: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO"): string {
  const folderMap: Record<string, string> = {
    IMAGE: "images",
    VIDEO: "videos",
    DOCUMENT: "documents",
    AUDIO: "audio",
  };
  return folderMap[type];
}

/**
 * POST /api/upload/media
 * Upload a media file (image, video, document, audio) to the uploads directory
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // Detect media type from MIME type
    const mediaType = getMediaTypeFromMime(file.type);
    if (!mediaType) {
      return NextResponse.json(
        {
          error: `Type de fichier non autorisé. Types acceptés: Images (JPEG, PNG, GIF, WebP), Vidéos (MP4, WebM, MOV), Documents (PDF, DOC, DOCX, XLS, XLSX), Audio (MP3, WAV, OGG)`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    const maxSize = MAX_FILE_SIZES[mediaType];
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json(
        { error: `Le fichier est trop volumineux. Taille maximale pour ${mediaType}: ${maxSizeMB}MB` },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const folderName = getFolderName(mediaType);
    const uploadsDir = join(process.cwd(), "public", "uploads", "media", folderName);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}_${originalName}`;
    const filepath = join(uploadsDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Return the public URL path
    const publicPath = `/uploads/media/${folderName}/${filename}`;

    return NextResponse.json({
      success: true,
      path: publicPath,
      filename,
      type: mediaType,
      mimeType: file.type,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'upload du fichier" },
      { status: 500 }
    );
  }
}

