"use client";

import { useState, useRef } from "react";
import { MediaPreview } from "./MediaPreview";

/**
 * Media Uploader Component
 * Handles file uploads with support for simple upload and chunked upload (for large videos)
 * Shows progress bar for long uploads
 */
interface MediaUploaderProps {
  onUploadComplete: (result: { path: string; type: string; mimeType: string }) => void;
  onError?: (error: string) => void;
  acceptedTypes?: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO" | "ALL";
  maxSize?: number; // in bytes
  className?: string;
}

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
const CHUNKED_UPLOAD_THRESHOLD = 20 * 1024 * 1024; // Use chunked upload for files larger than 20MB

export function MediaUploader({ onUploadComplete, onError, acceptedTypes = "ALL", maxSize, className = "" }: MediaUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mediaType, setMediaType] = useState<"IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect media type from file
  const detectMediaType = (file: File): "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO" | null => {
    if (file.type.startsWith("image/")) return "IMAGE";
    if (file.type.startsWith("video/")) return "VIDEO";
    if (file.type.startsWith("audio/")) return "AUDIO";
    if (
      file.type.includes("pdf") ||
      file.type.includes("word") ||
      file.type.includes("excel") ||
      file.type.includes("document") ||
      file.type.includes("spreadsheet")
    ) {
      return "DOCUMENT";
    }
    return null;
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const detectedType = detectMediaType(selectedFile);
    if (!detectedType) {
      onError?.("Type de fichier non supporté");
      return;
    }

    if (acceptedTypes !== "ALL" && detectedType !== acceptedTypes) {
      onError?.(`Type de fichier non autorisé. Type attendu: ${acceptedTypes}`);
      return;
    }

    // Validate file size
    if (maxSize && selectedFile.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      onError?.(`Le fichier est trop volumineux. Taille maximale: ${maxSizeMB}MB`);
      return;
    }

    setFile(selectedFile);
    setMediaType(detectedType);

    // Create preview for images
    if (detectedType === "IMAGE") {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  // Simple upload (for small files)
  const uploadSimple = async (file: File): Promise<{ path: string; type: string; mimeType: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setProgress(percentComplete);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (result.success) {
              resolve({
                path: result.path,
                type: result.type,
                mimeType: result.mimeType || file.type,
              });
            } else {
              reject(new Error(result.error || "Erreur lors de l'upload"));
            }
          } catch (error) {
            reject(new Error("Erreur lors de la lecture de la réponse"));
          }
        } else {
          reject(new Error(`Erreur HTTP: ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Erreur réseau lors de l'upload"));
      });

      xhr.open("POST", "/api/upload/media");
      xhr.send(formData);
    });
  };

  // Chunked upload (for large videos)
  const uploadChunked = async (file: File): Promise<{ path: string; type: string; mimeType: string }> => {
    // Initialize upload session
    const initResponse = await fetch("/api/upload/media/chunked/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        totalSize: file.size,
        totalChunks: Math.ceil(file.size / CHUNK_SIZE),
        mimeType: file.type,
      }),
    });

    const initResult = await initResponse.json();
    if (!initResult.success) {
      throw new Error(initResult.error || "Erreur lors de l'initialisation de l'upload");
    }

    const sessionId = initResult.sessionId;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Upload chunks
    for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber++) {
      const start = chunkNumber * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const chunkFormData = new FormData();
      chunkFormData.append("sessionId", sessionId);
      chunkFormData.append("chunkNumber", chunkNumber.toString());
      chunkFormData.append("chunk", chunk);

      const chunkResponse = await fetch("/api/upload/media/chunked", {
        method: "POST",
        body: chunkFormData,
      });

      const chunkResult = await chunkResponse.json();
      if (!chunkResult.success) {
        throw new Error(chunkResult.error || `Erreur lors de l'upload du chunk ${chunkNumber}`);
      }

      // Update progress
      const chunkProgress = ((chunkNumber + 1) / totalChunks) * 100;
      setProgress(chunkProgress);
    }

    // Complete upload
    const completeResponse = await fetch("/api/upload/media/chunked/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });

    const completeResult = await completeResponse.json();
    if (!completeResult.success) {
      throw new Error(completeResult.error || "Erreur lors de la finalisation de l'upload");
    }

    return {
      path: completeResult.path,
      type: completeResult.type,
      mimeType: completeResult.mimeType || file.type,
    };
  };

  // Handle upload
  const handleUpload = async () => {
    if (!file || !mediaType) return;

    setUploading(true);
    setProgress(0);

    try {
      let result;
      if (file.size > CHUNKED_UPLOAD_THRESHOLD && mediaType === "VIDEO") {
        // Use chunked upload for large videos
        result = await uploadChunked(file);
      } else {
        // Use simple upload
        result = await uploadSimple(file);
      }

      onUploadComplete(result);
      setProgress(100);
      
      // Reset after a short delay
      setTimeout(() => {
        setFile(null);
        setPreview(null);
        setProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 1000);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Erreur lors de l'upload");
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // Reset
  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setProgress(0);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      <div className="mb-3">
        <label htmlFor="media-file" className="form-label">
          Fichier média <span className="text-danger">*</span>
        </label>
        <input
          ref={fileInputRef}
          type="file"
          className="form-control"
          id="media-file"
          onChange={handleFileChange}
          accept={
            acceptedTypes === "IMAGE"
              ? "image/*"
              : acceptedTypes === "VIDEO"
              ? "video/*"
              : acceptedTypes === "DOCUMENT"
              ? ".pdf,.doc,.docx,.xls,.xlsx"
              : acceptedTypes === "AUDIO"
              ? "audio/*"
              : "*/*"
          }
          disabled={uploading}
        />
        {file && (
          <div className="form-text">
            {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
          </div>
        )}
      </div>

      {preview && mediaType === "IMAGE" && (
        <div className="mb-3">
          <MediaPreview url={preview} type="IMAGE" className="d-block" />
        </div>
      )}

      {file && (
        <>
          {uploading && (
            <div className="mb-3">
              <div className="progress" style={{ height: "25px" }}>
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  style={{ width: `${progress}%` }}
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  {Math.round(progress)}%
                </div>
              </div>
              <div className="form-text text-center mt-1">Upload en cours...</div>
            </div>
          )}

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Upload...
                </>
              ) : (
                <>
                  <i className="fas fa-upload me-2" aria-hidden="true" />
                  Uploader
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              disabled={uploading}
            >
              <i className="fas fa-times me-2" aria-hidden="true" />
              Annuler
            </button>
          </div>
        </>
      )}
    </div>
  );
}

