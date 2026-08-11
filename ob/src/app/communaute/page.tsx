import { PageChrome } from "@/components/PageChrome";
import { PostComposer } from "@/components/PostComposer";
import { ReactionBar } from "@/components/ReactionBar";
import { CommentSection } from "@/components/CommentSection";
import { PollCard } from "@/components/PollCard";
import { QuizCard } from "@/components/QuizCard";
import { ReportButton } from "@/components/ReportButton";
import { CommunityFeedService } from "@/services/CommunityFeedService";
import { PollService } from "@/services/PollService";
import { QuizService } from "@/services/QuizService";
import { getSessionMember } from "@/lib/community/member";
import { buildMemberLoginUrlForPath } from "@/lib/ssoSession";
import { formatFullDateTime } from "@/lib/format";
import shared from "@/components/shared.module.css";
import styles from "./communaute.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Communauté des supporters — Olympique de Béja",
};

export default async function CommunautePage() {
  const sessionMember = await getSessionMember();
  const userId = sessionMember?.session.id ?? null;

  const [posts, polls, quizzes, loginUrl] = await Promise.all([
    new CommunityFeedService().listPosts(userId),
    new PollService().listOpenPolls(userId),
    new QuizService().listOpenQuizzes(userId),
    buildMemberLoginUrlForPath("/communaute"),
  ]);

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            Communauté des supporters
          </h1>
          <p className={styles.subtitle}>La tribune numérique des supporters de l&apos;Olympique de Béja.</p>

          <div className={styles.quickLinks}>
            <a href="/pronostics">🔥 Pronostics</a>
            <a href="/classement-supporters">🏆 Classement des supporters</a>
            <a href="/badges">🎖️ Badges</a>
            <a href="/tribune">📣 Tribune des supporters</a>
            <a href="/hall-of-fame">👑 Hall of Fame</a>
            <a href="/statistiques">📊 Statistiques</a>
            <a href="/newsletter">📰 OB News</a>
            <a href="/recompenses">🎁 OB Fan Rewards</a>
            <a href="/espace-membre">Mon espace OB</a>
          </div>

          {sessionMember ? (
            sessionMember.member.isBlocked ? (
              <p className={styles.blocked}>Votre compte a été suspendu de la communauté.</p>
            ) : (
              <PostComposer />
            )
          ) : (
            <p className={styles.loginPrompt}>
              <a href={loginUrl}>Connectez-vous</a> pour publier, réagir, commenter et voter.
            </p>
          )}

          {polls.length > 0 && (
            <div className={styles.pollsSection}>
              <h2 className={shared.sectionSubtitle}>Sondages en cours</h2>
              {polls.map((poll) => (
                <PollCard
                  key={poll.id}
                  pollId={poll.id}
                  type={poll.type}
                  question={poll.question}
                  options={poll.options}
                  totalVotes={poll.totalVotes}
                  myVoteOptionId={poll.myVoteOptionId}
                  loggedIn={!!sessionMember}
                />
              ))}
            </div>
          )}

          {quizzes.length > 0 && (
            <div className={styles.pollsSection}>
              <h2 className={shared.sectionSubtitle}>Quiz OB</h2>
              {quizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quizId={quiz.id}
                  question={quiz.question}
                  options={quiz.options}
                  myAnswer={quiz.myAnswer}
                  loggedIn={!!sessionMember}
                />
              ))}
            </div>
          )}

          <h2 className={shared.sectionSubtitle}>Fil des supporters</h2>
          {posts.length === 0 ? (
            <p className={shared.empty}>Aucune publication pour le moment.</p>
          ) : (
            <div className={styles.feed}>
              {posts.map((post) => (
                <div key={post.id} className={`${shared.card} ${styles.post}`}>
                  <div className={styles.postHeader}>
                    <strong>{post.authorName}</strong>
                    <span className={styles.date}>{formatFullDateTime(post.createdAt)}</span>
                    <ReportButton targetType="POST" targetId={post.id} loggedIn={!!sessionMember} />
                  </div>
                  <p className={styles.body}>{post.body}</p>
                  <ReactionBar
                    targetType="POST"
                    targetId={String(post.id)}
                    initialReactions={post.reactions}
                    loggedIn={!!sessionMember}
                  />
                  <CommentSection
                    targetType="POST"
                    targetId={String(post.id)}
                    commentCount={post.commentCount}
                    loggedIn={!!sessionMember}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
