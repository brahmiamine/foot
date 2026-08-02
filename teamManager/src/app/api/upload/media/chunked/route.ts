import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { uploadSessions } from "@/lib/uploadSessions";

/**
 * POST /api/upload/media/chunked
 * Upload a chunk of the file
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get("sessionId") as string;
    const chunkNumber = parseInt(formData.get("chunkNumber") as string, 10);
    const chunk = formData.get("chunk") as File | null;

    if (!sessionId || isNaN(chunkNumber) || !chunk) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // Get session
    const session = uploadSessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session non trouvée" }, { status: 404 });
    }

    // Validate chunk number
    if (chunkNumber < 0 || chunkNumber >= session.totalChunks) {
      return NextResponse.json({ error: "Numéro de chunk invalide" }, { status: 400 });
    }

    // Create temp directory for chunks if it doesn't exist
    const tempDir = join(process.cwd(), "public", "uploads", "media", "temp", sessionId);
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Save chunk to temp file
    const chunkPath = join(tempDir, `chunk_${chunkNumber}`);
    const bytes = await chunk.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(chunkPath, buffer);

    // Update session
    const existingChunk = session.chunks.find((c) => c.chunkNumber === chunkNumber);
    if (!existingChunk) {
      session.chunks.push({ chunkNumber, path: chunkPath });
      session.uploadedChunks++;
    }

    // Sort chunks by number
    session.chunks.sort((a, b) => a.chunkNumber - b.chunkNumber);

    return NextResponse.json({
      success: true,
      uploadedChunks: session.uploadedChunks,
      totalChunks: session.totalChunks,
      progress: (session.uploadedChunks / session.totalChunks) * 100,
    });
  } catch (error) {
    console.error("Error uploading chunk:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'upload du chunk" },
      { status: 500 }
    );
  }
}

