import { StaffService } from "@/services/StaffService";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can } from "@/lib/access";
import { StaffList } from "./StaffList";

/**
 * Admin Staff List Page
 * Displays the list of staff members, filtrée par les catégories autorisées.
 */
export default async function StaffPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  const staffService = new StaffService();
  const staffData = await staffService.findAll(teamId, access.categories);

  const staff = staffData.map((staffMember) => ({
    id: staffMember.id,
    firstNameFr: staffMember.firstNameFr || "",
    lastNameFr: staffMember.lastNameFr || "",
    firstNameAr: staffMember.firstNameAr || null,
    lastNameAr: staffMember.lastNameAr || null,
    birthDate:
      staffMember.birthDate instanceof Date
        ? staffMember.birthDate.toISOString().split("T")[0]
        : new Date(staffMember.birthDate).toISOString().split("T")[0],
    phone: staffMember.phone || null,
    imageUrl: staffMember.imageUrl || null,
    staffType: staffMember.staffType || "COACH",
    userId: staffMember.userId || null,
    category: staffMember.category,
    createdAt: staffMember.createdAt instanceof Date ? staffMember.createdAt.toISOString() : new Date(staffMember.createdAt).toISOString(),
    updatedAt: staffMember.updatedAt
      ? staffMember.updatedAt instanceof Date
        ? staffMember.updatedAt.toISOString()
        : new Date(staffMember.updatedAt).toISOString()
      : null,
  }));

  return (
    <StaffList
      initialStaff={staff}
      canCreate={can(access, "staff.create")}
      canEdit={can(access, "staff.edit")}
      canDelete={can(access, "staff.delete")}
    />
  );
}
