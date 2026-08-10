import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { auth } from "@/lib/auth";

/**
 * POST /api/upload/branding
 * Upload d'un asset d'identité visuelle du club (logo, logo sombre,
 * favicon) — réservé ADMIN (président du club), même logique de garde que
 * les server actions de /admin/settings/branding.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Action réservée à l'administrateur du club" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/x-icon"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé. Seules les images sont acceptées (JPEG, PNG, GIF, WebP, SVG, ICO)" },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Le fichier est trop volumineux. Taille maximale : 5MB" }, { status: 400 });
    }

    const uploadsDir = join(process.cwd(), "public", "uploads", "branding");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${session.user.teamId}_${timestamp}_${originalName}`;
    const filepath = join(uploadsDir, filename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    const publicPath = `/uploads/branding/${filename}`;

    return NextResponse.json({ success: true, path: publicPath, filename });
  } catch (error) {
    console.error("Error uploading branding asset:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'upload du fichier" },
      { status: 500 }
    );
  }
}
