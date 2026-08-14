import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/adminAuth";
import AdminDashboard from "@/components/admin/AdminDashboardStats";

export default async function AdminPage() {
  const authenticated = await hasAdminSession();

  if (!authenticated) {
    redirect("/login");
  }

  return <AdminDashboard />;
}
