"use client";

import { CSSProperties, FormEvent, useState, useTransition } from "react";
import type { MemberProfile } from "@/lib/ssoProfileClient";
import { updateMemberProfileAction } from "@/app/espace-membre/actions";
import shared from "./shared.module.css";
import { useI18n } from "@/i18n/I18nProvider";

const inputStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--ob-card-border)",
  background: "var(--ob-bg)",
  color: "var(--ob-text)",
  fontSize: 14,
};

/**
 * Prénom/nom/téléphone, distincts de `name`/`email` (JWT de session) :
 * uniquement nécessaires pour payer par Paymee dans billetterie (voir
 * avancement.md, "Paymee : profil MEMBER incomplet"). Optionnels partout
 * ailleurs, donc modifiables ici sans jamais bloquer l'accès au reste de
 * l'espace membre.
 */
export function MemberProfileForm({ initialProfile }: { initialProfile: MemberProfile }) {
  const { t } = useI18n();
  const [firstName, setFirstName] = useState(initialProfile.firstName ?? "");
  const [lastName, setLastName] = useState(initialProfile.lastName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(initialProfile.phoneNumber ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    startTransition(async () => {
      try {
        await updateMemberProfileAction({ firstName, lastName, phoneNumber });
        setStatus(t("member.saved"));
      } catch (error) {
        console.error(error);
        setStatus(t("member.updateError"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
      <label style={{ fontSize: 13, color: "var(--ob-text-faint)" }}>
        {t("member.firstName")}
        <input
          type="text"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          style={{ ...inputStyle, display: "block", width: "100%", marginTop: 4 }}
        />
      </label>
      <label style={{ fontSize: 13, color: "var(--ob-text-faint)" }}>
        {t("member.lastName")}
        <input
          type="text"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          style={{ ...inputStyle, display: "block", width: "100%", marginTop: 4 }}
        />
      </label>
      <label style={{ fontSize: 13, color: "var(--ob-text-faint)" }}>
        {t("member.phone")}
        <input
          type="tel"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          style={{ ...inputStyle, display: "block", width: "100%", marginTop: 4 }}
        />
      </label>
      <button type="submit" className={shared.btnOutline} disabled={isPending} style={{ alignSelf: "flex-start" }}>
        {isPending ? t("member.saving") : t("member.save")}
      </button>
      {status && <p style={{ margin: 0, fontSize: 13, color: "var(--ob-text-muted)" }}>{status}</p>}
    </form>
  );
}
