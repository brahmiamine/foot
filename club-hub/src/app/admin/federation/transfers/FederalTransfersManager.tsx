"use client";
import { useCallback,useEffect,useState } from "react";

type WindowItem={id:string;type:string;seasonId:string;opensAt:string;closesAt:string;status:string;currentlyOpen:boolean};
type TransferItem={id:string;playerId:string;fromTeamId:string;toTeamId:string;status:string;seasonId?:string|null;transferWindowId?:string|null;agentId?:string|null;representationAgreementId?:string|null};
type Data={windows:WindowItem[];transfers:TransferItem[]};

export default function FederalTransfersManager(){
  const [data,setData]=useState<Data>({windows:[],transfers:[]});
  const [error,setError]=useState("");const [saving,setSaving]=useState(false);const [creating,setCreating]=useState(false);
  const [form,setForm]=useState({playerId:"",toTeamId:"",transferType:"PERMANENT",effectiveDate:"",seasonId:"",fee:"",currency:"TND",agentId:"",representationAgreementId:"",intermediaryDeclaration:""});
  const load=useCallback(async()=>{const r=await fetch("/api/admin/federation/transfer-windows",{cache:"no-store"});const b=await r.json();if(!r.ok)throw new Error(b.error??"Erreur");setData(b)},[]);
  useEffect(()=>{const timer=window.setTimeout(()=>{load().catch(e=>setError(e.message))},0);return()=>window.clearTimeout(timer)},[load]);

  async function create(){
    if(!form.playerId||!form.toTeamId||!form.effectiveDate||!form.seasonId)return;
    setSaving(true);setError("");
    try{const r=await fetch("/api/player-transfers",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...form,fee:form.fee||null,agentId:form.agentId||null,representationAgreementId:form.representationAgreementId||null,intermediaryDeclaration:form.intermediaryDeclaration||null})});const b=await r.json();if(!r.ok)throw new Error(b.error??"Erreur");setCreating(false);setForm({playerId:"",toTeamId:"",transferType:"PERMANENT",effectiveDate:"",seasonId:"",fee:"",currency:"TND",agentId:"",representationAgreementId:"",intermediaryDeclaration:""});await load();}
    catch(e){setError(e instanceof Error?e.message:"Erreur")}finally{setSaving(false)}
  }

  return <div className="container-fluid px-0 d-flex flex-column gap-3">
    <div className="d-flex justify-content-between align-items-start"><div><h1 className="h4 mb-1">Transferts fédéraux</h1><p className="text-muted mb-0">Fenêtres, demandes et intermédiaires déclarés à la fédération.</p></div><button className="btn btn-primary" onClick={()=>setCreating(v=>!v)}>Nouvelle demande</button></div>
    {error&&<div className="alert alert-danger" onClick={()=>setError("")}>{error}</div>}
    {creating&&<div className="card border-primary"><div className="card-header"><strong>Nouvelle demande de transfert</strong></div><div className="card-body row g-3">
      <div className="col-md-4"><label className="form-label">ID joueur</label><input className="form-control" value={form.playerId} onChange={e=>setForm({...form,playerId:e.target.value})}/></div>
      <div className="col-md-4"><label className="form-label">Club destination</label><input className="form-control" value={form.toTeamId} onChange={e=>setForm({...form,toTeamId:e.target.value})}/></div>
      <div className="col-md-4"><label className="form-label">Saison</label><input className="form-control" value={form.seasonId} onChange={e=>setForm({...form,seasonId:e.target.value})}/></div>
      <div className="col-md-4"><label className="form-label">Type</label><select className="form-select" value={form.transferType} onChange={e=>setForm({...form,transferType:e.target.value})}><option>PERMANENT</option><option>LOAN</option><option>LOAN_RETURN</option><option>FREE_TRANSFER</option></select></div>
      <div className="col-md-4"><label className="form-label">Date effective</label><input type="date" className="form-control" value={form.effectiveDate} onChange={e=>setForm({...form,effectiveDate:e.target.value})}/></div>
      <div className="col-md-2"><label className="form-label">Montant</label><input type="number" min="0" step="0.001" className="form-control" value={form.fee} onChange={e=>setForm({...form,fee:e.target.value})}/></div>
      <div className="col-md-2"><label className="form-label">Devise</label><input className="form-control" value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}/></div>
      <div className="col-md-6"><label className="form-label">Agent fédéral (optionnel)</label><input className="form-control" placeholder="agentId" value={form.agentId} onChange={e=>setForm({...form,agentId:e.target.value})}/><div className="form-text">Si un agent est déclaré, un mandat actif est obligatoire.</div></div>
      <div className="col-md-6"><label className="form-label">Mandat de représentation</label><input className="form-control" placeholder="representationAgreementId" value={form.representationAgreementId} onChange={e=>setForm({...form,representationAgreementId:e.target.value})}/></div>
      <div className="col-12"><label className="form-label">Déclaration intermédiaire</label><textarea className="form-control" rows={2} value={form.intermediaryDeclaration} onChange={e=>setForm({...form,intermediaryDeclaration:e.target.value})}/></div>
      <div className="col-12 d-flex gap-2"><button disabled={saving||!form.playerId||!form.toTeamId||!form.effectiveDate||!form.seasonId} className="btn btn-primary" onClick={()=>void create()}>Soumettre</button><button className="btn btn-outline-secondary" onClick={()=>setCreating(false)}>Annuler</button></div>
    </div></div>}
    <div className="card border-0 shadow-sm"><div className="card-header">Fenêtres applicables</div><div className="table-responsive"><table className="table mb-0"><thead><tr><th>Type</th><th>Saison</th><th>Période</th><th>État</th></tr></thead><tbody>{data.windows.map(w=><tr key={w.id}><td>{w.type}</td><td>{w.seasonId}</td><td>{new Date(w.opensAt).toLocaleString()} — {new Date(w.closesAt).toLocaleString()}</td><td><span className={`badge ${w.currentlyOpen?"bg-success":"bg-secondary"}`}>{w.currentlyOpen?"OUVERTE":w.status}</span></td></tr>)}</tbody></table></div></div>
    <div className="card border-0 shadow-sm"><div className="card-header">Historique des demandes</div><div className="table-responsive"><table className="table mb-0"><thead><tr><th>Joueur</th><th>Saison</th><th>Trajet</th><th>Agent</th><th>Statut</th></tr></thead><tbody>{data.transfers.map(t=><tr key={t.id}><td>{t.playerId}</td><td>{t.seasonId??"—"}</td><td>{t.fromTeamId} → {t.toTeamId}</td><td>{t.agentId?<><div>{t.agentId}</div><small className="text-muted">{t.representationAgreementId}</small></>:"—"}</td><td>{t.status}</td></tr>)}</tbody></table></div></div>
  </div>
}
