import AdminLogin from "@/components/admin/AdminLogin";
import { hasAdminSession } from "@/lib/adminAuth";
import ContactMessagesList from "@/components/admin/ContactMessagesList";

export default async function AdminContactPage() {
  const authenticated = await hasAdminSession();

  if (!authenticated) {
    return <AdminLogin />;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Messages de contact
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Liste de tous les messages de contact reçus
        </p>
      </div>
      <ContactMessagesList />
    </div>
  );
}

