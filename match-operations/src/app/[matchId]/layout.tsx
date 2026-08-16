import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MatchAccessService } from "@/services/MatchAccessService";

/**
 * Final server-side authorization boundary for every match sub-route.
 * Club access requires the Club Hub permission/category scope; referee access
 * requires an ACTIVE CENTER_REFEREE assignment for this exact match.
 */
export default async function MatchIdLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const requestHeaders = await headers();
  const teamId = requestHeaders.get("x-sso-team-id");
  const userId = requestHeaders.get("x-sso-user-id");
  const role = requestHeaders.get("x-sso-role");

  if (!userId || !role) notFound();

  try {
    await new MatchAccessService().assertMatchAccess({ userId, role, teamId }, matchId);
  } catch {
    notFound();
  }

  return <>{children}</>;
}
