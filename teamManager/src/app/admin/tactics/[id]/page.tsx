import { notFound, redirect } from "next/navigation";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can, selectableCategories } from "@/lib/access";
import { TacticsBoardService } from "@/services/TacticsBoardService";
import { AGE_CATEGORIES } from "@/types/categories";
import { TacticsBoardEditor } from "../TacticsBoardEditor";

export const dynamic = "force-dynamic";

export default async function TacticsBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    notFound();
  }

  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (!can(access, "tactics.view") && !can(access, "tactics.manage")) {
    redirect("/admin/tactics");
  }

  const service = new TacticsBoardService();
  const board = await service.findById(id, teamId);
  if (!board || !service.canView(board, access.userId)) {
    notFound();
  }

  const isOwner = board.ownerId === access.userId;
  const content = TacticsBoardService.parseContent(board);

  return (
    <TacticsBoardEditor
      boardId={board.id}
      initialTitle={board.title}
      initialDescription={board.description ?? null}
      initialCategory={board.category ?? null}
      initialIsPublic={board.isPublic}
      initialElements={content.elements}
      allowedCategories={selectableCategories(access, AGE_CATEGORIES)}
      readOnly={!isOwner || !can(access, "tactics.manage")}
    />
  );
}
