import { PageChrome } from '@/components/PageChrome';
import shared from '@/components/shared.module.css';
import { getPublicMarketplaceSettings } from '@/lib/marketplaceApi';
import { getObTeam } from '@/lib/ob-team';
import { SellerApplicationForm } from './SellerApplicationForm';
export const dynamic='force-dynamic';
export default async function BecomeSellerPage(){const team=await getObTeam();let enabled=false;if(team){try{enabled=(await getPublicMarketplaceSettings(team.id)).sellerApplicationsEnabled;}catch{enabled=false;}}return <PageChrome><section className={shared.sectionPad}><div className={shared.container}><h1 className={shared.sectionTitle}>Devenir vendeur</h1><p>Proposez vos produits sur la marketplace de l’Olympique de Béja. La demande est envoyée à l’administration du club et aucun compte vendeur n’est créé avant validation lorsque l’approbation est activée.</p><SellerApplicationForm enabled={enabled}/></div></section></PageChrome>}
