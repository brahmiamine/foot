"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { supporterCommunityAdminT } from "@/i18n/supporterCommunity";
import type {
  AdminCommunityPoll,
  AdminSupporterGroup,
  PendingCommunityComment,
  PendingCommunityPost,
} from "@/services/SupporterCommunityAdminService";
import {
  closeCommunityPollAction,
  createCommunityPollAction,
  createSupporterGroupAction,
  createSupporterGroupEventAction,
  moderateCommunityCommentAction,
  moderateCommunityPostAction,
  publishCommunityClubPostAction,
} from "./actions";

interface Props {
  pendingPosts: PendingCommunityPost[];
  pendingComments: PendingCommunityComment[];
  polls: AdminCommunityPoll[];
  groups: AdminSupporterGroup[];
}

type ActionResult = { success: true } | { success: false; error: string };

export function SupporterCommunityManagement({ pendingPosts, pendingComments, polls, groups }: Props) {
  const { locale } = useI18n();
  const t = (key: Parameters<typeof supporterCommunityAdminT>[1], values?: Record<string, string | number>) =>
    supporterCommunityAdminT(locale, key, values);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "success" | "danger"; text: string } | null>(null);

  const run = (operation: () => Promise<ActionResult>) => {
    startTransition(async () => {
      setMessage(null);
      const result = await operation();
      if (result.success) {
        setMessage({ kind: "success", text: t("success") });
        router.refresh();
      } else {
        setMessage({ kind: "danger", text: result.error || t("error") });
      }
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>, action: (formData: FormData) => Promise<ActionResult>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    run(async () => {
      const result = await action(formData);
      if (result.success) form.reset();
      return result;
    });
  };

  return (
    <div className="container-fluid py-3">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h3 mb-1">{t("title")}</h1>
          <p className="text-muted mb-0">{t("subtitle")}</p>
        </div>
      </div>

      {message && <div className={`alert alert-${message.kind}`} role="status">{message.text}</div>}

      <div className="row g-4">
        <section className="col-xl-6">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h5 mb-3">{t("pendingPosts")}</h2>
              {pendingPosts.length === 0 ? <p className="text-muted">{t("emptyQueue")}</p> : pendingPosts.map((post) => (
                <article className="border-top py-3" key={post.id}>
                  <div className="small text-muted mb-2"><strong>{t("author")}:</strong> {post.authorName}</div>
                  <p className="mb-2" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{post.body}</p>
                  {post.imageUrl && <a href={post.imageUrl} target="_blank" rel="noreferrer" className="small d-inline-block mb-2">{post.imageUrl}</a>}
                  <div className="d-flex gap-2">
                    <button className="btn btn-success btn-sm" disabled={isPending} onClick={() => run(() => moderateCommunityPostAction(post.id, "APPROVED"))}>{t("approve")}</button>
                    <button className="btn btn-outline-danger btn-sm" disabled={isPending} onClick={() => run(() => moderateCommunityPostAction(post.id, "REJECTED"))}>{t("reject")}</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="col-xl-6">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h5 mb-3">{t("pendingComments")}</h2>
              {pendingComments.length === 0 ? <p className="text-muted">{t("emptyQueue")}</p> : pendingComments.map((comment) => (
                <article className="border-top py-3" key={comment.id}>
                  <div className="small text-muted mb-2">
                    <strong>{t("author")}:</strong> {comment.authorName} · <strong>{t("target")}:</strong> {comment.targetType} #{comment.targetId}
                  </div>
                  <p className="mb-2" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{comment.body}</p>
                  <div className="d-flex gap-2">
                    <button className="btn btn-success btn-sm" disabled={isPending} onClick={() => run(() => moderateCommunityCommentAction(comment.id, "APPROVED"))}>{t("approve")}</button>
                    <button className="btn btn-outline-danger btn-sm" disabled={isPending} onClick={() => run(() => moderateCommunityCommentAction(comment.id, "REJECTED"))}>{t("reject")}</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="row g-4 mt-1">
        <section className="col-xl-6">
          <div className="card">
            <div className="card-body">
              <h2 className="h5 mb-3">{t("createPoll")}</h2>
              <form onSubmit={(event) => submit(event, createCommunityPollAction)}>
                <div className="mb-3"><label className="form-label" htmlFor="questionFr">{t("questionFr")}</label><input id="questionFr" name="questionFr" className="form-control" maxLength={500} required /></div>
                <div className="mb-3"><label className="form-label" htmlFor="questionAr">{t("questionAr")}</label><input id="questionAr" name="questionAr" className="form-control" dir="rtl" maxLength={500} /></div>
                <div className="mb-3"><label className="form-label" htmlFor="optionsFr">{t("optionsFr")}</label><textarea id="optionsFr" name="optionsFr" className="form-control" rows={5} required /></div>
                <div className="mb-3"><label className="form-label" htmlFor="optionsAr">{t("optionsAr")}</label><textarea id="optionsAr" name="optionsAr" className="form-control" dir="rtl" rows={5} /></div>
                <div className="mb-3"><label className="form-label" htmlFor="endsAt">{t("endsAt")}</label><input id="endsAt" name="endsAt" className="form-control" type="datetime-local" /></div>
                <button className="btn btn-primary" disabled={isPending} type="submit">{t("create")}</button>
              </form>
            </div>
          </div>
        </section>

        <section className="col-xl-6">
          <div className="card">
            <div className="card-body">
              <h2 className="h5 mb-3">{t("polls")}</h2>
              {polls.length === 0 ? <p className="text-muted">{t("emptyQueue")}</p> : (
                <div className="list-group list-group-flush">
                  {polls.map((poll) => (
                    <div className="list-group-item px-0 d-flex justify-content-between gap-3 align-items-start" key={poll.id}>
                      <div><strong>{poll.questionFr}</strong><div className="small text-muted">{poll.status} · {t("votes", { count: poll.totalVotes })}</div></div>
                      {poll.status === "OPEN" && <button className="btn btn-outline-secondary btn-sm" disabled={isPending} onClick={() => run(() => closeCommunityPollAction(poll.id))}>{t("close")}</button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="row g-4 mt-1">
        <section className="col-xl-6">
          <div className="card">
            <div className="card-body">
              <h2 className="h5 mb-3">{t("clubPost")}</h2>
              <form onSubmit={(event) => submit(event, publishCommunityClubPostAction)}>
                <div className="mb-3"><label className="form-label" htmlFor="postTitle">{t("postTitle")}</label><input id="postTitle" name="title" className="form-control" maxLength={255} /></div>
                <div className="mb-3"><label className="form-label" htmlFor="postBody">{t("postBody")}</label><textarea id="postBody" name="body" className="form-control" rows={5} maxLength={1500} required /></div>
                <div className="mb-3"><label className="form-label" htmlFor="visibility">{t("visibility")}</label><select id="visibility" name="visibility" className="form-select"><option value="PUBLIC">{t("public")}</option><option value="MEMBER">{t("members")}</option></select></div>
                <button className="btn btn-primary" disabled={isPending} type="submit">{t("publish")}</button>
              </form>
            </div>
          </div>
        </section>

        <section className="col-xl-6">
          <div className="card">
            <div className="card-body">
              <h2 className="h5 mb-3">{t("groups")}</h2>
              <form className="mb-4" onSubmit={(event) => submit(event, createSupporterGroupAction)}>
                <div className="mb-3"><label className="form-label" htmlFor="groupName">{t("groupName")}</label><input id="groupName" name="name" className="form-control" maxLength={160} required /></div>
                <div className="mb-3"><label className="form-label" htmlFor="groupDescription">{t("description")}</label><textarea id="groupDescription" name="description" className="form-control" maxLength={1000} /></div>
                <button className="btn btn-primary" disabled={isPending} type="submit">{t("addGroup")}</button>
              </form>

              <ul className="list-group list-group-flush mb-4">
                {groups.map((group) => <li className="list-group-item px-0" key={group.id}><strong>{group.name}</strong><div className="small text-muted">{t("memberCount", { count: group.members })}</div></li>)}
              </ul>

              <h3 className="h6">{t("groupEvent")}</h3>
              <form onSubmit={(event) => submit(event, createSupporterGroupEventAction)}>
                <div className="mb-3"><label className="form-label" htmlFor="groupId">{t("selectGroup")}</label><select id="groupId" name="groupId" className="form-select" required><option value="">—</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></div>
                <div className="mb-3"><label className="form-label" htmlFor="eventTitle">{t("eventTitle")}</label><input id="eventTitle" name="title" className="form-control" maxLength={255} required /></div>
                <div className="mb-3"><label className="form-label" htmlFor="eventDescription">{t("description")}</label><textarea id="eventDescription" name="description" className="form-control" maxLength={1000} /></div>
                <div className="mb-3"><label className="form-label" htmlFor="location">{t("location")}</label><input id="location" name="location" className="form-control" maxLength={255} /></div>
                <div className="mb-3"><label className="form-label" htmlFor="startsAt">{t("startsAt")}</label><input id="startsAt" name="startsAt" className="form-control" type="datetime-local" required /></div>
                <button className="btn btn-primary" disabled={isPending || groups.length === 0} type="submit">{t("addEvent")}</button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
