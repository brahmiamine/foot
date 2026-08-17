import { ActivationForm } from './ActivationForm';
export default async function ActivatePage({searchParams}:{searchParams:Promise<{token?:string}>}){const{token}=await searchParams;if(!token)return <div><h2>Lien invalide</h2><p>Le jeton d’activation est absent.</p></div>;return <ActivationForm token={token}/>;}
