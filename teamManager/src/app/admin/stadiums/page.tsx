import { StadiumService } from "@/services/StadiumService";
import { requireTeamId } from "@/lib/team-context";
import { StadiumsManagement } from "./StadiumsManagement";

/**
 * Plain object type for Stadium (serializable)
 */
interface StadiumData {
  id: number;
  nameFr: string;
  nameAr: string | null;
  addressFr: string | null;
  addressAr: string | null;
  cityFr: string | null;
  cityAr: string | null;
  isHome: boolean;
  facilityType: string;
  capacity: number | null;
  descriptionFr: string | null;
  descriptionAr: string | null;
  imageUrl: string | null;
  createdAt: string;
}

/**
 * Admin Stadiums Page
 * Unified page with list and form on the same page
 */
export default async function StadiumsPage() {
  const teamId = await requireTeamId();
  const stadiumService = new StadiumService();
  const fetchedStadiums = await stadiumService.findAll(teamId);

  const stadiums: StadiumData[] = fetchedStadiums.map((stadium) => ({
    id: stadium.id,
    nameFr: stadium.nameFr,
    nameAr: stadium.nameAr || null,
    addressFr: stadium.addressFr || null,
    addressAr: stadium.addressAr || null,
    cityFr: stadium.cityFr || null,
    cityAr: stadium.cityAr || null,
    isHome: stadium.isHome,
    facilityType: stadium.facilityType,
    capacity: stadium.capacity || null,
    descriptionFr: stadium.descriptionFr || null,
    descriptionAr: stadium.descriptionAr || null,
    imageUrl: stadium.imageUrl || null,
    createdAt: stadium.createdAt.toISOString(),
  }));

  return <StadiumsManagement initialStadiums={stadiums} />;
}
