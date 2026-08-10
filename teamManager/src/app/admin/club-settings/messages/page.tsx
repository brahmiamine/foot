import { ContactService } from "@/services/ContactService";
import { requireTeamId } from "@/lib/team-context";
import { MessagesManagement } from "./MessagesManagement";

export const dynamic = "force-dynamic";

/** Admin — messages reçus via le formulaire public /contact. */
export default async function ClubContactMessagesPage() {
  const teamId = await requireTeamId();
  const messages = await new ContactService().findAllMessages(teamId);

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Contact &amp; réseaux — Messages reçus</h1>
      <MessagesManagement
        initialMessages={messages.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          subject: m.subject,
          department: m.department,
          message: m.message,
          status: m.status,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
