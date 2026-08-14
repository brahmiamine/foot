import { headers } from "next/headers";

export interface RequestSession {
  id: string;
  name: string;
  email: string;
  role: "REFEREE" | "MATCH_OFFICIAL" | "REFEREE_OBSERVER";
}

export async function getRequestSession(): Promise<RequestSession | null> {
  const requestHeaders = await headers();
  const id = requestHeaders.get("x-sso-user-id");
  const encodedName = requestHeaders.get("x-sso-name");
  const email = requestHeaders.get("x-sso-email");
  const role = requestHeaders.get("x-sso-role") as RequestSession["role"] | null;
  if (!id || !encodedName || !email || !role) return null;
  let name: string;
  try {
    name = decodeURIComponent(encodedName);
  } catch {
    return null;
  }
  return { id, name, email, role };
}

export async function requireRequestSession(): Promise<RequestSession> {
  const session = await getRequestSession();
  if (!session) throw new Error("Authenticated referee session was not forwarded by middleware");
  return session;
}
