import { redirect } from "next/navigation";
import AdminLogin from "@/components/admin/AdminLogin";
import { hasAdminSession } from "@/lib/adminAuth";

const DASHBOARD_PATH = "/admin/votes";

export default async function LoginPage() {
  const authenticated = await hasAdminSession();

  if (authenticated) {
    redirect(DASHBOARD_PATH);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md">
        <AdminLogin redirectTo={DASHBOARD_PATH} />
      </div>
    </div>
  );
}
