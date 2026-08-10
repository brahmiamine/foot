/**
 * Catalogue des permissions applicatives de teamManager. Chaque rôle
 * (`cms_roles.permissions`) stocke un sous-ensemble de ces clés (JSON).
 * Le compte club `User.role = 'ADMIN'` (président / super-admin du club)
 * n'est jamais soumis à ce catalogue : il a toujours accès complet et gère
 * les rôles/comptes de son club (voir lib/access.ts).
 */
export interface PermissionDef {
  key: string;
  label: string;
}

export interface PermissionModule {
  key: string;
  label: string;
  permissions: PermissionDef[];
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    key: "players",
    label: "Joueurs",
    permissions: [
      { key: "players.view", label: "Voir les joueurs" },
      { key: "players.create", label: "Ajouter un joueur" },
      { key: "players.edit", label: "Modifier un joueur" },
      { key: "players.delete", label: "Supprimer un joueur" },
    ],
  },
  {
    key: "staff",
    label: "Staff",
    permissions: [
      { key: "staff.view", label: "Voir le staff" },
      { key: "staff.create", label: "Ajouter un membre du staff" },
      { key: "staff.edit", label: "Modifier un membre du staff" },
      { key: "staff.delete", label: "Supprimer un membre du staff" },
    ],
  },
  {
    key: "teamMembers",
    label: "Membres de l'équipe",
    permissions: [
      { key: "teamMembers.view", label: "Voir les membres" },
      { key: "teamMembers.manage", label: "Gérer les membres" },
    ],
  },
  {
    key: "matches",
    label: "Matchs officiels",
    permissions: [{ key: "matches.view", label: "Voir les matchs officiels" }],
  },
  {
    key: "friendlyMatches",
    label: "Matchs amicaux",
    permissions: [
      { key: "friendlyMatches.view", label: "Voir les matchs amicaux" },
      { key: "friendlyMatches.create", label: "Créer un match amical" },
      { key: "friendlyMatches.edit", label: "Modifier un match amical" },
      { key: "friendlyMatches.delete", label: "Supprimer un match amical" },
    ],
  },
  {
    key: "trainings",
    label: "Entraînements",
    permissions: [
      { key: "trainings.view", label: "Voir les entraînements" },
      { key: "trainings.create", label: "Créer un entraînement" },
      { key: "trainings.edit", label: "Modifier un entraînement" },
      { key: "trainings.delete", label: "Supprimer un entraînement" },
      { key: "trainings.invite", label: "Inviter des joueurs" },
    ],
  },
  {
    key: "lineups",
    label: "Compositions & formations",
    permissions: [
      { key: "lineups.view", label: "Voir la composition" },
      { key: "lineups.edit", label: "Modifier la composition / formation" },
    ],
  },
  {
    key: "convocations",
    label: "Convocations",
    permissions: [
      { key: "convocations.view", label: "Voir les convocations" },
      { key: "convocations.send", label: "Envoyer des convocations" },
      { key: "convocations.respond", label: "Enregistrer une réponse" },
    ],
  },
  {
    key: "stadiums",
    label: "Stades",
    permissions: [
      { key: "stadiums.view", label: "Voir les stades" },
      { key: "stadiums.create", label: "Ajouter un stade" },
      { key: "stadiums.edit", label: "Modifier un stade" },
      { key: "stadiums.delete", label: "Supprimer un stade" },
    ],
  },
  {
    key: "news",
    label: "Actualités",
    permissions: [
      { key: "news.view", label: "Voir les actualités" },
      { key: "news.create", label: "Créer une actualité" },
      { key: "news.edit", label: "Modifier une actualité" },
      { key: "news.delete", label: "Supprimer une actualité" },
      { key: "news.publish", label: "Publier / dépublier" },
    ],
  },
  {
    key: "media",
    label: "Médias & galeries",
    permissions: [
      { key: "media.view", label: "Voir les médias" },
      { key: "media.manage", label: "Gérer les médias / galeries" },
    ],
  },
  {
    key: "shop",
    label: "Boutique",
    permissions: [
      { key: "shop.view", label: "Voir la boutique" },
      { key: "shop.manage", label: "Gérer produits / catégories" },
    ],
  },
  {
    key: "sponsors",
    label: "Sponsors",
    permissions: [
      { key: "sponsors.view", label: "Voir les sponsors" },
      { key: "sponsors.manage", label: "Gérer les sponsors" },
    ],
  },
  {
    key: "notifications",
    label: "Notifications",
    permissions: [
      { key: "notifications.view", label: "Voir les notifications" },
      { key: "notifications.send", label: "Envoyer des notifications" },
    ],
  },
  {
    key: "stats",
    label: "Statistiques",
    permissions: [
      { key: "stats.view", label: "Voir les statistiques" },
      { key: "stats.manage", label: "Saisir / importer des statistiques joueurs" },
    ],
  },
  {
    key: "discipline",
    label: "Discipline (cartons, amendes, suspensions)",
    permissions: [
      { key: "discipline.view", label: "Voir le module discipline" },
      { key: "discipline.manage", label: "Gérer le module discipline" },
    ],
  },
  {
    key: "users",
    label: "Utilisateurs",
    permissions: [
      { key: "users.view", label: "Voir les comptes du club" },
      { key: "users.manage", label: "Créer / modifier les comptes du club" },
    ],
  },
  {
    key: "roles",
    label: "Rôles & permissions",
    permissions: [{ key: "roles.manage", label: "Gérer les rôles & permissions" }],
  },
  {
    key: "medical",
    label: "Blessures & santé (accès restreint)",
    permissions: [
      { key: "medical.view", label: "Voir les dossiers de blessure" },
      { key: "medical.manage", label: "Gérer les dossiers de blessure" },
    ],
  },
  {
    key: "trips",
    label: "Déplacements",
    permissions: [
      { key: "trips.view", label: "Voir les déplacements" },
      { key: "trips.manage", label: "Organiser les déplacements" },
    ],
  },
  {
    key: "tactics",
    label: "Planches tactiques",
    permissions: [
      { key: "tactics.view", label: "Voir les planches tactiques publiques" },
      { key: "tactics.manage", label: "Créer / gérer ses propres planches tactiques" },
    ],
  },
  {
    key: "club",
    label: "Le club (présentation, histoire, palmarès)",
    permissions: [
      { key: "club.view", label: "Voir le contenu du club" },
      { key: "club.manage", label: "Gérer présentation, histoire, palmarès et figures du club" },
    ],
  },
  {
    key: "academy",
    label: "Formation / Académie",
    permissions: [
      { key: "academy.view", label: "Voir la formation" },
      { key: "academy.manage", label: "Gérer catégories et contenu de la formation" },
    ],
  },
  {
    key: "playerApplications",
    label: "Candidatures académie",
    permissions: [
      { key: "playerApplications.view", label: "Voir les candidatures d'inscription" },
      { key: "playerApplications.manage", label: "Traiter les candidatures d'inscription" },
    ],
  },
  {
    key: "recruitment",
    label: "Recrutement",
    permissions: [
      { key: "recruitment.view", label: "Voir le recrutement et les candidatures" },
      { key: "recruitment.manage", label: "Gérer les postes recherchés et les candidatures" },
    ],
  },
  {
    key: "announcements",
    label: "Communiqués officiels",
    permissions: [
      { key: "announcements.view", label: "Voir les communiqués" },
      { key: "announcements.manage", label: "Créer / publier des communiqués" },
    ],
  },
  {
    key: "clubSettings",
    label: "Réseaux sociaux & contact",
    permissions: [{ key: "clubSettings.manage", label: "Gérer les réseaux sociaux et les coordonnées du club" }],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_MODULES.flatMap((m) => m.permissions.map((p) => p.key));

export function isValidPermissionKey(key: string): boolean {
  return ALL_PERMISSION_KEYS.includes(key);
}

/** Permissions par défaut suggérées pour les rôles standards créés automatiquement. */
export const DEFAULT_ROLE_PRESETS: Array<{ name: string; description: string; isGlobal: boolean; permissions: string[] }> = [
  {
    name: "Secrétaire Général",
    description: "Accès global à toutes les catégories : consultation et gestion administrative complète (hors dossiers médicaux, accès strictement réservé).",
    isGlobal: true,
    permissions: ALL_PERMISSION_KEYS.filter((k) => k !== "roles.manage" && k !== "users.manage" && !k.startsWith("medical.")),
  },
  {
    name: "Coach",
    description: "Gère l'effectif, les entraînements, les matchs amicaux et la composition de sa catégorie.",
    isGlobal: false,
    permissions: [
      "players.view",
      "players.edit",
      "staff.view",
      "matches.view",
      "friendlyMatches.view",
      "friendlyMatches.create",
      "friendlyMatches.edit",
      "trainings.view",
      "trainings.create",
      "trainings.edit",
      "trainings.invite",
      "lineups.view",
      "lineups.edit",
      "convocations.view",
      "convocations.send",
      "convocations.respond",
      "stadiums.view",
      "stats.view",
      "stats.manage",
      "tactics.view",
      "tactics.manage",
      "notifications.view",
      "notifications.send",
      "trips.view",
      "trips.manage",
    ],
  },
  {
    name: "Adjoint",
    description: "Assiste le coach : consultation et proposition de composition, sans validation finale.",
    isGlobal: false,
    permissions: [
      "players.view",
      "staff.view",
      "matches.view",
      "friendlyMatches.view",
      "trainings.view",
      "trainings.invite",
      "lineups.view",
      "convocations.view",
      "stats.view",
    ],
  },
  {
    name: "Staff médical",
    description: "Consultation de l'effectif et des convocations de sa catégorie, gestion des dossiers de blessure.",
    isGlobal: false,
    permissions: ["players.view", "staff.view", "matches.view", "convocations.view", "trainings.view", "medical.view", "medical.manage"],
  },
];
