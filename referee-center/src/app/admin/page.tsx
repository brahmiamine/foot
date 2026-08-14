import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/adminAuth";

export default async function AdminPage() {
  const authenticated = await hasAdminSession();

  if (!authenticated) {
    redirect("/login");
  }

  redirect("/admin/votes");
}
