import { FiExternalLink, FiMail, FiPhone, FiShield, FiUser } from "react-icons/fi";
import { PageHeading } from "@/components/PageHeading";
import { getLocale } from "@/lib/i18n";
import { requireRequestSession } from "@/lib/requestSession";
import { ProfileService } from "@/services/ProfileService";

export default async function ProfilePage() {
  const [session, locale] = await Promise.all([requireRequestSession(), getLocale()]);
  const profile = await new ProfileService().getMine(session.id);
  if (!profile) return null;
  const { user, referee } = profile;
  const identityUrl = (process.env.SSO_URL || "http://localhost:3004").replace(/\/$/, "");

  return (
    <>
      <PageHeading title={locale === "ar" ? "ملفي الشخصي" : "Mon profil"} description={locale === "ar" ? "تتم إدارة هويتك ومعلومات الاتصال الخاصة بك مركزياً بواسطة Identity." : "Votre identité et vos coordonnées sont gérées de manière centralisée par Identity."} />
      <div className="profile-grid">
        <section className="profile-summary panel-card">
          <div className="profile-avatar" style={referee?.photo_url ? { backgroundImage: `url(${referee.photo_url})` } : undefined}>{!referee?.photo_url && user.name.slice(0, 2).toUpperCase()}</div>
          <h2>{user.name}</h2>
          <span className="role-pill role-center_referee">{referee?.categorie || (locale === "ar" ? "حكم رسمي" : "Officiel de match")}</span>
          {referee?.grade && <p>{referee.grade}</p>}
          <div className="identity-source"><FiShield />Identity · {locale === "ar" ? "مصدر الهوية" : "source d'identité"}</div>
        </section>
        <section className="panel-card profile-details">
          <div className="panel-title"><FiUser /><div><span>{locale === "ar" ? "معلومات الحساب" : "Informations du compte"}</span><h2>{locale === "ar" ? "بياناتي" : "Mes informations"}</h2></div></div>
          <dl>
            <div><dt><FiUser />{locale === "ar" ? "الاسم الكامل" : "Nom complet"}</dt><dd>{user.name}</dd></div>
            <div><dt><FiMail />{locale === "ar" ? "البريد الإلكتروني" : "E-mail"}</dt><dd>{user.email}</dd></div>
            <div><dt><FiPhone />{locale === "ar" ? "الهاتف" : "Téléphone"}</dt><dd>{user.phoneNumber || "—"}</dd></div>
            <div><dt><FiShield />{locale === "ar" ? "الدور" : "Rôle Identity"}</dt><dd>{user.role}</dd></div>
          </dl>
          <a href={identityUrl} className="secondary-action">{locale === "ar" ? "إدارة الحساب في Identity" : "Gérer mon compte dans Identity"}<FiExternalLink /></a>
        </section>
      </div>
    </>
  );
}
