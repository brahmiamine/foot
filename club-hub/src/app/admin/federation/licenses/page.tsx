import PersonLicensesManager from "./PersonLicensesManager";
import ClubLicenseCardGallery from "./ClubLicenseCardGallery";

export const dynamic = "force-dynamic";

export default function ClubPersonLicensesPage() {
  return <div className="d-flex flex-column gap-4"><PersonLicensesManager /><ClubLicenseCardGallery /></div>;
}
