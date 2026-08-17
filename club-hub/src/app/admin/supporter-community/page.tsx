import { getUserAccess, requirePermission } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { SupporterCommunityAdminService } from "@/services/SupporterCommunityAdminService";
import { SupporterCommunityManagement } from "./SupporterCommunityManagement";

export const dynamic = "force-dynamic";

export default async function SupporterCommunityPage() {
  const access = await getUserAccess();
  requirePermission(access, "notifications.send");
  const teamId = await requireTeamId();
  const data = await new SupporterCommunityAdminService().dashboard(teamId);

  return <SupporterCommunityManagement {...data} />;
}
