import { getDataSource } from "@/lib/database";
import { ObPoll, type ObPollType } from "@/entities/ObPoll";
import { ObPollOption } from "@/entities/ObPollOption";
import { ObPollVote } from "@/entities/ObPollVote";
import { awardPoints } from "@/lib/community/points";

export type VoteResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "closed" | "already_voted" | "invalid_option" };

export async function voteOnPoll(userId: string, pollId: number, optionId: number): Promise<VoteResult> {
  const dataSource = await getDataSource();
  const poll = await dataSource.getRepository(ObPoll).findOne({ where: { id: pollId } });
  if (!poll) return { ok: false, error: "not_found" };
  if (poll.status !== "OPEN" || (poll.closesAt && poll.closesAt.getTime() < Date.now())) {
    return { ok: false, error: "closed" };
  }

  const option = await dataSource.getRepository(ObPollOption).findOne({ where: { id: optionId, pollId } });
  if (!option) return { ok: false, error: "invalid_option" };

  const voteRepository = dataSource.getRepository(ObPollVote);
  const alreadyVoted = await voteRepository.findOne({ where: { pollId, userId } });
  if (alreadyVoted) return { ok: false, error: "already_voted" };

  await voteRepository.save(voteRepository.create({ pollId, optionId, userId }));
  await awardPoints(userId, 10, "VOTE", { type: "POLL", id: String(pollId) });

  return { ok: true };
}

export interface CreatePollInput {
  question: string;
  type: ObPollType;
  matchId?: string | null;
  closesAt?: Date | null;
  options: string[];
  createdBy: string;
}

export async function createPoll(input: CreatePollInput): Promise<ObPoll> {
  const dataSource = await getDataSource();
  return dataSource.transaction(async (manager) => {
    const poll = manager.getRepository(ObPoll).create({
      question: input.question,
      type: input.type,
      matchId: input.matchId ?? null,
      closesAt: input.closesAt ?? null,
      createdBy: input.createdBy,
      status: "OPEN",
    });
    await manager.getRepository(ObPoll).save(poll);

    const options = input.options.map((label, index) =>
      manager.getRepository(ObPollOption).create({ pollId: poll.id, label, sortOrder: index })
    );
    await manager.getRepository(ObPollOption).save(options);

    return poll;
  });
}
