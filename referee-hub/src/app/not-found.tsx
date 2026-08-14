import Link from "next/link";

export default function NotFound() {
  return <div className="empty-state"><h2>Désignation introuvable</h2><p>Cette désignation n’existe pas ou n’appartient pas à votre compte.</p><Link href="/assignments" className="primary-action">Mes désignations</Link></div>;
}
