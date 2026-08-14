import AdminLogin from "@/components/admin/AdminLogin";import AdminCompetitionEntriesManager from "@/components/admin/AdminCompetitionEntriesManager";import { getCompetitionAdminPageSession } from "@/lib/adminAuth";
export default async function Page(){return await getCompetitionAdminPageSession()?<AdminCompetitionEntriesManager/>:<AdminLogin/>}
