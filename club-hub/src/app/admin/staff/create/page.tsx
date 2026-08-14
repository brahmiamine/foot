import { redirect } from "next/navigation";
import { getUserAccess, can, selectableCategories } from "@/lib/access";
import { AGE_CATEGORIES } from "@/types/categories";
import { StaffForm } from "../StaffForm";

/**
 * Admin Staff Create Page
 * Page for creating a new staff member
 */
export default async function CreateStaffPage() {
  const access = await getUserAccess();
  if (!can(access, "staff.create")) {
    redirect("/admin/staff");
  }

  return <StaffForm mode="create" allowedCategories={selectableCategories(access, AGE_CATEGORIES)} />;
}
