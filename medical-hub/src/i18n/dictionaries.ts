import type { Locale } from "./config";

const fr = {
  "app.name": "Espace Médical",
  "app.titleWithClub": "Espace Médical — {club}",
  "common.language.label": "Langue",
  "common.menu.open": "Ouvrir le menu",
  "common.notifications": "Notifications",
  "common.logout": "Déconnexion",
  "common.viewAll": "Tout voir",
  "role.admin": "Administrateur du club",
  "role.staff": "Membre du staff",
  "nav.dashboard": "Tableau de bord",
  "nav.unavailable": "Joueurs indisponibles",
  "nav.injuries": "Blessures en cours",
  "nav.alerts": "Alertes",
  "nav.availability": "Disponibilités",
  "nav.documents": "Documents",
  "nav.history": "Historique",
  "nav.license": "Ma licence",
  "nav.notifications": "Notifications",
  "dashboard.title": "Tableau de bord médical",
  "dashboard.stats.roster": "Effectif",
  "dashboard.stats.available": "Disponibles",
  "dashboard.stats.ongoing": "Blessures en cours",
  "dashboard.stats.recovering": "En récupération",
  "dashboard.alerts.title": "Alertes",
  "dashboard.alerts.empty": "Aucune alerte.",
  "dashboard.alerts.overdue": "Retour dépassé ({days}j)",
  "dashboard.alerts.upcoming": "Retour dans {days}j",
  "dashboard.unavailable.title": "Joueurs indisponibles",
  "dashboard.unavailable.empty": "Tout l'effectif est disponible.",
  "dashboard.unavailable.expectedReturn": "Retour estimé : {date}",
} as const;

export type TranslationKey = keyof typeof fr;

const ar = {
  "app.name": "الفضاء الطبي",
  "app.titleWithClub": "الفضاء الطبي — {club}",
  "common.language.label": "اللغة",
  "common.menu.open": "فتح القائمة",
  "common.notifications": "الإشعارات",
  "common.logout": "تسجيل الخروج",
  "common.viewAll": "عرض الكل",
  "role.admin": "مسؤول النادي",
  "role.staff": "عضو الإطار",
  "nav.dashboard": "لوحة القيادة",
  "nav.unavailable": "اللاعبون غير الجاهزين",
  "nav.injuries": "الإصابات الحالية",
  "nav.alerts": "التنبيهات",
  "nav.availability": "الجاهزية",
  "nav.documents": "الوثائق",
  "nav.history": "السجل",
  "nav.license": "إجازتي",
  "nav.notifications": "الإشعارات",
  "dashboard.title": "لوحة القيادة الطبية",
  "dashboard.stats.roster": "الرصيد البشري",
  "dashboard.stats.available": "جاهزون",
  "dashboard.stats.ongoing": "إصابات جارية",
  "dashboard.stats.recovering": "في طور التعافي",
  "dashboard.alerts.title": "التنبيهات",
  "dashboard.alerts.empty": "لا توجد تنبيهات.",
  "dashboard.alerts.overdue": "تجاوز موعد العودة ({days} يوم)",
  "dashboard.alerts.upcoming": "العودة خلال {days} يوم",
  "dashboard.unavailable.title": "اللاعبون غير الجاهزين",
  "dashboard.unavailable.empty": "كل اللاعبين جاهزون.",
  "dashboard.unavailable.expectedReturn": "العودة المتوقعة: {date}",
} satisfies Record<TranslationKey, string>;

export const dictionaries: Record<Locale, Record<TranslationKey, string>> = { fr, ar };
export function translate(locale: Locale, key: TranslationKey, values: Record<string, string | number> = {}) {
  return Object.entries(values).reduce((message, [name, value]) => message.replaceAll(`{${name}}`, String(value)), dictionaries[locale][key]);
}
