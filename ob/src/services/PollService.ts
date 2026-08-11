import { getDataSource } from "@/lib/database";
import { ObPoll } from "@/entities/ObPoll";
import { ObPollOption } from "@/entities/ObPollOption";
import { ObPollVote } from "@/entities/ObPollVote";

export interface PollOptionView {
  id: number;
  label: string;
  votes: number;
}

export interface PollView {
  id: number;
  question: string;
  type: ObPoll["type"];
  status: ObPoll["status"];
  createdAt: Date;
  options: PollOptionView[];
  totalVotes: number;
  myVoteOptionId: number | null;
}

export class PollService {
  async listOpenPolls(userId: string | null, limit = 10): Promise<PollView[]> {
    const dataSource = await getDataSource();
    const polls = await dataSource
      .getRepository(ObPoll)
      .find({ where: { status: "OPEN" }, order: { createdAt: "DESC" }, take: limit });

    if (polls.length === 0) return [];
    return this.hydrate(polls, userId);
  }

  private async hydrate(polls: ObPoll[], userId: string | null): Promise<PollView[]> {
    const dataSource = await getDataSource();
    const pollIds = polls.map((p) => p.id);

    const options = await dataSource
      .getRepository(ObPollOption)
      .createQueryBuilder("o")
      .where("o.poll_id IN (:...pollIds)", { pollIds })
      .orderBy("o.sort_order", "ASC")
      .getMany();

    const voteCounts = await dataSource
      .getRepository(ObPollVote)
      .createQueryBuilder("v")
      .select("v.option_id", "optionId")
      .addSelect("COUNT(*)", "count")
      .where("v.poll_id IN (:...pollIds)", { pollIds })
      .groupBy("v.option_id")
      .getRawMany<{ optionId: string; count: string }>();

    const countByOption = new Map(voteCounts.map((v) => [Number(v.optionId), Number(v.count)]));

    let myVotes = new Map<number, number>();
    if (userId) {
      const allVotes = await dataSource
        .getRepository(ObPollVote)
        .createQueryBuilder("v")
        .where("v.poll_id IN (:...pollIds)", { pollIds })
        .andWhere("v.user_id = :userId", { userId })
        .getMany();
      myVotes = new Map(allVotes.map((v) => [v.pollId, v.optionId]));
    }

    return polls.map((poll) => {
      const pollOptions = options.filter((o) => o.pollId === poll.id);
      const optionViews: PollOptionView[] = pollOptions.map((o) => ({
        id: o.id,
        label: o.label,
        votes: countByOption.get(o.id) ?? 0,
      }));
      return {
        id: poll.id,
        question: poll.question,
        type: poll.type,
        status: poll.status,
        createdAt: poll.createdAt,
        options: optionViews,
        totalVotes: optionViews.reduce((sum, o) => sum + o.votes, 0),
        myVoteOptionId: myVotes.get(poll.id) ?? null,
      };
    });
  }
}
