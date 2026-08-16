"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Row = Record<string, unknown>;
type Payload = {
  insurance: Row[];
  grants: Row[];
  grantApplications: Row[];
  requirements: Row[];
  submissions: Row[];
  broadcasting: Row[];
  trainingCompensation: Row[];
  solidarity: Row[];
  nationalCallups: Row[];
  canManage: boolean;
};

const empty: Payload = { insurance: [], grants: [], grantApplications: [], requirements: [], submissions: [], broadcasting: [], trainingCompensation: [], solidarity: [], nationalCallups: [], canManage: false };
const value = (row: Row, ...keys: string[]) => keys.map((key) => row[key]).find((item) => item !== null && item !== undefined && item !== "") ?? "—";

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/admin/federation/federal-operations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Action impossible");
  return payload;
}

export default function ClubFederalOperationsManager() {
  const [data, setData] = useState<Payload>(empty);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/admin/federation/federal-operations", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Chargement impossible");
      setData(body);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Chargement impossible"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submitForm = async (event: FormEvent<HTMLFormElement>, action: string) => {
    event.preventDefault(); setNotice(null); setError(null);
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = { action };
    for (const [key, item] of form.entries()) body[key] = item;
    try { await post(body); event.currentTarget.reset(); setNotice("Dossier enregistré."); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Action impossible"); }
  };

  const submitExisting = async (action: string, id: unknown) => {
    try { await post({ action, id: String(id ?? "") }); setNotice("Dossier soumis à la fédération."); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Action impossible"); }
  };

  if (loading) return <div className="container-fluid py-4"><p>Chargement des opérations fédérales…</p></div>;

  return (
    <div className="container-fluid py-4">
      <div className="mb-4"><h1 className="h3 mb-1">Opérations fédérales</h1><p className="text-muted mb-0">Le club prépare, dépose et suit. Seule la fédération peut valider, rejeter ou décider.</p></div>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}

      {data.canManage ? <div className="row g-3 mb-4">
        <div className="col-xl-4"><div className="card h-100"><div className="card-body"><h2 className="h5">Nouvelle assurance</h2><form onSubmit={(event) => void submitForm(event, "insurance.create")} className="vstack gap-2"><input className="form-control" name="seasonId" placeholder="ID saison" required/><input className="form-control" name="policyNumber" placeholder="N° police" required/><input className="form-control" name="provider" placeholder="Assureur" required/><select className="form-select" name="coverageType" defaultValue="CLUB"><option>CLUB</option><option>PLAYERS</option><option>STAFF</option><option>MATCHDAY</option><option>OTHER</option></select><input className="form-control" type="date" name="startsAt" required/><input className="form-control" type="date" name="expiresAt" required/><input className="form-control" name="documentUrl" placeholder="https://… ou /document"/><button className="btn btn-primary" type="submit">Créer le brouillon</button></form></div></div></div>
        <div className="col-xl-4"><div className="card h-100"><div className="card-body"><h2 className="h5">Demande de subvention</h2><form onSubmit={(event) => void submitForm(event, "grant.create")} className="vstack gap-2"><select className="form-select" name="grantId" required defaultValue=""><option value="" disabled>Programme ouvert</option>{data.grants.map((grant) => <option key={String(grant.id)} value={String(grant.id)}>{String(value(grant, "name", "code"))}</option>)}</select><input className="form-control" type="number" min="0.001" step="0.001" name="requestedAmount" placeholder="Montant demandé" required/><textarea className="form-control" name="purpose" placeholder="Objet de la demande" required/><button className="btn btn-primary" type="submit">Créer le brouillon</button></form></div></div></div>
        <div className="col-xl-4"><div className="card h-100"><div className="card-body"><h2 className="h5">Document réglementaire</h2><form onSubmit={(event) => void submitForm(event, "document.submit")} className="vstack gap-2"><select className="form-select" name="requirementId" required defaultValue=""><option value="" disabled>Exigence</option>{data.requirements.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(value(item, "name", "code"))}</option>)}</select><input className="form-control" name="fileUrl" placeholder="https://… ou /document" required/><input className="form-control" type="date" name="issuedAt"/><input className="form-control" type="date" name="expiresAt"/><button className="btn btn-primary" type="submit">Déposer une version</button></form></div></div></div>
      </div> : null}

      <div className="row g-3">
        <Section title="Assurances" rows={data.insurance} actionLabel="Soumettre" onAction={(row) => row.status === "DRAFT" ? void submitExisting("insurance.submit", row.id) : undefined}/>
        <Section title="Demandes de subvention" rows={data.grantApplications} actionLabel="Soumettre" onAction={(row) => row.status === "DRAFT" ? void submitExisting("grant.submit", row.id) : undefined}/>
        <Section title="Documents déposés" rows={data.submissions}/>
        <Section title="Droits média" rows={data.broadcasting}/>
        <Section title="Indemnités de formation" rows={data.trainingCompensation}/>
        <Section title="Solidarité" rows={data.solidarity}/>
        <Section title="Convocations nationales" rows={data.nationalCallups}/>
      </div>
    </div>
  );
}

function Section({ title, rows, actionLabel, onAction }: { title: string; rows: Row[]; actionLabel?: string; onAction?: (row: Row) => void }) {
  return <div className="col-12"><div className="card"><div className="card-body"><h2 className="h5">{title}</h2>{rows.length === 0 ? <p className="text-muted mb-0">Aucun dossier.</p> : <div className="table-responsive"><table className="table align-middle"><thead><tr><th>Référence</th><th>Statut</th><th>Montant / période</th>{onAction ? <th/> : null}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(value(row, "id")) + index}><td>{String(value(row, "policy_number", "reference_number", "grant_name", "requirement_name", "national_team_name", "id"))}</td><td>{String(value(row, "status", "case_status", "contribution_status"))}</td><td>{String(value(row, "total_amount", "amount", "requested_amount", "expires_at", "event_starts_at"))}</td>{onAction ? <td className="text-end">{actionLabel && row.status === "DRAFT" ? <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => onAction(row)}>{actionLabel}</button> : null}</td> : null}</tr>)}</tbody></table></div>}</div></div></div>;
}
