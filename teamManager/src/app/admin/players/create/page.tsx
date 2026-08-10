import { redirect } from "next/navigation";
import { getUserAccess, can, selectableCategories } from "@/lib/access";
import { AGE_CATEGORIES } from "@/types/categories";
import { PlayerForm } from "../PlayerForm";

/**
 * Admin Players Create Page
 * Page for creating a new player
 */
export default async function CreatePlayerPage() {
  const access = await getUserAccess();
  if (!can(access, "players.create")) {
    redirect("/admin/players");
  }

  return <PlayerForm mode="create" allowedCategories={selectableCategories(access, AGE_CATEGORIES)} />;
}
