-- Script d'insertion d'exemples de matches avec support des équipes externes
-- IMPORTANT : Exécutez d'abord migrate_matches_external_teams.sql pour modifier la structure
-- Assurez-vous que les tables suivantes contiennent des données :
-- - teams (au moins 2 équipes)
-- - competitions (optionnel)
-- - stadiums (optionnel)

-- =========================================================================
-- EXEMPLES DE MATCHES - AVEC SUPPORT ÉQUIPES EXTERNES
-- =========================================================================

-- Match 1 : Match à venir (UPCOMING) - 2 équipes internes (CAS 1)
-- Remplacez les IDs par les IDs réels de vos équipes, compétition et stade
INSERT INTO matches (
    competition_id,
    home_team_id,
    home_team_name,
    away_team_id,
    away_team_name,
    stadium_id,
    match_day,
    round_label_fr,
    round_label_ar,
    match_date,
    status,
    home_score,
    away_score,
    is_public_visible
) VALUES (
    NULL, -- ou l'ID d'une compétition existante
    1,    -- ID de l'équipe à domicile (remplacer par un ID réel)
    NULL, -- Nom automatiquement rempli depuis la table teams
    2,    -- ID de l'équipe à l'extérieur (remplacer par un ID réel)
    NULL, -- Nom automatiquement rempli depuis la table teams
    NULL, -- ou l'ID d'un stade existant
    1,    -- Journée 1
    '1ère journée',
    'الجولة الأولى',
    '2025-02-15 18:00:00', -- Date et heure du match
    'UPCOMING',
    NULL, -- Score non défini pour un match à venir
    NULL,
    TRUE
);

-- Match 2 : Match avec équipe externe (CAS 2)
-- Olympique Béja (interne) vs ES Kef (externe)
INSERT INTO matches (
    competition_id,
    home_team_id,
    home_team_name,
    away_team_id,
    away_team_name,
    stadium_id,
    match_day,
    round_label_fr,
    round_label_ar,
    match_date,
    status,
    home_score,
    away_score,
    is_public_visible
) VALUES (
    NULL,
    1,           -- ID de l'équipe à domicile (interne)
    NULL,        -- Nom automatiquement rempli depuis la table teams
    NULL,        -- Équipe externe, pas d'ID
    'ES Kef',    -- Nom de l'équipe externe
    NULL,
    2,
    '2ème journée',
    'الجولة الثانية',
    '2025-02-20 16:00:00',
    'UPCOMING',
    NULL,
    NULL,
    TRUE
);

-- Match 3 : Match entre 2 équipes externes (CAS 3)
-- ES Tunis vs JS Kairouan (tournoi)
INSERT INTO matches (
    competition_id,
    home_team_id,
    home_team_name,
    away_team_id,
    away_team_name,
    stadium_id,
    match_day,
    round_label_fr,
    round_label_ar,
    match_date,
    status,
    home_score,
    away_score,
    is_public_visible
) VALUES (
    1,           -- ID d'une compétition existante
    NULL,        -- Équipe externe, pas d'ID
    'ES Tunis',  -- Nom de l'équipe externe
    NULL,        -- Équipe externe, pas d'ID
    'JS Kairouan', -- Nom de l'équipe externe
    NULL,
    NULL,        -- Pas de journée pour un tournoi
    'Phase de groupes',
    'مرحلة المجموعات',
    '2025-03-01 18:00:00',
    'UPCOMING',
    NULL,
    NULL,
    TRUE
);

-- Match 4 : Match terminé (FINISHED) avec équipe externe
-- Olympique Béja (interne) vs Club Africain (externe)
INSERT INTO matches (
    competition_id,
    home_team_id,
    home_team_name,
    away_team_id,
    away_team_name,
    stadium_id,
    match_day,
    round_label_fr,
    round_label_ar,
    match_date,
    status,
    home_score,
    away_score,
    is_public_visible
) VALUES (
    NULL,
    1,              -- ID de l'équipe à domicile (interne)
    NULL,           -- Nom automatiquement rempli depuis la table teams
    NULL,           -- Équipe externe
    'Club Africain', -- Nom de l'équipe externe
    NULL,
    3,
    '3ème journée',
    'الجولة الثالثة',
    '2025-01-25 17:00:00', -- Match passé
    'FINISHED',
    2,    -- Score équipe à domicile
    1,    -- Score équipe à l'extérieur
    TRUE
);

-- Match 5 : Match avec compétition et stade - 2 équipes internes
INSERT INTO matches (
    competition_id,
    home_team_id,
    home_team_name,
    away_team_id,
    away_team_name,
    stadium_id,
    match_day,
    round_label_fr,
    round_label_ar,
    match_date,
    status,
    home_score,
    away_score,
    is_public_visible
) VALUES (
    1,    -- ID d'une compétition existante
    1,    -- ID de l'équipe à domicile
    NULL, -- Nom automatiquement rempli depuis la table teams
    2,    -- ID de l'équipe à l'extérieur
    NULL, -- Nom automatiquement rempli depuis la table teams
    1,    -- ID d'un stade existant
    4,
    '4ème journée',
    'الجولة الرابعة',
    '2025-02-22 20:00:00',
    'UPCOMING',
    NULL,
    NULL,
    TRUE
);

-- =========================================================================
-- NOTES IMPORTANTES
-- =========================================================================
-- 1. SUPPORT DES ÉQUIPES EXTERNES :
--    - Si l'équipe est dans votre base : utilisez team_id (et laissez team_name à NULL)
--    - Si l'équipe est externe : laissez team_id à NULL et remplissez team_name
--    - Le nom (team_name) est TOUJOURS utilisé pour l'affichage, même pour les équipes internes
--
-- 2. CAS D'USAGE :
--    - CAS 1 : 2 équipes internes → home_team_id + away_team_id remplis, team_name à NULL
--    - CAS 2 : 1 interne + 1 externe → un team_id rempli, l'autre NULL avec team_name
--    - CAS 3 : 2 équipes externes → les deux team_id à NULL, les deux team_name remplis
--
-- 3. Remplacez les IDs (1, 2, etc.) par les IDs réels de vos données :
--    - home_team_id et away_team_id : IDs des équipes dans la table teams (ou NULL)
--    - competition_id : ID d'une compétition dans la table competitions (peut être NULL)
--    - stadium_id : ID d'un stade dans la table stadiums (peut être NULL)
--
-- 4. Les dates doivent être au format : 'YYYY-MM-DD HH:MM:SS'
--
-- 5. Les statuts possibles sont :
--    - 'UPCOMING' : Match à venir
--    - 'FINISHED' : Match terminé
--    - 'CANCELLED' : Match annulé
--    - 'POSTPONED' : Match reporté
--
-- 6. Pour les matchs terminés (FINISHED), remplissez home_score et away_score
--
-- 7. Pour les matchs à venir, laissez home_score et away_score à NULL
--
-- 8. is_public_visible : TRUE pour visible publiquement, FALSE pour privé
--
-- 9. Validation métier :
--    - Si team_id est NULL, alors team_name est OBLIGATOIRE
--    - Si les deux équipes sont internes, elles doivent être différentes

