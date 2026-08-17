export const DEFAULT_ASSIGNMENT_RESPONSE_DEADLINE_HOURS = 48;

export function assignmentResponseDeadlineHours(env: Record<string, string | undefined> = process.env): number {
  const configured = Number(env.REFEREE_ASSIGNMENT_RESPONSE_DEADLINE_HOURS ?? DEFAULT_ASSIGNMENT_RESPONSE_DEADLINE_HOURS);
  return Number.isFinite(configured) && configured >= 1 && configured <= 168
    ? Math.floor(configured)
    : DEFAULT_ASSIGNMENT_RESPONSE_DEADLINE_HOURS;
}

export function computeAssignmentResponseDeadline(
  assignedAt: Date,
  matchDate: Date | null | undefined,
  deadlineHours = assignmentResponseDeadlineHours(),
): Date {
  const configuredDeadline = new Date(assignedAt.getTime() + deadlineHours * 60 * 60 * 1000);
  if (!matchDate) return configuredDeadline;
  return new Date(Math.min(configuredDeadline.getTime(), matchDate.getTime()));
}

export function canAcceptAssignment(input: {
  assignmentActive: boolean;
  responseDeadline: Date;
  matchDate?: Date | null;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  if (!input.assignmentActive) return false;
  if (input.matchDate && now.getTime() >= input.matchDate.getTime()) return false;
  return now.getTime() <= input.responseDeadline.getTime();
}

export function canRequestReplacement(input: {
  assignmentActive: boolean;
  responseStatus: "PENDING_ACCEPTANCE" | "ACCEPTED" | "DECLINED";
  matchDate?: Date | null;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  return Boolean(
    input.assignmentActive &&
      input.responseStatus === "ACCEPTED" &&
      (!input.matchDate || now.getTime() < input.matchDate.getTime()),
  );
}
