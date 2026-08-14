import { ContactService } from "@/services/ContactService";
import { requireTeamId } from "@/lib/team-context";
import { ContactInfoForm } from "./ContactInfoForm";

export const dynamic = "force-dynamic";

/** Admin — coordonnées du club (page publique /contact) : adresse, téléphones/emails, horaires, carte. */
export default async function ClubContactSettingsPage() {
  const teamId = await requireTeamId();
  const info = await new ContactService().getInfo(teamId);

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Contact &amp; réseaux — Coordonnées</h1>
      <ContactInfoForm
        initialData={{
          addressFr: info?.addressFr ?? "",
          addressAr: info?.addressAr ?? "",
          phone: info?.phone ?? "",
          email: info?.email ?? "",
          openingHoursFr: info?.openingHoursFr ?? "",
          openingHoursAr: info?.openingHoursAr ?? "",
          mapEmbedUrl: info?.mapEmbedUrl ?? "",
          adminPhone: info?.adminPhone ?? "",
          adminEmail: info?.adminEmail ?? "",
          sportPhone: info?.sportPhone ?? "",
          sportEmail: info?.sportEmail ?? "",
          academyPhone: info?.academyPhone ?? "",
          academyEmail: info?.academyEmail ?? "",
          partnershipPhone: info?.partnershipPhone ?? "",
          partnershipEmail: info?.partnershipEmail ?? "",
        }}
      />
    </div>
  );
}
