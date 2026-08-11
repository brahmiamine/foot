import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { Match } from "@/entities/Match";
import { News } from "@/entities/News";
import { MediaGallery } from "@/entities/MediaGallery";
import { MsGoal } from "@/entities/MsGoal";
import { ObKickoffNotified } from "@/entities/ObKickoffNotified";
import { TicketHold } from "@/entities/TicketHold";
import { TicketOrder } from "@/entities/TicketOrder";
import { getObTeam } from "@/lib/ob-team";
import { notifyOptedIn } from "@/lib/notifications/push";
import { getCursor, setCursor } from "@/lib/notifications/cursor";
import { MoreThan, Between, IsNull, LessThan } from "typeorm";

export const runtime = "nodejs";

/**
 * Point d'entrée unique pour les notifications programmées (#26) : rappels
 * de coup d'envoi, buts, résultats de match, nouveau contenu. `ob` n'a pas
 * d'ordonnanceur persistant — cet endpoint doit être appelé périodiquement
 * (toutes les 2-5 minutes) par un cron externe (cron système, Vercel Cron,
 * GitHub Actions scheduled workflow...), protégé par CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const team = await getObTeam();
  if (!team) {
    return NextResponse.json({ error: "Club non configuré" }, { status: 500 });
  }

  const now = new Date();
  const [kickoffs, goals, results, content, expiredHolds] = await Promise.all([
    notifyKickoffs(team.id, now),
    notifyGoals(team.id, now),
    notifyResults(team.id, now),
    notifyNewContent(team.id, now),
    releaseExpiredTicketHolds(now),
  ]);

  return NextResponse.json({ success: true, kickoffs, goals, results, content, expiredHolds });
}

/**
 * Libère les réservations de billets (#billetterie) dont le délai est
 * dépassé. Ceci n'est pas nécessaire à la correction du calcul de
 * disponibilité (TicketingService.getAvailability filtre déjà `expiresAt >
 * now`) — c'est un nettoyage de tenue à jour : marque les holds comme
 * `released_at` et les commandes PENDING encore ouvertes comme EXPIRED,
 * pour que l'admin (liste des commandes côté teamManager) ne les voie pas
 * traîner indéfiniment en "En attente".
 */
async function releaseExpiredTicketHolds(now: Date): Promise<number> {
  const dataSource = await getDataSource();
  const holdRepo = dataSource.getRepository(TicketHold);
  const orderRepo = dataSource.getRepository(TicketOrder);

  const expired = await holdRepo.find({ where: { releasedAt: IsNull(), expiresAt: LessThan(now) } });
  if (expired.length === 0) return 0;

  for (const hold of expired) {
    hold.releasedAt = now;
  }
  await holdRepo.save(expired);

  const orderIds = [...new Set(expired.map((h) => h.orderId))];
  for (const orderId of orderIds) {
    await orderRepo.update({ id: orderId, status: "PENDING" }, { status: "EXPIRED" });
  }

  return expired.length;
}

async function notifyKickoffs(teamId: string, now: Date): Promise<number> {
  const dataSource = await getDataSource();
  const windowStart = new Date(now.getTime() + 50 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 70 * 60 * 1000);

  const matches = await dataSource.getRepository(Match).find({
    where: [
      { equipeHome: teamId, status: "UPCOMING", date: Between(windowStart, windowEnd) },
      { equipeAway: teamId, status: "UPCOMING", date: Between(windowStart, windowEnd) },
    ],
    relations: ["homeTeam", "awayTeam"],
  });

  let sent = 0;
  const cursorRepo = dataSource.getRepository(ObKickoffNotified);
  for (const match of matches) {
    const already = await cursorRepo.findOne({ where: { matchId: match.id } });
    if (already) continue;

    const opponent = match.equipeHome === teamId ? match.awayTeam?.nom : match.homeTeam?.nom;
    await notifyOptedIn("matches", {
      title: "🔔 Coup d'envoi bientôt",
      body: `OB vs ${opponent ?? "adversaire"} — coup d'envoi dans 1 heure.`,
      url: "/",
    });
    await cursorRepo.save(cursorRepo.create({ matchId: match.id }));
    sent++;
  }
  return sent;
}

async function notifyGoals(teamId: string, now: Date): Promise<number> {
  const dataSource = await getDataSource();
  const since = await getCursor("goals");

  const goals = await dataSource.getRepository(MsGoal).find({
    where: { teamId, createdAt: MoreThan(since) },
  });

  for (const goal of goals) {
    if (goal.isOwnGoal) continue;
    await notifyOptedIn("matches", {
      title: "⚽ But de l'OB !",
      body: `L'OB vient de marquer (${goal.minute}') !`,
      url: "/",
    });
  }

  await setCursor("goals", now);
  return goals.length;
}

async function notifyResults(teamId: string, now: Date): Promise<number> {
  const dataSource = await getDataSource();
  const since = await getCursor("match_results");

  const matches = await dataSource.getRepository(Match).find({
    where: [
      { equipeHome: teamId, status: "FINISHED", date: Between(since, now) },
      { equipeAway: teamId, status: "FINISHED", date: Between(since, now) },
    ],
    relations: ["homeTeam", "awayTeam"],
  });

  for (const match of matches) {
    if (match.scoreHome == null || match.scoreAway == null) continue;
    const obScore = match.equipeHome === teamId ? match.scoreHome : match.scoreAway;
    const oppScore = match.equipeHome === teamId ? match.scoreAway : match.scoreHome;
    const opponent = match.equipeHome === teamId ? match.awayTeam?.nom : match.homeTeam?.nom;

    const title = obScore > oppScore ? "🏆 Victoire de l'OB !" : obScore < oppScore ? "Résultat OB" : "Match nul";
    await notifyOptedIn("results", {
      title,
      body: `OB ${match.scoreHome} - ${match.scoreAway} ${opponent ?? ""}`.trim(),
      url: "/calendrier",
    });
  }

  await setCursor("match_results", now);
  return matches.length;
}

async function notifyNewContent(teamId: string, now: Date): Promise<number> {
  const dataSource = await getDataSource();
  const since = await getCursor("content");

  const [news, galleries] = await Promise.all([
    dataSource.getRepository(News).find({
      where: { teamId, isPublished: true, publishedAt: MoreThan(since) },
    }),
    dataSource.getRepository(MediaGallery).find({
      where: { teamId, isPublic: true, createdAt: MoreThan(since) },
    }),
  ]);

  for (const article of news) {
    await notifyOptedIn("news", { title: "📰 Nouvelle actualité", body: article.title, url: "/actualites" });
  }
  for (const gallery of galleries) {
    await notifyOptedIn("news", {
      title: "📸 Nouvelle galerie disponible",
      body: gallery.titleFr,
      url: "/galerie",
    });
  }

  await setCursor("content", now);
  return news.length + galleries.length;
}
