import { StaffService } from "@/services/StaffService";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can, categoryAllowed, selectableCategories } from "@/lib/access";
import { AGE_CATEGORIES } from "@/types/categories";
import { StaffForm } from "../../StaffForm";
import { notFound } from "next/navigation";

/**
 * Admin Staff Edit Page
 * Page for editing an existing staff member
 */
export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);

  if (isNaN(id)) {
    notFound();
  }

  const teamId = await requireTeamId();
  const access = await getUserAccess();
  const staffService = new StaffService();
  const staff = await staffService.findById(id, teamId);

  if (!staff || !can(access, "staff.edit") || !categoryAllowed(access, staff.category)) {
    notFound();
  }

  const birthDateStr =
    staff.birthDate instanceof Date
      ? staff.birthDate.toISOString().split("T")[0]
      : new Date(staff.birthDate).toISOString().split("T")[0];
  const createdAtStr =
    staff.createdAt instanceof Date ? staff.createdAt.toISOString() : new Date(staff.createdAt).toISOString();
  const updatedAtStr = staff.updatedAt
    ? staff.updatedAt instanceof Date
      ? staff.updatedAt.toISOString()
      : new Date(staff.updatedAt).toISOString()
    : null;

  const staffData = {
    id: staff.id,
    firstNameFr: staff.firstNameFr || "",
    lastNameFr: staff.lastNameFr || "",
    firstNameAr: staff.firstNameAr || null,
    lastNameAr: staff.lastNameAr || null,
    birthDate: birthDateStr,
    phone: staff.phone || null,
    imageUrl: staff.imageUrl || null,
    staffType: staff.staffType || "COACH",
    userId: staff.userId || null,
    category: staff.category,
    createdAt: createdAtStr,
    updatedAt: updatedAtStr,
  };

  return <StaffForm mode="edit" initialData={staffData} allowedCategories={selectableCategories(access, AGE_CATEGORIES)} />;
}
