import { notFound } from "next/navigation";
import Link from "next/link";
import { getSsoSession } from "@/lib/ssoSession";
import { PageChrome } from "@/components/PageChrome";
import { CreatePollForm } from "@/components/CreatePollForm";
import shared from "@/components/shared.module.css";

export const dynamic = "force-dynamic";

export default async function AdminSondagesPage() {
  const session = await getSsoSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    notFound();
  }

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            Créer un sondage
          </h1>
          <p style={{ marginBottom: 28 }}>
            <Link href="/communaute/admin/moderation">→ Modération</Link>
          </p>
          <CreatePollForm />
        </div>
      </div>
    </PageChrome>
  );
}
