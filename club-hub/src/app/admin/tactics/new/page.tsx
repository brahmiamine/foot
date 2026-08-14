import { redirect } from "next/navigation";
import { getUserAccess, can, selectableCategories } from "@/lib/access";
import { AGE_CATEGORIES } from "@/types/categories";
import { TacticsBoardEditor } from "../TacticsBoardEditor";

export const dynamic = "force-dynamic";

export default async function NewTacticsBoardPage() {
  const access = await getUserAccess();
  if (!can(access, "tactics.manage")) {
    redirect("/admin/tactics");
  }

  return (
    <TacticsBoardEditor
      initialTitle=""
      initialDescription={null}
      initialCategory={null}
      initialIsPublic={false}
      initialElements={[]}
      allowedCategories={selectableCategories(access, AGE_CATEGORIES)}
      readOnly={false}
    />
  );
}
