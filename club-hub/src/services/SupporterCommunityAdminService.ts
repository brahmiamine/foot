import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";

export type CommunityModerationStatus = "APPROVED" | "REJECTED";

export interface PendingCommunityPost {
  id: string;
  authorName: string;
  body: string;
  imageUrl: string | null;
  createdAt: Date;
}

export interface PendingCommunityComment {
  id: string;
  authorName: string;
  targetType: "NEWS" | "POST";
  targetId: string;
  body: string;
  createdAt: Date;
}

export interface AdminCommunityPoll {
  id: string;
  questionFr: string;
  questionAr: string | null;
  status: "DRAFT" | "OPEN" | "CLOSED";
  totalVotes: number;
  endsAt: Date | null;
}

export interface AdminSupporterGroup {
  id: string;
  name: string;
  description: string | null;
  members: number;
  nextEventAt: Date | null;
}

function clean(value: string, max: number, required = true): string | null {
  const normalized = value.trim();
  if (!normalized) {
    if (required) throw new Error("Champ obligatoire");
    return null;
  }
  if (normalized.length > max) throw new Error(`Champ trop long (max ${max})`);
  return normalized;
}

function affectedRows(value: unknown): number {
  if (!value || typeof value !== "object" || !("affectedRows" in value)) return 0;
  return Number((value as { affectedRows?: number }).affectedRows ?? 0);
}

export class SupporterCommunityAdminService {
  async dashboard(teamId: string): Promise<{
    pendingPosts: PendingCommunityPost[];
    pendingComments: PendingCommunityComment[];
    polls: AdminCommunityPoll[];
    groups: AdminSupporterGroup[];
  }> {
    const db = await getDataSource();
    const [pendingPosts, pendingComments, polls, groups] = await Promise.all([
      db.query(
        `SELECT id, COALESCE(NULLIF(author_name, ''), 'Supporter') AS authorName,
                body, image_url AS imageUrl, created_at AS createdAt
         FROM cms_supporter_posts
         WHERE team_id = ? AND source_type = 'SUPPORTER' AND status = 'PENDING'
         ORDER BY created_at ASC LIMIT 100`,
        [teamId],
      ),
      db.query(
        `SELECT id, COALESCE(NULLIF(author_name, ''), 'Supporter') AS authorName,
                target_type AS targetType, target_id AS targetId, body, created_at AS createdAt
         FROM cms_supporter_comments
         WHERE team_id = ? AND status = 'PENDING'
         ORDER BY created_at ASC LIMIT 100`,
        [teamId],
      ),
      db.query(
        `SELECT p.id, p.question_fr AS questionFr, p.question_ar AS questionAr,
                p.status, p.ends_at AS endsAt, COUNT(v.id) AS totalVotes
         FROM cms_supporter_polls p
         LEFT JOIN cms_supporter_poll_votes v ON v.poll_id = p.id
         WHERE p.team_id = ?
         GROUP BY p.id, p.question_fr, p.question_ar, p.status, p.ends_at, p.created_at
         ORDER BY p.created_at DESC LIMIT 30`,
        [teamId],
      ),
      db.query(
        `SELECT g.id, g.name, g.description, COUNT(DISTINCT gm.user_id) AS members,
                MIN(CASE WHEN e.starts_at >= NOW() THEN e.starts_at ELSE NULL END) AS nextEventAt
         FROM cms_supporter_groups g
         LEFT JOIN cms_supporter_group_members gm ON gm.group_id = g.id
         LEFT JOIN cms_supporter_group_events e ON e.group_id = g.id
         WHERE g.team_id = ? AND g.status = 'ACTIVE'
         GROUP BY g.id, g.name, g.description, g.created_at
         ORDER BY members DESC, g.created_at ASC`,
        [teamId],
      ),
    ]);

    return {
      pendingPosts: pendingPosts as PendingCommunityPost[],
      pendingComments: pendingComments as PendingCommunityComment[],
      polls: (polls as Array<Omit<AdminCommunityPoll, "totalVotes"> & { totalVotes: number | string }>).map((poll) => ({
        ...poll,
        totalVotes: Number(poll.totalVotes),
      })),
      groups: (groups as Array<Omit<AdminSupporterGroup, "members"> & { members: number | string }>).map((group) => ({
        ...group,
        members: Number(group.members),
      })),
    };
  }

  async moderatePost(teamId: string, postId: string, actorId: string, status: CommunityModerationStatus): Promise<void> {
    const db = await getDataSource();
    await db.transaction(async (manager) => {
      const posts = await manager.query(
        `SELECT author_user_id AS userId FROM cms_supporter_posts
         WHERE id = ? AND team_id = ? AND source_type = 'SUPPORTER' AND status = 'PENDING'
         FOR UPDATE`,
        [postId, teamId],
      ) as Array<{ userId: string }>;
      const post = posts[0];
      if (!post) throw new Error("Publication introuvable ou déjà modérée");

      const update = await manager.query(
        `UPDATE cms_supporter_posts
         SET status = ?, moderated_by = ?, moderated_at = NOW(), updated_at = NOW()
         WHERE id = ? AND team_id = ? AND status = 'PENDING'`,
        [status, actorId, postId, teamId],
      );
      if (affectedRows(update) !== 1) throw new Error("Conflit de modération");

      if (status === "APPROVED") {
        const loyalty = await manager.query(
          `INSERT IGNORE INTO cms_supporter_loyalty_events
            (id, team_id, user_id, event_type, points, source_key, label)
           VALUES (?, ?, ?, 'POST', 10, ?, 'Publication supporter approuvée')`,
          [randomUUID(), teamId, post.userId, `post:${postId}`],
        );
        if (affectedRows(loyalty) === 1) {
          await manager.query(
            `UPDATE cms_supporter_profiles SET points = points + 10 WHERE team_id = ? AND user_id = ?`,
            [teamId, post.userId],
          );
        }
      }
    });
  }

  async moderateComment(teamId: string, commentId: string, actorId: string, status: CommunityModerationStatus): Promise<void> {
    const db = await getDataSource();
    await db.transaction(async (manager) => {
      const comments = await manager.query(
        `SELECT user_id AS userId FROM cms_supporter_comments
         WHERE id = ? AND team_id = ? AND status = 'PENDING' FOR UPDATE`,
        [commentId, teamId],
      ) as Array<{ userId: string }>;
      const comment = comments[0];
      if (!comment) throw new Error("Commentaire introuvable ou déjà modéré");

      const update = await manager.query(
        `UPDATE cms_supporter_comments
         SET status = ?, moderated_by = ?, moderated_at = NOW()
         WHERE id = ? AND team_id = ? AND status = 'PENDING'`,
        [status, actorId, commentId, teamId],
      );
      if (affectedRows(update) !== 1) throw new Error("Conflit de modération");

      if (status === "APPROVED") {
        const loyalty = await manager.query(
          `INSERT IGNORE INTO cms_supporter_loyalty_events
            (id, team_id, user_id, event_type, points, source_key, label)
           VALUES (?, ?, ?, 'COMMENT', 2, ?, 'Commentaire supporter approuvé')`,
          [randomUUID(), teamId, comment.userId, `comment:${commentId}`],
        );
        if (affectedRows(loyalty) === 1) {
          await manager.query(
            `UPDATE cms_supporter_profiles SET points = points + 2 WHERE team_id = ? AND user_id = ?`,
            [teamId, comment.userId],
          );
        }
      }
    });
  }

  async createPoll(input: {
    teamId: string;
    actorId: string;
    questionFr: string;
    questionAr?: string;
    optionsFr: string[];
    optionsAr?: string[];
    endsAt?: string | null;
  }): Promise<string> {
    const questionFr = clean(input.questionFr, 500) as string;
    const questionAr = clean(input.questionAr ?? "", 500, false);
    const optionsFr = input.optionsFr.map((value) => clean(value, 255)).filter((value): value is string => Boolean(value));
    if (optionsFr.length < 2 || optionsFr.length > 8) throw new Error("Un sondage doit contenir entre 2 et 8 choix");
    const optionsAr = input.optionsAr ?? [];
    const endsAt = input.endsAt?.trim() ? new Date(input.endsAt) : null;
    if (endsAt && !Number.isFinite(endsAt.getTime())) throw new Error("Date de fin invalide");

    const db = await getDataSource();
    const pollId = randomUUID();
    await db.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO cms_supporter_polls
          (id, team_id, question_fr, question_ar, status, starts_at, ends_at, created_by)
         VALUES (?, ?, ?, ?, 'OPEN', NOW(), ?, ?)`,
        [pollId, input.teamId, questionFr, questionAr, endsAt, input.actorId],
      );
      for (let index = 0; index < optionsFr.length; index += 1) {
        await manager.query(
          `INSERT INTO cms_supporter_poll_options
            (id, poll_id, label_fr, label_ar, sort_order)
           VALUES (?, ?, ?, ?, ?)`,
          [randomUUID(), pollId, optionsFr[index], clean(optionsAr[index] ?? "", 255, false), index],
        );
      }
    });
    return pollId;
  }

  async closePoll(teamId: string, pollId: string): Promise<void> {
    const db = await getDataSource();
    const result = await db.query(
      `UPDATE cms_supporter_polls SET status = 'CLOSED', updated_at = NOW()
       WHERE id = ? AND team_id = ? AND status = 'OPEN'`,
      [pollId, teamId],
    );
    if (affectedRows(result) !== 1) throw new Error("Sondage introuvable ou déjà fermé");
  }

  async publishClubPost(input: {
    teamId: string;
    actorId: string;
    actorName: string;
    title?: string;
    body: string;
    visibility: "PUBLIC" | "MEMBER";
  }): Promise<string> {
    const id = randomUUID();
    const title = clean(input.title ?? "", 255, false);
    const body = clean(input.body, 1500) as string;
    const db = await getDataSource();
    await db.query(
      `INSERT INTO cms_supporter_posts
        (id, team_id, author_user_id, author_name, source_type, visibility, title, body, status, moderated_by, moderated_at)
       VALUES (?, ?, ?, ?, 'CLUB', ?, ?, ?, 'APPROVED', ?, NOW())`,
      [id, input.teamId, input.actorId, clean(input.actorName, 120) ?? "Club", input.visibility, title, body, input.actorId],
    );
    return id;
  }

  async createGroup(input: { teamId: string; actorId: string; name: string; description?: string }): Promise<string> {
    const id = randomUUID();
    const db = await getDataSource();
    await db.query(
      `INSERT INTO cms_supporter_groups (id, team_id, name, description, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [id, input.teamId, clean(input.name, 160), clean(input.description ?? "", 1000, false), input.actorId],
    );
    return id;
  }

  async createGroupEvent(input: {
    teamId: string;
    actorId: string;
    groupId: string;
    title: string;
    description?: string;
    location?: string;
    startsAt: string;
  }): Promise<string> {
    const startsAt = new Date(input.startsAt);
    if (!Number.isFinite(startsAt.getTime())) throw new Error("Date invalide");
    const db = await getDataSource();
    const groups = await db.query(
      `SELECT id FROM cms_supporter_groups WHERE id = ? AND team_id = ? AND status = 'ACTIVE' LIMIT 1`,
      [input.groupId, input.teamId],
    ) as Array<{ id: string }>;
    if (!groups[0]) throw new Error("Groupe introuvable");
    const id = randomUUID();
    await db.query(
      `INSERT INTO cms_supporter_group_events
        (id, group_id, team_id, title, description, location, starts_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.groupId,
        input.teamId,
        clean(input.title, 255),
        clean(input.description ?? "", 1000, false),
        clean(input.location ?? "", 255, false),
        startsAt,
        input.actorId,
      ],
    );
    return id;
  }
}
