import { NextRequest, NextResponse } from "next/server";
import { resolveAssignmentFilter } from "@/lib/assignmentView";
import { requireRequestSession } from "@/lib/requestSession";
import { AssignmentService } from "@/services/AssignmentService";

export async function GET(request: NextRequest) {
  const session = await requireRequestSession();
  const filter = resolveAssignmentFilter(request.nextUrl.searchParams.get("view"));
  const assignments = await new AssignmentService().listMine(session.id, filter);
  return NextResponse.json({ assignments });
}
