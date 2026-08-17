-- CLUB-002 — workflow éditorial News complet et publication planifiée.
-- Le champ legacy `status` reste DRAFT/PUBLISHED pour compatibilité publique ;
-- `editorial_status` porte le workflow d'administration détaillé.

ALTER TABLE cms_news
  ADD COLUMN editorial_status ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','SCHEDULED','PUBLISHED','REJECTED') NOT NULL DEFAULT 'DRAFT' AFTER status,
  ADD COLUMN scheduled_at DATETIME NULL AFTER published_at;

UPDATE cms_news
SET editorial_status = CASE
  WHEN status = 'PUBLISHED' AND is_published = 1 THEN 'PUBLISHED'
  ELSE 'DRAFT'
END
WHERE editorial_status = 'DRAFT';

CREATE INDEX idx_cms_news_schedule
  ON cms_news (team_id, editorial_status, scheduled_at);
