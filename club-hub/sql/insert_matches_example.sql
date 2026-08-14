-- Script d'insertion d'exemples de matches
-- Assurez-vous que les tables suivantes contiennent des données :
-- - teams (au moins 2 équipes)
-- - competitions (optionnel)
-- - stadiums (optionnel)

-- =========================================================================
-- EXEMPLES DE MATCHES
-- =========================================================================

-- Match 1 : Match à venir (UPCOMING)
-- Remplacez les IDs par les IDs réels de vos équipes, compétition et stade
INSERT INTO
    matches (
        competition_id,
        home_team_id,
        away_team_id,
        stadium_id,
        match_day,
        round_label_fr,
        round_label_ar,
        match_date,
        status,
        home_score,
        away_score,
        is_public_visible
    )
VALUES (
        NULL, -- ou l'ID d'une compétition existante
        1, -- ID de l'équipe à domicile (remplacer par un ID réel)
        2, -- ID de l'équipe à l'extérieur (remplacer par un ID réel)
        NULL, -- ou l'ID d'un stade existant
        1, -- Journée 1
        '1ère journée',
        'الجولة الأولى',
        '2025-02-15 18:00:00', -- Date et heure du match
        'UPCOMING',
        NULL, -- Score non défini pour un match à venir
        NULL,
        TRUE
    );

-- Match 2 : Match terminé (FINISHED) avec scores
INSERT INTO
    matches (
        competition_id,
        home_team_id,
        away_team_id,
        stadium_id,
        match_day,
        round_label_fr,
        round_label_ar,
        match_date,
        status,
        home_score,
        away_score,
        is_public_visible
    )
VALUES (
        NULL, -- ou l'ID d'une compétition existante
        1, -- ID de l'équipe à domicile
        2, -- ID de l'équipe à l'extérieur
        NULL, -- ou l'ID d'un stade existant
        1,
        '1ère journée',
        'الجولة الأولى',
        '2025-01-20 15:00:00', -- Match passé
        'FINISHED',
        2, -- Score équipe à domicile
        1, -- Score équipe à l'extérieur
        TRUE
    );

-- Match 3 : Match avec compétition et stade
INSERT INTO
    matches (
        competition_id,
        home_team_id,
        away_team_id,
        stadium_id,
        match_day,
        round_label_fr,
        round_label_ar,
        match_date,
        status,
        home_score,
        away_score,
        is_public_visible
    )
VALUES (
        1, -- ID d'une compétition existante
        1, -- ID de l'équipe à domicile
        2, -- ID de l'équipe à l'extérieur
        1, -- ID d'un stade existant
        2,
        '2ème journée',
        'الجولة الثانية',
        '2025-02-22 20:00:00',
        'UPCOMING',
        NULL,
        NULL,
        TRUE
    );

-- Match 4 : Match reporté (POSTPONED)
INSERT INTO
    matches (
        competition_id,
        home_team_id,
        away_team_id,
        stadium_id,
        match_day,
        round_label_fr,
        round_label_ar,
        match_date,
        status,
        home_score,
        away_score,
        is_public_visible
    )
VALUES (
        NULL,
        1,
        2,
        NULL,
        3,
        '3ème journée',
        'الجولة الثالثة',
        '2025-03-01 16:00:00',
        'POSTPONED',
        NULL,
        NULL,
        TRUE
    );

-- Match 5 : Match annulé (CANCELLED)
INSERT INTO
    matches (
        competition_id,
        home_team_id,
        away_team_id,
        stadium_id,
        match_day,
        round_label_fr,
        round_label_ar,
        match_date,
        status,
        home_score,
        away_score,
        is_public_visible
    )
VALUES (
        NULL,
        1,
        2,
        NULL,
        4,
        '4ème journée',
        'الجولة الرابعة',
        '2025-03-10 18:00:00',
        'CANCELLED',
        NULL,
        NULL,
        FALSE -- Match privé car annulé
    );

-- Match 6 : Match de coupe (1/8 de finale)
INSERT INTO
    matches (
        competition_id,
        home_team_id,
        away_team_id,
        stadium_id,
        match_day,
        round_label_fr,
        round_label_ar,
        match_date,
        status,
        home_score,
        away_score,
        is_public_visible
    )
VALUES (
        1, -- ID d'une compétition de type CUP
        1,
        2,
        1,
        NULL, -- Pas de journée pour les matchs de coupe
        '1/8 de finale',
        'دور الـ16',
        '2025-03-15 19:00:00',
        'UPCOMING',
        NULL,
        NULL,
        TRUE
    );

-- Match 7 : Match terminé avec score élevé
INSERT INTO
    matches (
        competition_id,
        home_team_id,
        away_team_id,
        stadium_id,
        match_day,
        round_label_fr,
        round_label_ar,
        match_date,
        status,
        home_score,
        away_score,
        is_public_visible
    )
VALUES (
        NULL,
        1,
        2,
        NULL,
        5,
        '5ème journée',
        'الجولة الخامسة',
        '2025-01-25 17:00:00',
        'FINISHED',
        3,
        0,
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