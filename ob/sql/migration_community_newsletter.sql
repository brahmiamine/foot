-- Phase 5 : newsletter "OB News" (#27). La collecte d'inscriptions est
-- réelle ; l'envoi d'emails effectif attend un fournisseur (SendGrid,
-- Mailgun, SES...) à choisir — même catégorie de dépendance externe que
-- Stripe pour la billetterie (voir roadmap phase 4), donc pas branché ici.
-- En attendant, /newsletter affiche un résumé hebdomadaire généré en direct
-- à partir des vraies données (actus, résultats, prochains matchs, classement).

USE foot;

CREATE TABLE ob_newsletter_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  user_id VARCHAR(191) NULL,
  unsubscribe_token VARCHAR(64) NOT NULL,
  subscribed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at DATETIME NULL,
  UNIQUE KEY uniq_ob_newsletter_email (email),
  UNIQUE KEY uniq_ob_newsletter_token (unsubscribe_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
