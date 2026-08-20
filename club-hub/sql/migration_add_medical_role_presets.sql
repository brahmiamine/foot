-- CLUB-013 : presets médicaux distincts et de moindre privilège.
--
-- Cette migration ne modifie jamais les rôles existants : elle crée seulement
-- les trois presets système absents pour chaque club. Le rôle historique
-- "Staff médical" reste valide et `medical.manage` conserve sa compatibilité
-- applicative, afin de permettre une migration progressive sans coupure.

USE foot;

INSERT INTO cms_roles (team_id, name, description, is_global, is_system, permissions)
SELECT
  t.id,
  'Kiné',
  'Suivi thérapeutique et progression Return-to-Play de sa catégorie, sans diagnostic, clearance ni configuration médicale.',
  0,
  1,
  '["players.view","staff.view","matches.view","convocations.view","trainings.view","medical.view","medical.followups.manage","medical.rtp.manage"]'
FROM teams t
WHERE NOT EXISTS (
  SELECT 1 FROM cms_roles r WHERE r.team_id = t.id AND r.name = 'Kiné'
);

INSERT INTO cms_roles (team_id, name, description, is_global, is_system, permissions)
SELECT
  t.id,
  'Médecin',
  'Responsabilité clinique : diagnostic, suivi, Return-to-Play, documents et clearance de sa catégorie.',
  0,
  1,
  '["players.view","staff.view","matches.view","convocations.view","trainings.view","medical.view","medical.injuries.manage","medical.followups.manage","medical.rtp.manage","medical.clearance.manage","medical.documents.manage"]'
FROM teams t
WHERE NOT EXISTS (
  SELECT 1 FROM cms_roles r WHERE r.team_id = t.id AND r.name = 'Médecin'
);

INSERT INTO cms_roles (team_id, name, description, is_global, is_system, permissions)
SELECT
  t.id,
  'Responsable médical',
  'Responsabilité médicale complète incluant les règles de clearance et de second avis du club.',
  0,
  1,
  '["players.view","staff.view","matches.view","convocations.view","trainings.view","medical.view","medical.injuries.manage","medical.followups.manage","medical.rtp.manage","medical.clearance.manage","medical.documents.manage","medical.settings.manage"]'
FROM teams t
WHERE NOT EXISTS (
  SELECT 1 FROM cms_roles r WHERE r.team_id = t.id AND r.name = 'Responsable médical'
);
