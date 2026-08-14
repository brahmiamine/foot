'use client'

import { FormEvent, useEffect, useState } from 'react'

type Player = { id:string; name:string; number:number; teamName:string|null; category:string; position:string|null; status:string; isActive:boolean }
type Page = { items:Player[]; page:number; pageSize:number; total:number; totalPages:number }

export default function AdminPlayersPaginated({ isPlatform }: { isPlatform:boolean }) {
  const [q,setQ]=useState(''); const [team,setTeam]=useState(''); const [federation,setFederation]=useState('')
  const [teams,setTeams]=useState<Array<{id:string;nom:string}>>([]); const [federations,setFederations]=useState<Array<{id:string;nom:string}>>([])
  const [data,setData]=useState<Page>({items:[],page:1,pageSize:50,total:0,totalPages:0}); const [loading,setLoading]=useState(true); const [error,setError]=useState('')

  useEffect(()=>{ Promise.all([
    fetch('/api/admin/teams',{cache:'no-store'}).then(r=>r.ok?r.json():[]),
    isPlatform?fetch('/api/admin/federations',{cache:'no-store'}).then(r=>r.ok?r.json():[]):Promise.resolve([]),
  ]).then(([t,f])=>{setTeams(t);setFederations(f)}).catch(()=>setError('Référentiels indisponibles')) },[isPlatform])

  async function load(page=1) {
    setLoading(true); setError('')
    const p=new URLSearchParams({page:String(page),page_size:String(data.pageSize)})
    if(q.trim())p.set('q',q.trim()); if(team)p.set('team_id',team); if(isPlatform&&federation)p.set('federation_id',federation)
    try { const r=await fetch(`/api/admin/players?${p}`,{cache:'no-store'}); if(!r.ok)throw new Error(); setData(await r.json()) }
    catch { setError('Chargement des joueurs impossible') } finally { setLoading(false) }
  }
  useEffect(()=>{void load(1)},[]) // eslint-disable-line react-hooks/exhaustive-deps
  function submit(e:FormEvent){e.preventDefault();void load(1)}

  return <div className="d-flex flex-column gap-3">
    <div><h2>Joueurs</h2><p className="text-muted">Référentiel global paginé des joueurs.</p></div>
    {error&&<div className="alert alert-danger">{error}</div>}
    <form className="card card-body row g-2" onSubmit={submit}>
      <div className="col-md-4"><input className="form-control" value={q} onChange={e=>setQ(e.target.value)} placeholder="Nom du joueur" /></div>
      <div className="col-md-3"><select className="form-select" value={team} onChange={e=>setTeam(e.target.value)}><option value="">Tous les clubs</option>{teams.map(t=><option key={t.id} value={t.id}>{t.nom}</option>)}</select></div>
      {isPlatform&&<div className="col-md-3"><select className="form-select" value={federation} onChange={e=>setFederation(e.target.value)}><option value="">Toutes les fédérations</option>{federations.map(f=><option key={f.id} value={f.id}>{f.nom}</option>)}</select></div>}
      <div className="col-md-2"><button className="btn btn-primary w-100" disabled={loading}>Filtrer</button></div>
    </form>
    <div className="card card-body">
      <div className="d-flex justify-content-between mb-2"><span>{data.total} joueur(s)</span><span>Page {data.page}{data.totalPages?` / ${data.totalPages}`:''}</span></div>
      <div className="table-responsive"><table className="table table-hover align-middle"><thead><tr><th>Joueur</th><th>Club</th><th>Catégorie</th><th>Poste</th><th>Statut</th></tr></thead><tbody>
        {data.items.map(p=><tr key={p.id}><td>#{p.number} {p.name}</td><td>{p.teamName??'—'}</td><td>{p.category}</td><td>{p.position??'—'}</td><td>{p.status}</td></tr>)}
      </tbody></table></div>
      {!loading&&!data.items.length&&<p className="text-muted mb-0">Aucun joueur.</p>}
      <div className="d-flex justify-content-end gap-2"><button className="btn btn-outline-secondary" disabled={loading||data.page<=1} onClick={()=>void load(data.page-1)}>Précédent</button><button className="btn btn-outline-secondary" disabled={loading||data.page>=data.totalPages} onClick={()=>void load(data.page+1)}>Suivant</button></div>
    </div>
  </div>
}
