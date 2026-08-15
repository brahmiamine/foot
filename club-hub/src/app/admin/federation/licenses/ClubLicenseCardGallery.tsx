"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FederationLicenseCard } from "@/components/license/FederationLicenseCard";
import { useI18n } from "@/i18n/I18nProvider";
import type { PersonLicenseCardRecord } from "../../../../../../packages/regulatory-shared/src/licenseCard";

interface Candidate { id: string; name: string; }
interface Payload { licenses: PersonLicenseCardRecord[]; candidates: { players: Candidate[]; staff: Candidate[] }; }

export default function ClubLicenseCardGallery() {
  const { locale } = useI18n();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/federation/licenses", { cache: "no-store" });
      const data = await response.json() as Payload & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Erreur");
      setPayload(data);
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const names = useMemo(() => new Map([...(payload?.candidates.players ?? []), ...(payload?.candidates.staff ?? [])].map((person) => [person.id, person.name])), [payload]);
  const issued = (payload?.licenses ?? []).filter((license) => Boolean(license.licenseNumber));
  if (!payload && !error) return null;
  return <section className="card border-0 shadow-sm"><div className="card-body d-flex flex-column gap-3"><div><h2 className="h5 mb-1">{locale === "ar" ? "بطاقات التراخيص" : "Cartes de licence"}</h2><p className="text-muted mb-0">{locale === "ar" ? "معاينة البطاقات الرقمية الصادرة من الجامعة." : "Aperçu des cartes numériques réellement délivrées par la fédération."}</p></div>{error ? <div className="alert alert-danger mb-0">{error}</div> : issued.length === 0 ? <p className="text-muted mb-0">{locale === "ar" ? "لا توجد بطاقة صادرة بعد." : "Aucune carte n’a encore été délivrée."}</p> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,390px),1fr))", gap: 20, alignItems: "start" }}>{issued.map((license) => <FederationLicenseCard key={license.id} license={license} holderName={names.get(license.personReferenceId) ?? license.personReferenceId} locale={locale} />)}</div>}</div></section>;
}
