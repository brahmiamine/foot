import { NextRequest, NextResponse } from "next/server";
import { mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { randomBytes } from "crypto";
import { uploadSessions } from "@/lib/uploadSessions";

/**
 * Allowed video MIME types
 */
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];

/**
 * Maximum video file size (100MB)
 */
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

/**
 * POST /api/upload/media/chunked/init
 * Initialize a chunked upload session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, totalSize, totalChunks, mimeType } = body;

    if (!filename || !totalSize || !totalChunks || !mimeType) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // Validate video type
    if (!ALLOWED_VIDEO_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé. Seules les vidéos sont acceptées (MP4, WebM, MOV, AVI)" },
        { status: 400 }
      );
    }

    // Validate file size
    if (totalSize > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: `Le fichier est trop volumineux. Taille maximale: ${MAX_VIDEO_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Generate unique session ID
    const sessionId = randomBytes(16).toString("hex");

    // Create temp directory for chunks
    const tempDir = join(process.cwd(), "public", "uploads", "media", "temp", sessionId);
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Initialize session
    uploadSessions.set(sessionId, {
      filename,
      totalSize,
      totalChunks,
      uploadedChunks: 0,
      mimeType,
      chunks: [],
    });

    return NextResponse.json({
      success: true,
      sessionId,
    });
  } catch (error) {
    console.error("Error initializing chunked upload:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'initialisation de l'upload" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/upload/media/chunked/init?sessionId=...
 * Get upload session status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID requis" }, { status: 400 });
    }

    const session = uploadSessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session non trouvée" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      session: {
        filename: session.filename,
        totalSize: session.totalSize,
        totalChunks: session.totalChunks,
        uploadedChunks: session.uploadedChunks,
        progress: (session.uploadedChunks / session.totalChunks) * 100,
      },
    });
  } catch (error) {
    console.error("Error getting upload session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la récupération de la session" },
      { status: 500 }
    );
  }
}

