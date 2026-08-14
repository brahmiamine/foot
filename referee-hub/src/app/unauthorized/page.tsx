import Link from "next/link";
import { FiShield } from "react-icons/fi";

export default function UnauthorizedPage() {
  return (
    <main className="standalone-page">
      <div className="standalone-card">
        <span className="standalone-icon"><FiShield /></span>
        <h1>Accès réservé aux officiels</h1>
        <p>Votre compte Identity est authentifié, mais il ne possède pas un rôle REFEREE, MATCH_OFFICIAL ou REFEREE_OBSERVER.</p>
        <Link href="/api/logout" className="primary-action">Changer de compte</Link>
      </div>
    </main>
  );
}
