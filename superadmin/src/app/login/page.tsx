import { redirect } from "next/navigation";
import AdminLogin from "@/components/admin/AdminLogin";
import { hasAdminSession } from "@/lib/adminAuth";

const DASHBOARD_PATH = "/admin";

export default async function LoginPage() {
  const authenticated = await hasAdminSession();

  if (authenticated) {
    redirect(DASHBOARD_PATH);
  }

  return (
    <div className="auth-full-page-content min-vh-100 d-flex align-items-center justify-content-center py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6 col-xl-5">
            <AdminLogin redirectTo={DASHBOARD_PATH} />
          </div>
        </div>
      </div>
    </div>
  );
}
