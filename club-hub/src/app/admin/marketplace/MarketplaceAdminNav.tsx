import Link from 'next/link';

export function MarketplaceAdminNav() {
  return <div className="d-flex flex-wrap gap-2 mb-4">
    <Link className="btn btn-outline-primary btn-sm" href="/admin/marketplace/products">Produits</Link>
    <Link className="btn btn-outline-primary btn-sm" href="/admin/marketplace/applications">Demandes vendeurs</Link>
    <Link className="btn btn-outline-primary btn-sm" href="/admin/marketplace/sellers">Vendeurs</Link>
    <Link className="btn btn-outline-primary btn-sm" href="/admin/marketplace/settings">Paramètres</Link>
  </div>;
}
