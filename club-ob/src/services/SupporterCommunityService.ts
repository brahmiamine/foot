import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";
import {
  calculatePredictionResultPoints,
  canSubmitPrediction,
  type CommunityReaction,
} from "@/lib/communityRules";

export type CommunityLocale = "fr" | "ar";
export type CommunityTargetType = "NEWS" | "POST";

export interface CommunityPlayer {
  id: string;
  name: string;
  number: number | null;
}

export interface CommunityMatch {
  id: string;
  date: string | null;
  status: string;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  prediction?: { homeScore: number; awayScore: number; firstScorerId: string | null } | null;
  votePlayerId?: string | null;
  eligiblePlayers?: CommunityPlayer[];
}

export interface CommunityPollOption {
  id: string;
  label: string;
  votes: number;
}

export interface CommunityPoll {
  id: string;
  question: string;
  options: CommunityPollOption[];
  selectedOptionId: string | null;
  totalVotes: number;
  endsAt: string | null;
}

export interface CommunityPost {
  id: string;
  authorName: string;
  sourceType: "SUPPORTER" | "CLUB";
  visibility: "PUBLIC" | "MEMBER";
  title: string | null;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  reactions: Record<CommunityReaction, number>;
  userReaction: CommunityReaction | null;
  comments: Array<{ id: string; authorName: string; body: string; createdAt: string }>;
}

export interface SupporterProfileSummary {
  displayName: string;
  favoritePlayerId: string | null;
  favoriteStand: string | null;
  points: number;
  attendedMatches: number;
  predictionCount: number;
  predictionHits: number;
  voteCount: number;
  pollVoteCount: number;
  postCount: number;
  commentCount: number;
  joinedAt: string;
}

export interface SupporterBadge {
  code: string;
  label: string;
  description: string;
  icon: string;
  awardedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  points: number;
  attendedMatches: number;
}

export interface SupporterGroup {
  id: string;
  name: string;
  description: string | null;
  members: number;
  joined: boolean;
  nextEvent: { title: string; startsAt: string; location: string | null } | null;
}

export interface CommunitySnapshot {
  profile: SupporterProfileSummary | null;
  badges: SupporterBadge[];
  activePlayers: CommunityPlayer[];
  upcomingMatches: CommunityMatch[];
  finishedMatches: CommunityMatch[];
  polls: CommunityPoll[];
  posts: CommunityPost[];
  leaderboard: LeaderboardEntry[];
  fanOfMonth: LeaderboardEntry | null;
  groups: SupporterGroup[];
}

type QueryResult = { affectedRows?: number };

function affectedRows(result: unknown): number {
  if (result && typeof result === "object" && "affectedRows" in result) {
    return Number((result as QueryResult).affectedRows ?? 0);
  }
  return 0;
}

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function displayName(row: Record<string, unknown>, locale: CommunityLocale, frKey: string, arKey: string): string {
  const fr = String(row[frKey] ?? "").trim();
  const ar = String(row[arKey] ?? "").trim();
  return locale === "ar" && ar ? ar : fr;
}

function outcome(home: number, away: number): -1 | 0 | 1 {
  if (home === away) return 0;
  return home > away ? 1 : -1;
}

export class SupporterCommunityService {
  async ensureProfile(userId: string, teamId: string, memberName?: string | null): Promise<void> {
    const db = await getDataSource();
    await db.query(
      `INSERT INTO cms_supporter_profiles (user_id, team_id, display_name)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         display_name = CASE
           WHEN display_name IS NULL OR display_name = '' THEN VALUES(display_name)
           ELSE display_name
         END`,
      [userId, teamId, memberName?.trim().slice(0, 120) || null],
    );
  }

  private async awardLoyalty(
    userId: string,
    teamId: string,
    points: number,
    eventType: "ATTENDANCE" | "PREDICTION" | "MATCH_VOTE" | "POLL" | "POST" | "COMMENT" | "PROFILE" | "OTHER",
    sourceKey: string,
    label: string,
  ): Promise<boolean> {
    if (points === 0) return false;
    const db = await getDataSource();
    return db.transaction(async (manager) => {
      const result = await manager.query(
        `INSERT IGNORE INTO cms_supporter_loyalty_events
          (id, team_id, user_id, event_type, points, source_key, label)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), teamId, userId, eventType, points, sourceKey.slice(0, 255), label.slice(0, 255)],
      );
      if (affectedRows(result) === 0) return false;
      await manager.query(
        `UPDATE cms_supporter_profiles
         SET points = GREATEST(0, points + ?)
         WHERE team_id = ? AND user_id = ?`,
        [points, teamId, userId],
      );
      return true;
    });
  }

  private async refreshCounters(userId: string, teamId: string): Promise<void> {
    const db = await getDataSource();
    const rows = await db.query(
      `SELECT
         (SELECT COUNT(DISTINCT t.match_id)
            FROM tk_tickets t
           WHERE t.organizer_team_id = ? AND t.purchaser_id = ?
             AND t.status = 'USED' AND t.revoked = 0) AS attendedMatches,
         (SELECT COUNT(*) FROM cms_supporter_predictions p WHERE p.team_id = ? AND p.user_id = ?) AS predictionCount,
         (SELECT COUNT(*) FROM cms_supporter_predictions p WHERE p.team_id = ? AND p.user_id = ? AND p.settled_at IS NOT NULL
            AND (p.points_awarded >= 20)) AS predictionHits,
         (SELECT COUNT(*) FROM cms_supporter_match_votes v WHERE v.team_id = ? AND v.user_id = ?) AS voteCount,
         (SELECT COUNT(*) FROM cms_supporter_poll_votes v WHERE v.team_id = ? AND v.user_id = ?) AS pollVoteCount,
         (SELECT COUNT(*) FROM cms_supporter_posts p WHERE p.team_id = ? AND p.author_user_id = ? AND p.status = 'APPROVED' AND p.source_type = 'SUPPORTER') AS postCount,
         (SELECT COUNT(*) FROM cms_supporter_comments c WHERE c.team_id = ? AND c.user_id = ? AND c.status = 'APPROVED') AS commentCount`,
      [teamId, userId, teamId, userId, teamId, userId, teamId, userId, teamId, userId, teamId, userId, teamId, userId],
    ) as Array<Record<string, number | string>>;
    const row = rows[0];
    if (!row) return;
    await db.query(
      `UPDATE cms_supporter_profiles SET
         attended_matches = ?, prediction_count = ?, prediction_hits = ?, vote_count = ?,
         poll_vote_count = ?, post_count = ?, comment_count = ?
       WHERE team_id = ? AND user_id = ?`,
      [
        Number(row.attendedMatches ?? 0), Number(row.predictionCount ?? 0), Number(row.predictionHits ?? 0),
        Number(row.voteCount ?? 0), Number(row.pollVoteCount ?? 0), Number(row.postCount ?? 0), Number(row.commentCount ?? 0),
        teamId, userId,
      ],
    );
  }

  private async refreshBadges(userId: string, teamId: string): Promise<void> {
    const db = await getDataSource();
    const rows = await db.query(
      `SELECT attended_matches AS attendedMatches, prediction_count AS predictionCount,
              prediction_hits AS predictionHits, vote_count AS voteCount,
              poll_vote_count AS pollVoteCount, post_count AS postCount,
              comment_count AS commentCount
       FROM cms_supporter_profiles WHERE team_id = ? AND user_id = ? LIMIT 1`,
      [teamId, userId],
    ) as Array<Record<string, number | string>>;
    const row = rows[0];
    if (!row) return;
    const attended = Number(row.attendedMatches ?? 0);
    const predictions = Number(row.predictionCount ?? 0);
    const hits = Number(row.predictionHits ?? 0);
    const community = Number(row.voteCount ?? 0) + Number(row.pollVoteCount ?? 0) + Number(row.postCount ?? 0) + Number(row.commentCount ?? 0);
    const badges = [
      attended >= 1 ? "FIRST_MATCH" : null,
      attended >= 5 ? "STADIUM_5" : null,
      attended >= 10 ? "STADIUM_10" : null,
      predictions >= 10 ? "PREDICTOR_10" : null,
      hits >= 5 ? "ORACLE_5" : null,
      community >= 20 ? "COMMUNITY_20" : null,
    ].filter((code): code is string => Boolean(code));
    for (const code of badges) {
      await db.query(
        `INSERT IGNORE INTO cms_supporter_member_badges (team_id, user_id, badge_code) VALUES (?, ?, ?)`,
        [teamId, userId, code],
      );
    }
  }

  async syncMemberRewards(userId: string, teamId: string, memberName?: string | null): Promise<void> {
    await this.ensureProfile(userId, teamId, memberName);
    const db = await getDataSource();

    const attendance = await db.query(
      `SELECT DISTINCT match_id AS matchId
       FROM tk_tickets
       WHERE organizer_team_id = ? AND purchaser_id = ? AND status = 'USED' AND revoked = 0`,
      [teamId, userId],
    ) as Array<{ matchId: string }>;
    for (const item of attendance) {
      await this.awardLoyalty(userId, teamId, 100, "ATTENDANCE", `attendance:${item.matchId}`, "Présence au stade");
    }

    const unsettled = await db.query(
      `SELECT p.id, p.match_id AS matchId, p.home_score AS homeScore, p.away_score AS awayScore,
              p.first_scorer_id AS firstScorerId, m.score_home AS resultHome, m.score_away AS resultAway
       FROM cms_supporter_predictions p
       JOIN matches m ON m.id = p.match_id
       WHERE p.team_id = ? AND p.user_id = ? AND p.settled_at IS NULL
         AND m.status = 'FINISHED' AND m.score_home IS NOT NULL AND m.score_away IS NOT NULL`,
      [teamId, userId],
    ) as Array<{
      id: string; matchId: string; homeScore: number; awayScore: number; firstScorerId: string | null;
      resultHome: number; resultAway: number;
    }>;

    for (const prediction of unsettled) {
      const goals = await db.query(
        `SELECT player_id AS playerId
         FROM ms_goals
         WHERE match_id = ? AND player_id IS NOT NULL
         ORDER BY FIELD(period, 'H1', 'H2', 'ET1', 'ET2'), minute ASC, id ASC
         LIMIT 1`,
        [prediction.matchId],
      ) as Array<{ playerId: string }>;
      const resultPoints = calculatePredictionResultPoints(
        { homeScore: Number(prediction.homeScore), awayScore: Number(prediction.awayScore), firstScorerId: prediction.firstScorerId },
        { homeScore: Number(prediction.resultHome), awayScore: Number(prediction.resultAway), firstScorerId: goals[0]?.playerId ?? null },
      );
      if (resultPoints > 0) {
        await this.awardLoyalty(
          userId, teamId, resultPoints, "PREDICTION", `prediction-result:${prediction.id}`, "Résultat de pronostic",
        );
      }
      await db.query(
        `UPDATE cms_supporter_predictions
         SET points_awarded = ?, settled_at = NOW()
         WHERE id = ? AND team_id = ? AND user_id = ? AND settled_at IS NULL`,
        [resultPoints, prediction.id, teamId, userId],
      );
    }

    await this.refreshCounters(userId, teamId);
    await this.refreshBadges(userId, teamId);
  }

  async savePrediction(input: {
    userId: string; teamId: string; memberName: string; matchId: string;
    homeScore: number; awayScore: number; firstScorerId: string | null;
  }): Promise<void> {
    await this.ensureProfile(input.userId, input.teamId, input.memberName);
    const db = await getDataSource();
    const matches = await db.query(
      `SELECT id, date, status FROM matches
       WHERE id = ? AND is_public_visible = 1 AND (equipe_home = ? OR equipe_away = ?) LIMIT 1`,
      [input.matchId, input.teamId, input.teamId],
    ) as Array<{ id: string; date: Date | null; status: string }>;
    const match = matches[0];
    if (!match || !canSubmitPrediction(match.status, match.date)) throw new Error("PREDICTION_CLOSED");

    if (input.firstScorerId) {
      const player = await db.query(
        `SELECT id FROM Player WHERE id = ? AND teamId = ? AND isActive = 1 LIMIT 1`,
        [input.firstScorerId, input.teamId],
      ) as Array<{ id: string }>;
      if (!player[0]) throw new Error("INVALID_SCORER");
    }

    await db.query(
      `INSERT INTO cms_supporter_predictions
        (id, team_id, user_id, match_id, home_score, away_score, first_scorer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         home_score = VALUES(home_score), away_score = VALUES(away_score),
         first_scorer_id = VALUES(first_scorer_id), updated_at = NOW()`,
      [randomUUID(), input.teamId, input.userId, input.matchId, input.homeScore, input.awayScore, input.firstScorerId],
    );
    await this.awardLoyalty(
      input.userId, input.teamId, 5, "PREDICTION", `prediction-entry:${input.matchId}`, "Participation à un pronostic",
    );
    await this.refreshCounters(input.userId, input.teamId);
  }

  async voteManOfMatch(input: {
    userId: string; teamId: string; memberName: string; matchId: string; playerId: string;
  }): Promise<void> {
    await this.ensureProfile(input.userId, input.teamId, input.memberName);
    const db = await getDataSource();
    const rows = await db.query(
      `SELECT m.id
       FROM matches m
       WHERE m.id = ? AND m.status = 'FINISHED' AND (m.equipe_home = ? OR m.equipe_away = ?)
         AND EXISTS (
           SELECT 1 FROM cms_match_lineups ml
           WHERE ml.match_id = m.id AND ml.team_id = ? AND ml.player_id = ?
             AND (ml.role = 'STARTER' OR EXISTS (
               SELECT 1 FROM ms_substitutions s
               WHERE s.match_id = m.id AND s.team_id = ? AND s.player_in_id = ml.player_id
             ))
         )
       LIMIT 1`,
      [input.matchId, input.teamId, input.teamId, input.teamId, input.playerId, input.teamId],
    ) as Array<{ id: string }>;
    if (!rows[0]) throw new Error("INVALID_MATCH_VOTE");
    await db.query(
      `INSERT INTO cms_supporter_match_votes (id, team_id, user_id, match_id, player_id)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE player_id = VALUES(player_id), updated_at = NOW()`,
      [randomUUID(), input.teamId, input.userId, input.matchId, input.playerId],
    );
    await this.awardLoyalty(input.userId, input.teamId, 5, "MATCH_VOTE", `motm:${input.matchId}`, "Vote homme du match");
    await this.refreshCounters(input.userId, input.teamId);
  }

  async votePoll(input: {
    userId: string; teamId: string; memberName: string; pollId: string; optionId: string;
  }): Promise<void> {
    await this.ensureProfile(input.userId, input.teamId, input.memberName);
    const db = await getDataSource();
    const rows = await db.query(
      `SELECT p.id
       FROM cms_supporter_polls p
       JOIN cms_supporter_poll_options o ON o.poll_id = p.id
       WHERE p.id = ? AND p.team_id = ? AND o.id = ?
         AND p.status = 'OPEN'
         AND (p.starts_at IS NULL OR p.starts_at <= NOW())
         AND (p.ends_at IS NULL OR p.ends_at > NOW())
       LIMIT 1`,
      [input.pollId, input.teamId, input.optionId],
    ) as Array<{ id: string }>;
    if (!rows[0]) throw new Error("POLL_CLOSED");
    await db.query(
      `INSERT INTO cms_supporter_poll_votes (id, team_id, poll_id, option_id, user_id)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE option_id = VALUES(option_id), updated_at = NOW()`,
      [randomUUID(), input.teamId, input.pollId, input.optionId, input.userId],
    );
    await this.awardLoyalty(input.userId, input.teamId, 5, "POLL", `poll:${input.pollId}`, "Participation à un sondage");
    await this.refreshCounters(input.userId, input.teamId);
  }

  private async assertTarget(teamId: string, targetType: CommunityTargetType, targetId: string): Promise<void> {
    const db = await getDataSource();
    if (targetType === "NEWS") {
      const numericId = Number(targetId);
      if (!Number.isInteger(numericId)) throw new Error("INVALID_TARGET");
      const rows = await db.query(
        `SELECT id FROM News WHERE id = ? AND teamId = ? AND isPublished = 1 LIMIT 1`,
        [numericId, teamId],
      ) as Array<{ id: number }>;
      if (!rows[0]) throw new Error("INVALID_TARGET");
      return;
    }
    const rows = await db.query(
      `SELECT id FROM cms_supporter_posts WHERE id = ? AND team_id = ? AND status = 'APPROVED' LIMIT 1`,
      [targetId, teamId],
    ) as Array<{ id: string }>;
    if (!rows[0]) throw new Error("INVALID_TARGET");
  }

  async setReaction(input: {
    userId: string; teamId: string; memberName: string; targetType: CommunityTargetType;
    targetId: string; reaction: CommunityReaction;
  }): Promise<void> {
    await this.ensureProfile(input.userId, input.teamId, input.memberName);
    await this.assertTarget(input.teamId, input.targetType, input.targetId);
    const db = await getDataSource();
    await db.query(
      `INSERT INTO cms_supporter_reactions (id, team_id, user_id, target_type, target_id, reaction)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE reaction = VALUES(reaction), updated_at = NOW()`,
      [randomUUID(), input.teamId, input.userId, input.targetType, input.targetId, input.reaction],
    );
  }

  async submitComment(input: {
    userId: string; teamId: string; memberName: string; targetType: CommunityTargetType;
    targetId: string; body: string;
  }): Promise<void> {
    await this.ensureProfile(input.userId, input.teamId, input.memberName);
    await this.assertTarget(input.teamId, input.targetType, input.targetId);
    const db = await getDataSource();
    const recent = await db.query(
      `SELECT COUNT(*) AS total FROM cms_supporter_comments
       WHERE team_id = ? AND user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
      [input.teamId, input.userId],
    ) as Array<{ total: number | string }>;
    if (Number(recent[0]?.total ?? 0) >= 5) throw new Error("RATE_LIMITED");
    await db.query(
      `INSERT INTO cms_supporter_comments
        (id, team_id, user_id, author_name, target_type, target_id, body, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [randomUUID(), input.teamId, input.userId, input.memberName.slice(0, 120), input.targetType, input.targetId, input.body],
    );
  }

  async submitPost(input: {
    userId: string; teamId: string; memberName: string; body: string; imageUrl: string | null;
  }): Promise<void> {
    await this.ensureProfile(input.userId, input.teamId, input.memberName);
    const db = await getDataSource();
    const recent = await db.query(
      `SELECT COUNT(*) AS total FROM cms_supporter_posts
       WHERE team_id = ? AND author_user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)`,
      [input.teamId, input.userId],
    ) as Array<{ total: number | string }>;
    if (Number(recent[0]?.total ?? 0) >= 3) throw new Error("RATE_LIMITED");
    await db.query(
      `INSERT INTO cms_supporter_posts
        (id, team_id, author_user_id, author_name, source_type, visibility, body, image_url, status)
       VALUES (?, ?, ?, ?, 'SUPPORTER', 'PUBLIC', ?, ?, 'PENDING')`,
      [randomUUID(), input.teamId, input.userId, input.memberName.slice(0, 120), input.body, input.imageUrl],
    );
  }

  async savePreferences(input: {
    userId: string; teamId: string; memberName: string; favoritePlayerId: string | null; favoriteStand: string | null;
  }): Promise<void> {
    await this.ensureProfile(input.userId, input.teamId, input.memberName);
    const db = await getDataSource();
    if (input.favoritePlayerId) {
      const rows = await db.query(
        `SELECT id FROM Player WHERE id = ? AND teamId = ? LIMIT 1`,
        [input.favoritePlayerId, input.teamId],
      ) as Array<{ id: string }>;
      if (!rows[0]) throw new Error("INVALID_PLAYER");
    }
    await db.query(
      `UPDATE cms_supporter_profiles
       SET favorite_player_id = ?, favorite_stand = ?, display_name = ?
       WHERE team_id = ? AND user_id = ?`,
      [input.favoritePlayerId, input.favoriteStand, input.memberName.slice(0, 120), input.teamId, input.userId],
    );
    if (input.favoritePlayerId || input.favoriteStand) {
      await this.awardLoyalty(input.userId, input.teamId, 10, "PROFILE", "profile:community", "Profil supporter complété");
    }
  }

  async joinGroup(input: { userId: string; teamId: string; memberName: string; groupId: string }): Promise<void> {
    await this.ensureProfile(input.userId, input.teamId, input.memberName);
    const db = await getDataSource();
    const groups = await db.query(
      `SELECT id FROM cms_supporter_groups WHERE id = ? AND team_id = ? AND status = 'ACTIVE' LIMIT 1`,
      [input.groupId, input.teamId],
    ) as Array<{ id: string }>;
    if (!groups[0]) throw new Error("INVALID_GROUP");
    await db.query(
      `INSERT IGNORE INTO cms_supporter_group_members (group_id, team_id, user_id) VALUES (?, ?, ?)`,
      [input.groupId, input.teamId, input.userId],
    );
  }

  async getNewsEngagement(teamId: string, newsId: string, userId?: string | null): Promise<{
    counts: Record<CommunityReaction, number>;
    userReaction: CommunityReaction | null;
    comments: Array<{ id: string; authorName: string; body: string; createdAt: string }>;
  }> {
    await this.assertTarget(teamId, "NEWS", newsId);
    const db = await getDataSource();
    const reactionRows = await db.query(
      `SELECT reaction, COUNT(*) AS total FROM cms_supporter_reactions
       WHERE team_id = ? AND target_type = 'NEWS' AND target_id = ? GROUP BY reaction`,
      [teamId, newsId],
    ) as Array<{ reaction: CommunityReaction; total: number | string }>;
    const comments = await db.query(
      `SELECT id, COALESCE(NULLIF(author_name, ''), 'Supporter OB') AS authorName, body, created_at AS createdAt
       FROM cms_supporter_comments
       WHERE team_id = ? AND target_type = 'NEWS' AND target_id = ? AND status = 'APPROVED'
       ORDER BY created_at DESC LIMIT 50`,
      [teamId, newsId],
    ) as Array<{ id: string; authorName: string; body: string; createdAt: Date }>;
    let userReaction: CommunityReaction | null = null;
    if (userId) {
      const rows = await db.query(
        `SELECT reaction FROM cms_supporter_reactions
         WHERE team_id = ? AND user_id = ? AND target_type = 'NEWS' AND target_id = ? LIMIT 1`,
        [teamId, userId, newsId],
      ) as Array<{ reaction: CommunityReaction }>;
      userReaction = rows[0]?.reaction ?? null;
    }
    const counts: Record<CommunityReaction, number> = { LIKE: 0, FIRE: 0, BRAVO: 0, SAD: 0 };
    for (const row of reactionRows) counts[row.reaction] = Number(row.total);
    return {
      counts,
      userReaction,
      comments: comments.map((comment) => ({ ...comment, createdAt: iso(comment.createdAt) ?? "" })),
    };
  }

  private async activePlayers(teamId: string, locale: CommunityLocale): Promise<CommunityPlayer[]> {
    const db = await getDataSource();
    const rows = await db.query(
      `SELECT id, firstNameFr, lastNameFr, firstNameAr, lastNameAr, number
       FROM Player WHERE teamId = ? AND isActive = 1 AND category = 'seniors'
       ORDER BY number ASC, lastNameFr ASC`,
      [teamId],
    ) as Array<Record<string, unknown>>;
    return rows.map((row) => {
      const fr = `${String(row.firstNameFr ?? "")} ${String(row.lastNameFr ?? "")}`.trim();
      const ar = `${String(row.firstNameAr ?? "")} ${String(row.lastNameAr ?? "")}`.trim();
      return { id: String(row.id), name: locale === "ar" && ar ? ar : fr, number: row.number == null ? null : Number(row.number) };
    });
  }

  private async eligiblePlayers(matchId: string, teamId: string, locale: CommunityLocale): Promise<CommunityPlayer[]> {
    const db = await getDataSource();
    const rows = await db.query(
      `SELECT DISTINCT p.id, p.firstNameFr, p.lastNameFr, p.firstNameAr, p.lastNameAr, p.number
       FROM Player p
       JOIN cms_match_lineups ml ON ml.player_id = p.id
       WHERE ml.match_id = ? AND ml.team_id = ?
         AND (ml.role = 'STARTER' OR EXISTS (
           SELECT 1 FROM ms_substitutions s
           WHERE s.match_id = ml.match_id AND s.team_id = ml.team_id AND s.player_in_id = ml.player_id
         ))
       ORDER BY p.number ASC, p.lastNameFr ASC`,
      [matchId, teamId],
    ) as Array<Record<string, unknown>>;
    return rows.map((row) => {
      const fr = `${String(row.firstNameFr ?? "")} ${String(row.lastNameFr ?? "")}`.trim();
      const ar = `${String(row.firstNameAr ?? "")} ${String(row.lastNameAr ?? "")}`.trim();
      return { id: String(row.id), name: locale === "ar" && ar ? ar : fr, number: row.number == null ? null : Number(row.number) };
    });
  }

  async getSnapshot(teamId: string, locale: CommunityLocale, user?: { id: string; name: string } | null): Promise<CommunitySnapshot> {
    if (user) await this.syncMemberRewards(user.id, teamId, user.name);
    const db = await getDataSource();
    const players = await this.activePlayers(teamId, locale);

    const matchRows = await db.query(
      `SELECT m.id, m.date, m.status, m.score_home AS homeScore, m.score_away AS awayScore,
              h.nom AS homeFr, h.nom_ar AS homeAr, a.nom AS awayFr, a.nom_ar AS awayAr
       FROM matches m
       JOIN teams h ON h.id = m.equipe_home
       JOIN teams a ON a.id = m.equipe_away
       WHERE m.is_public_visible = 1 AND (m.equipe_home = ? OR m.equipe_away = ?)
         AND (m.status = 'UPCOMING' OR (m.status = 'FINISHED' AND m.date >= DATE_SUB(NOW(), INTERVAL 14 DAY)))
       ORDER BY CASE WHEN m.status = 'UPCOMING' THEN 0 ELSE 1 END, m.date ASC`,
      [teamId, teamId],
    ) as Array<Record<string, unknown>>;

    const upcomingRows = matchRows.filter((row) => row.status === "UPCOMING").slice(0, 3);
    const finishedRows = matchRows.filter((row) => row.status === "FINISHED").sort((a, b) => new Date(String(b.date)).getTime() - new Date(String(a.date)).getTime()).slice(0, 3);
    const predictionMap = new Map<string, { homeScore: number; awayScore: number; firstScorerId: string | null }>();
    const voteMap = new Map<string, string>();
    if (user) {
      const predictions = await db.query(
        `SELECT match_id AS matchId, home_score AS homeScore, away_score AS awayScore, first_scorer_id AS firstScorerId
         FROM cms_supporter_predictions WHERE team_id = ? AND user_id = ?`,
        [teamId, user.id],
      ) as Array<{ matchId: string; homeScore: number; awayScore: number; firstScorerId: string | null }>;
      for (const prediction of predictions) predictionMap.set(prediction.matchId, prediction);
      const votes = await db.query(
        `SELECT match_id AS matchId, player_id AS playerId FROM cms_supporter_match_votes WHERE team_id = ? AND user_id = ?`,
        [teamId, user.id],
      ) as Array<{ matchId: string; playerId: string }>;
      for (const vote of votes) voteMap.set(vote.matchId, vote.playerId);
    }

    const toMatch = (row: Record<string, unknown>): CommunityMatch => ({
      id: String(row.id), date: iso(row.date as Date | string | null), status: String(row.status),
      homeName: displayName(row, locale, "homeFr", "homeAr"), awayName: displayName(row, locale, "awayFr", "awayAr"),
      homeScore: row.homeScore == null ? null : Number(row.homeScore), awayScore: row.awayScore == null ? null : Number(row.awayScore),
      prediction: predictionMap.get(String(row.id)) ?? null, votePlayerId: voteMap.get(String(row.id)) ?? null,
    });
    const upcomingMatches = upcomingRows.map(toMatch);
    const finishedMatches: CommunityMatch[] = [];
    for (const row of finishedRows) {
      const match = toMatch(row);
      match.eligiblePlayers = await this.eligiblePlayers(match.id, teamId, locale);
      finishedMatches.push(match);
    }

    const pollRows = await db.query(
      `SELECT p.id AS pollId, p.question_fr AS questionFr, p.question_ar AS questionAr, p.ends_at AS endsAt,
              o.id AS optionId, o.label_fr AS optionFr, o.label_ar AS optionAr,
              COUNT(v.id) AS votes
       FROM cms_supporter_polls p
       JOIN cms_supporter_poll_options o ON o.poll_id = p.id
       LEFT JOIN cms_supporter_poll_votes v ON v.option_id = o.id
       WHERE p.team_id = ? AND p.status = 'OPEN'
         AND (p.starts_at IS NULL OR p.starts_at <= NOW())
         AND (p.ends_at IS NULL OR p.ends_at > NOW())
       GROUP BY p.id, p.question_fr, p.question_ar, p.ends_at, o.id, o.label_fr, o.label_ar, o.sort_order
       ORDER BY p.created_at DESC, o.sort_order ASC`,
      [teamId],
    ) as Array<Record<string, unknown>>;
    const userPollVotes = new Map<string, string>();
    if (user) {
      const votes = await db.query(
        `SELECT poll_id AS pollId, option_id AS optionId FROM cms_supporter_poll_votes WHERE team_id = ? AND user_id = ?`,
        [teamId, user.id],
      ) as Array<{ pollId: string; optionId: string }>;
      for (const vote of votes) userPollVotes.set(vote.pollId, vote.optionId);
    }
    const pollMap = new Map<string, CommunityPoll>();
    for (const row of pollRows) {
      const pollId = String(row.pollId);
      const poll = pollMap.get(pollId) ?? {
        id: pollId,
        question: locale === "ar" && row.questionAr ? String(row.questionAr) : String(row.questionFr),
        options: [], selectedOptionId: userPollVotes.get(pollId) ?? null, totalVotes: 0, endsAt: iso(row.endsAt as Date | null),
      };
      const votes = Number(row.votes ?? 0);
      poll.options.push({
        id: String(row.optionId),
        label: locale === "ar" && row.optionAr ? String(row.optionAr) : String(row.optionFr),
        votes,
      });
      poll.totalVotes += votes;
      pollMap.set(pollId, poll);
    }

    const postRows = await db.query(
      `SELECT id, COALESCE(NULLIF(author_name, ''), 'Supporter OB') AS authorName,
              source_type AS sourceType, visibility, title, body, image_url AS imageUrl, created_at AS createdAt
       FROM cms_supporter_posts
       WHERE team_id = ? AND status = 'APPROVED' AND (visibility = 'PUBLIC' OR ? = 1)
       ORDER BY created_at DESC LIMIT 25`,
      [teamId, user ? 1 : 0],
    ) as Array<{
      id: string; authorName: string; sourceType: "SUPPORTER" | "CLUB"; visibility: "PUBLIC" | "MEMBER";
      title: string | null; body: string; imageUrl: string | null; createdAt: Date;
    }>;
    const posts: CommunityPost[] = [];
    for (const post of postRows) {
      const reactionRows = await db.query(
        `SELECT reaction, COUNT(*) AS total FROM cms_supporter_reactions
         WHERE team_id = ? AND target_type = 'POST' AND target_id = ? GROUP BY reaction`,
        [teamId, post.id],
      ) as Array<{ reaction: CommunityReaction; total: number | string }>;
      const counts: Record<CommunityReaction, number> = { LIKE: 0, FIRE: 0, BRAVO: 0, SAD: 0 };
      for (const reaction of reactionRows) counts[reaction.reaction] = Number(reaction.total);
      let userReaction: CommunityReaction | null = null;
      if (user) {
        const rows = await db.query(
          `SELECT reaction FROM cms_supporter_reactions
           WHERE team_id = ? AND user_id = ? AND target_type = 'POST' AND target_id = ? LIMIT 1`,
          [teamId, user.id, post.id],
        ) as Array<{ reaction: CommunityReaction }>;
        userReaction = rows[0]?.reaction ?? null;
      }
      const comments = await db.query(
        `SELECT id, COALESCE(NULLIF(author_name, ''), 'Supporter OB') AS authorName, body, created_at AS createdAt
         FROM cms_supporter_comments
         WHERE team_id = ? AND target_type = 'POST' AND target_id = ? AND status = 'APPROVED'
         ORDER BY created_at ASC LIMIT 20`,
        [teamId, post.id],
      ) as Array<{ id: string; authorName: string; body: string; createdAt: Date }>;
      posts.push({
        ...post,
        createdAt: iso(post.createdAt) ?? "",
        reactions: counts,
        userReaction,
        comments: comments.map((comment) => ({ ...comment, createdAt: iso(comment.createdAt) ?? "" })),
      });
    }

    const leaderboardRows = await db.query(
      `SELECT COALESCE(NULLIF(display_name, ''), 'Supporter OB') AS displayName,
              points, attended_matches AS attendedMatches
       FROM cms_supporter_profiles
       WHERE team_id = ? AND points > 0
       ORDER BY points DESC, attended_matches DESC, joined_at ASC LIMIT 10`,
      [teamId],
    ) as Array<{ displayName: string; points: number; attendedMatches: number }>;
    const leaderboard = leaderboardRows.map((row, index) => ({
      rank: index + 1, displayName: row.displayName, points: Number(row.points), attendedMatches: Number(row.attendedMatches),
    }));

    const fanRows = await db.query(
      `SELECT COALESCE(NULLIF(p.display_name, ''), 'Supporter OB') AS displayName,
              SUM(e.points) AS points, p.attended_matches AS attendedMatches
       FROM cms_supporter_loyalty_events e
       JOIN cms_supporter_profiles p ON p.team_id = e.team_id AND p.user_id = e.user_id
       WHERE e.team_id = ? AND e.created_at >= DATE_FORMAT(NOW(), '%Y-%m-01') AND e.points > 0
       GROUP BY e.user_id, p.display_name, p.attended_matches
       ORDER BY points DESC, p.attended_matches DESC LIMIT 1`,
      [teamId],
    ) as Array<{ displayName: string; points: number | string; attendedMatches: number }>;
    const fanOfMonth = fanRows[0]
      ? { rank: 1, displayName: fanRows[0].displayName, points: Number(fanRows[0].points), attendedMatches: Number(fanRows[0].attendedMatches) }
      : null;

    const groupRows = await db.query(
      `SELECT g.id, g.name, g.description,
              COUNT(DISTINCT gm.user_id) AS members,
              MAX(CASE WHEN mine.user_id IS NOT NULL THEN 1 ELSE 0 END) AS joined,
              e.title AS eventTitle, e.starts_at AS eventStartsAt, e.location AS eventLocation
       FROM cms_supporter_groups g
       LEFT JOIN cms_supporter_group_members gm ON gm.group_id = g.id
       LEFT JOIN cms_supporter_group_members mine ON mine.group_id = g.id AND mine.user_id = ?
       LEFT JOIN cms_supporter_group_events e ON e.id = (
         SELECT e2.id FROM cms_supporter_group_events e2
         WHERE e2.group_id = g.id AND e2.starts_at >= NOW()
         ORDER BY e2.starts_at ASC LIMIT 1
       )
       WHERE g.team_id = ? AND g.status = 'ACTIVE'
       GROUP BY g.id, g.name, g.description, e.title, e.starts_at, e.location
       ORDER BY members DESC, g.created_at ASC`,
      [user?.id ?? "", teamId],
    ) as Array<Record<string, unknown>>;
    const groups = groupRows.map((row): SupporterGroup => ({
      id: String(row.id), name: String(row.name), description: row.description ? String(row.description) : null,
      members: Number(row.members ?? 0), joined: Boolean(Number(row.joined ?? 0)),
      nextEvent: row.eventTitle ? {
        title: String(row.eventTitle), startsAt: iso(row.eventStartsAt as Date) ?? "", location: row.eventLocation ? String(row.eventLocation) : null,
      } : null,
    }));

    let profile: SupporterProfileSummary | null = null;
    let badges: SupporterBadge[] = [];
    if (user) {
      const profiles = await db.query(
        `SELECT COALESCE(NULLIF(display_name, ''), ?) AS displayName,
                favorite_player_id AS favoritePlayerId, favorite_stand AS favoriteStand, points,
                attended_matches AS attendedMatches, prediction_count AS predictionCount,
                prediction_hits AS predictionHits, vote_count AS voteCount, poll_vote_count AS pollVoteCount,
                post_count AS postCount, comment_count AS commentCount, joined_at AS joinedAt
         FROM cms_supporter_profiles WHERE team_id = ? AND user_id = ? LIMIT 1`,
        [user.name, teamId, user.id],
      ) as Array<Record<string, unknown>>;
      const row = profiles[0];
      if (row) {
        profile = {
          displayName: String(row.displayName), favoritePlayerId: row.favoritePlayerId ? String(row.favoritePlayerId) : null,
          favoriteStand: row.favoriteStand ? String(row.favoriteStand) : null, points: Number(row.points ?? 0),
          attendedMatches: Number(row.attendedMatches ?? 0), predictionCount: Number(row.predictionCount ?? 0),
          predictionHits: Number(row.predictionHits ?? 0), voteCount: Number(row.voteCount ?? 0),
          pollVoteCount: Number(row.pollVoteCount ?? 0), postCount: Number(row.postCount ?? 0),
          commentCount: Number(row.commentCount ?? 0), joinedAt: iso(row.joinedAt as Date) ?? "",
        };
      }
      const badgeRows = await db.query(
        `SELECT b.code, b.label_fr AS labelFr, b.label_ar AS labelAr,
                b.description_fr AS descriptionFr, b.description_ar AS descriptionAr,
                b.icon, mb.awarded_at AS awardedAt
         FROM cms_supporter_member_badges mb
         JOIN cms_supporter_badges b ON b.code = mb.badge_code
         WHERE mb.team_id = ? AND mb.user_id = ?
         ORDER BY b.sort_order ASC`,
        [teamId, user.id],
      ) as Array<Record<string, unknown>>;
      badges = badgeRows.map((row) => ({
        code: String(row.code), label: locale === "ar" ? String(row.labelAr) : String(row.labelFr),
        description: locale === "ar" ? String(row.descriptionAr) : String(row.descriptionFr), icon: String(row.icon),
        awardedAt: iso(row.awardedAt as Date) ?? "",
      }));
    }

    return {
      profile,
      badges,
      activePlayers: players,
      upcomingMatches,
      finishedMatches,
      polls: Array.from(pollMap.values()),
      posts,
      leaderboard,
      fanOfMonth,
      groups,
    };
  }

  /** Exposé pour la modération club-hub : le fan du mois ne dépend jamais du montant dépensé. */
  static predictionOutcomeIsCorrect(predictedHome: number, predictedAway: number, resultHome: number, resultAway: number): boolean {
    return outcome(predictedHome, predictedAway) === outcome(resultHome, resultAway);
  }
}
