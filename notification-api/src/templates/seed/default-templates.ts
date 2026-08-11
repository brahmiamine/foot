import { NotificationChannelType } from '../../common/enums/channel.enum';
import { NotificationLocale } from '../../common/enums/locale.enum';

export interface DefaultTemplateSeed {
  type: string;
  channel: NotificationChannelType;
  locale: NotificationLocale;
  subject?: string;
  title?: string;
  body: string;
}

/**
 * Templates couvrant les cas d'usage V1 (§35) en FR/EN, canal EMAIL. Seedés
 * une fois au démarrage si absents (voir TemplatesService.seedDefaults) —
 * jamais écrasés ensuite, pour laisser un administrateur les personnaliser
 * en base. L'arabe n'est pas préseedé : à fournir via l'admin quand le
 * besoin RTL sera prioritaire (voir README, §33).
 */
export const DEFAULT_TEMPLATES: DefaultTemplateSeed[] = [
  // --- TeamManager ---
  {
    type: 'PLAYER_CONVOCATED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Convocation - {{matchName}}',
    body: 'Bonjour {{firstName}},\n\nVous êtes convoqué(e) pour {{matchName}} le {{matchDate}}.\n\nÀ bientôt,\n{{clubName}}',
  },
  {
    type: 'PLAYER_CONVOCATED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.EN,
    subject: 'Convocation - {{matchName}}',
    body: 'Hello {{firstName}},\n\nYou have been called up for {{matchName}} on {{matchDate}}.\n\nSee you soon,\n{{clubName}}',
  },
  {
    type: 'TRAINING_CREATED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Nouvel entraînement programmé',
    body: 'Bonjour {{firstName}},\n\nUn entraînement a été programmé le {{trainingDate}}.\n\n{{clubName}}',
  },
  {
    type: 'TRAINING_UPDATED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Entraînement modifié',
    body: "Bonjour {{firstName}},\n\nL'entraînement du {{trainingDate}} a été modifié.\n\n{{clubName}}",
  },
  {
    type: 'TRAINING_REMINDER',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Rappel entraînement',
    body: 'Bonjour {{firstName}},\n\nRappel : entraînement le {{trainingDate}}.\n\n{{clubName}}',
  },
  {
    type: 'MATCH_REMINDER',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Rappel match - {{matchName}}',
    body: 'Bonjour {{firstName}},\n\nRappel : {{matchName}} le {{matchDate}}.\n\n{{clubName}}',
  },
  {
    type: 'TRIP_CREATED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Nouveau déplacement',
    body: 'Bonjour {{firstName}},\n\nUn nouveau déplacement a été créé : {{tripName}}.\n\n{{clubName}}',
  },
  {
    type: 'TRIP_UPDATED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Déplacement modifié',
    body: 'Bonjour {{firstName}},\n\nLe déplacement {{tripName}} a été modifié.\n\n{{clubName}}',
  },
  {
    type: 'DISCIPLINARY_ACTION',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Sanction disciplinaire',
    body: 'Bonjour {{firstName}},\n\nUne sanction disciplinaire vous concerne. Contactez le club pour plus de détails.\n\n{{clubName}}',
  },
  // --- Payment ---
  {
    type: 'PAYMENT_CREATED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Paiement en cours',
    body: 'Bonjour {{firstName}},\n\nVotre paiement de {{amount}} est en cours de traitement.\n\n{{clubName}}',
  },
  {
    type: 'PAYMENT_SUCCEEDED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Paiement confirmé',
    body: 'Bonjour {{firstName}},\n\nVotre paiement de {{amount}} a été confirmé. Merci !\n\n{{clubName}}',
  },
  {
    type: 'PAYMENT_SUCCEEDED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.EN,
    subject: 'Payment confirmed',
    body: 'Hello {{firstName}},\n\nYour payment of {{amount}} has been confirmed. Thank you!\n\n{{clubName}}',
  },
  {
    type: 'PAYMENT_FAILED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Échec du paiement',
    body: 'Bonjour {{firstName}},\n\nVotre paiement de {{amount}} a échoué. Merci de réessayer.\n\n{{clubName}}',
  },
  {
    type: 'PAYMENT_REFUNDED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Remboursement effectué',
    body: 'Bonjour {{firstName}},\n\nVous avez été remboursé(e) de {{amount}}.\n\n{{clubName}}',
  },
  // --- Billetterie ---
  {
    type: 'TICKET_PURCHASED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Billet acheté',
    body: 'Bonjour {{firstName}},\n\nVotre billet {{ticketNumber}} pour {{matchName}} a bien été acheté.\n\n{{clubName}}',
  },
  {
    type: 'TICKET_ISSUED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Votre billet est disponible',
    body: 'Bonjour {{firstName}},\n\nVotre billet {{ticketNumber}} est disponible.\n\n{{clubName}}',
  },
  {
    type: 'TICKET_CANCELLED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Billet annulé',
    body: 'Bonjour {{firstName}},\n\nVotre billet {{ticketNumber}} a été annulé.\n\n{{clubName}}',
  },
  // --- Marketplace ---
  {
    type: 'ORDER_CREATED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Commande {{orderNumber}} reçue',
    body: 'Bonjour {{firstName}},\n\nVotre commande {{orderNumber}} a bien été reçue.\n\n{{clubName}}',
  },
  {
    type: 'ORDER_CONFIRMED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Commande {{orderNumber}} confirmée',
    body: 'Bonjour {{firstName}},\n\nVotre commande {{orderNumber}} est confirmée.\n\n{{clubName}}',
  },
  {
    type: 'ORDER_SHIPPED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Commande {{orderNumber}} expédiée',
    body: 'Bonjour {{firstName}},\n\nVotre commande {{orderNumber}} a été expédiée.\n\n{{clubName}}',
  },
  {
    type: 'ORDER_DELIVERED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Commande {{orderNumber}} livrée',
    body: 'Bonjour {{firstName}},\n\nVotre commande {{orderNumber}} a été livrée.\n\n{{clubName}}',
  },
  {
    type: 'RETURN_REQUESTED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Retour demandé - {{orderNumber}}',
    body: 'Bonjour {{firstName}},\n\nVotre demande de retour pour la commande {{orderNumber}} est prise en compte.\n\n{{clubName}}',
  },
  {
    type: 'PAYOUT_COMPLETED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Versement effectué',
    body: 'Bonjour {{firstName}},\n\nUn versement de {{amount}} a été effectué sur votre compte vendeur.\n\n{{clubName}}',
  },
  // --- Matchsheet ---
  {
    type: 'MATCH_SHEET_CLOSED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Feuille de match clôturée - {{matchName}}',
    body: 'Bonjour {{firstName}},\n\nLa feuille de match de {{matchName}} a été signée et clôturée. Elle ne peut plus être modifiée.\n\n{{clubName}}',
  },
  {
    type: 'MATCH_SHEET_CLOSED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.EN,
    subject: 'Match sheet closed - {{matchName}}',
    body: 'Hello {{firstName}},\n\nThe match sheet for {{matchName}} has been signed and closed. It can no longer be modified.\n\n{{clubName}}',
  },
  // --- Supporter (espace membre du site vitrine club) ---
  {
    type: 'NEWS_PUBLISHED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Nouvelle actualité - {{clubName}}',
    body: "Bonjour {{firstName}},\n\nUne nouvelle actualité vient d'être publiée : {{newsTitle}}.\n\n{{clubName}}",
  },
  {
    type: 'MATCH_STARTED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Le match a commencé',
    body: 'Bonjour {{firstName}},\n\n{{matchName}} vient de commencer !\n\n{{clubName}}',
  },
  {
    type: 'MATCH_RESULT',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Résultat du match',
    body: 'Bonjour {{firstName}},\n\nRésultat de {{matchName}} : {{matchScore}}.\n\n{{clubName}}',
  },
  // --- SuperAdmin ---
  {
    type: 'MATCH_CREATED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Nouveau match programmé - {{matchName}}',
    body: 'Bonjour {{firstName}},\n\nUn nouveau match a été programmé : {{matchName}}, le {{matchDate}}.\n\n{{clubName}}',
  },
  {
    type: 'MATCH_CREATED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.EN,
    subject: 'New match scheduled - {{matchName}}',
    body: 'Hello {{firstName}},\n\nA new match has been scheduled: {{matchName}}, on {{matchDate}}.\n\n{{clubName}}',
  },
  {
    type: 'MATCH_RESCHEDULED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: "Changement d'horaire - {{matchName}}",
    body: "Bonjour {{firstName}},\n\nL'horaire de {{matchName}} a changé : nouvelle date le {{matchDate}}.\n\n{{clubName}}",
  },
  {
    type: 'MATCH_RESCHEDULED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.EN,
    subject: 'Schedule change - {{matchName}}',
    body: 'Hello {{firstName}},\n\nThe schedule for {{matchName}} has changed: new date on {{matchDate}}.\n\n{{clubName}}',
  },
  {
    type: 'NEW_EVENT',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Nouvel événement - {{clubName}}',
    body: 'Bonjour {{firstName}},\n\nUn nouvel événement a été publié : {{eventTitle}}.\n\n{{clubName}}',
  },
  // --- ArbiNote ---
  {
    type: 'VOTE_ANOMALY_DETECTED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Anomalie de vote détectée - {{arbitreName}}',
    body: 'Bonjour {{firstName}},\n\nUne anomalie a été détectée sur les votes de {{arbitreName}} (match {{matchName}}, score de suspicion {{suspicionScore}}). Merci de vérifier dans le back-office ArbiNote.\n\nArbiNote',
  },
  // --- Auth / sécurité ---
  {
    type: 'PASSWORD_RESET',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Réinitialisation de votre mot de passe',
    body: "Bonjour {{firstName}},\n\nCliquez sur ce lien pour réinitialiser votre mot de passe : {{resetUrl}}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
  },
  {
    type: 'SECURITY_ALERT',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Alerte de sécurité',
    body: "Bonjour {{firstName}},\n\nUne activité inhabituelle a été détectée sur votre compte.\n\nSi ce n'était pas vous, contactez-nous immédiatement.",
  },
  {
    type: 'ACCOUNT_SUSPENDED',
    channel: NotificationChannelType.EMAIL,
    locale: NotificationLocale.FR,
    subject: 'Compte suspendu',
    body: "Bonjour {{firstName}},\n\nVotre compte a été suspendu. Contactez le support pour plus d'informations.",
  },
];
