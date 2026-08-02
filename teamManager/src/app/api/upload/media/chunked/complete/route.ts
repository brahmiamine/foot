import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { uploadSessions } from "@/lib/uploadSessions";

/**
 * POST /api/upload/media/chunked/complete
 * Complete the chunked upload by concatenating all chunks
 */
export async function POST(request: NextRequest) {
  let sessionId: string | null = null;
  try {
    const body = await request.json();
    sessionId = body.sessionId;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID requis" }, { status: 400 });
    }

    // Get session
    const session = uploadSessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session non trouvée" }, { status: 404 });
    }

    // Check if all chunks are uploaded
    if (session.uploadedChunks !== session.totalChunks) {
      return NextResponse.json(
        { error: `Tous les chunks n'ont pas été uploadés (${session.uploadedChunks}/${session.totalChunks})` },
        { status: 400 }
      );
    }

    // Ensure chunks are sorted by number
    session.chunks.sort((a, b) => a.chunkNumber - b.chunkNumber);

    // Verify all chunks exist
    for (const chunk of session.chunks) {
      if (!existsSync(chunk.path)) {
        return NextResponse.json({ error: `Chunk ${chunk.chunkNumber} non trouvé` }, { status: 400 });
      }
    }

    // Create final uploads directory
    const uploadsDir = join(process.cwd(), "public", "uploads", "media", "videos");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate final filename
    const timestamp = Date.now();
    const originalName = session.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}_${originalName}`;
    const filepath = join(uploadsDir, filename);

    // Read all chunks
    const chunks = await Promise.all(session.chunks.map((chunk) => readFile(chunk.path)));

    // Concatenate and write all chunks to final file
    await writeFile(filepath, Buffer.concat(chunks));

    // Clean up temp files and directory
    const tempDir = join(process.cwd(), "public", "uploads", "media", "temp", sessionId);
    if (existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }

    // Remove session
    uploadSessions.delete(sessionId);

    // Return the public URL path
    const publicPath = `/uploads/media/videos/${filename}`;

    return NextResponse.json({
      success: true,
      path: publicPath,
      filename,
      type: "VIDEO",
      mimeType: session.mimeType,
    });
  } catch (error) {
    console.error("Error completing chunked upload:", error);

    // Clean up on error
    if (sessionId) {
      const session = uploadSessions.get(sessionId);
      if (session) {
        const tempDir = join(process.cwd(), "public", "uploads", "media", "temp", sessionId);
        if (existsSync(tempDir)) {
          try {
            await rm(tempDir, { recursive: true, force: true });
          } catch (cleanupError) {
            console.error("Error cleaning up temp directory:", cleanupError);
          }
        }
        uploadSessions.delete(sessionId);
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la finalisation de l'upload" },
      { status: 500 }
    );
  }
}

