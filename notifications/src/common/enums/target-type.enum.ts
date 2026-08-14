/**
 * Types de cible pour une notification broadcast (voir RecipientResolverService).
 * USER : destinataire explicite (userId ou userIds).
 * TEAM : tous les membres d'un club (teamId).
 * ROLE : tous les utilisateurs d'un rôle donné, éventuellement restreint à un club.
 * CATEGORY : tous les utilisateurs rattachés à une catégorie d'âge, dans un club.
 * SELLER : tous les vendeurs (marketplace, futur).
 * MEMBERS : tous les comptes MEMBER (espace supporter), éventuellement restreint à un club.
 */
export enum NotificationTargetType {
  USER = 'USER',
  TEAM = 'TEAM',
  ROLE = 'ROLE',
  CATEGORY = 'CATEGORY',
  SELLER = 'SELLER',
  MEMBERS = 'MEMBERS',
}
