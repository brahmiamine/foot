-- Migration : portée par catégorie + urgence pour les notifications/annonces
-- internes (communication club -> équipe, coach -> joueurs de sa
-- catégorie, direction -> tous, annonces urgentes). Additive sur une table
-- déjà propre à teamManager (cms_notifications).

USE foot;

ALTER TABLE cms_notifications
  ADD COLUMN category ENUM(
    'seniors',
    'u21', 'u20', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14', 'u13',
    'u12', 'u11', 'u10', 'u9', 'u8', 'u7'
  ) NULL AFTER target_type,
  ADD COLUMN is_urgent TINYINT(1) NOT NULL DEFAULT 0 AFTER message;
