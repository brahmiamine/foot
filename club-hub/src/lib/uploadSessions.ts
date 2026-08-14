/**
 * Store for active chunked upload sessions
 * 
 * NOTE: This is an in-memory store. In production, consider using Redis or a database
 * for session storage to support multiple server instances.
 */
export const uploadSessions = new Map<
  string,
  {
    filename: string;
    totalSize: number;
    totalChunks: number;
    uploadedChunks: number;
    mimeType: string;
    chunks: { chunkNumber: number; path: string }[];
  }
>();

