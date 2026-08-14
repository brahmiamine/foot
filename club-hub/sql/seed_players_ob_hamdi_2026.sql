-- Import du groupe apparu dans la feuille de match Olympique de Béja vs
-- Olympique Akbou (composition 1re/2e mi-temps). Noms tirés directement de
-- la capture fournie par l'utilisateur — pas de liste française officielle
-- disponible, donc firstNameFr/lastNameFr sont ma translittération latine
-- au meilleur effort et DOIVENT être relus/corrigés. Numéros de maillot
-- attribués aléatoirement (le club a explicitement demandé de les changer
-- plus tard) : PAS de garantie qu'ils correspondent aux vrais numéros ni
-- qu'ils ne collisionnent pas avec des joueurs déjà en base.
--
-- Le joueur étranger "sous test" de la composition n'est pas inclus (aucun
-- nom donné). Adapter le LIKE ci-dessous si le nom exact du club en base
-- diffère de "Béja".

SET @team_id = (SELECT id FROM teams WHERE nom LIKE '%Béja%' LIMIT 1);

-- IMPORTANT : vérifier que cette ligne renvoie bien un UUID (pas NULL) avant
-- de lancer les INSERT plus bas — sinon les joueurs seraient créés avec un
-- teamId NULL.
SELECT @team_id AS team_id_found;

INSERT INTO Player (id, firstNameFr, firstNameAr, lastNameFr, lastNameAr, number, teamId, category, status, isActive, createdAt, updatedAt)
VALUES
  (UUID(), 'Hamdi',          'حمدي',  'Chairat',        'شعيرات',           30, @team_id, 'seniors', 'TITULAR', 1, NOW(), NOW()),
  (UUID(), 'Hamza',          'حمزة',  'El Mabrouk',     'المبروك',          66, @team_id, 'seniors', 'TITULAR', 1, NOW(), NOW()),
  (UUID(), 'Cherif',         'شريف',  'Kamara',         'كمارا',            17, @team_id, 'seniors', 'TITULAR', 1, NOW(), NOW()),
  (UUID(), 'Islem',          'إسلام', 'Chelghoumi',     'الشلغومي',         11, @team_id, 'seniors', 'TITULAR', 1, NOW(), NOW()),
  (UUID(), 'Youssef',        'يوسف',  'Azib',           'عزيب',             43, @team_id, 'seniors', 'TITULAR', 1, NOW(), NOW()),
  (UUID(), 'Firas',          'فراس',  'Fadhli',         'فضلي',             13, @team_id, 'seniors', 'TITULAR', 1, NOW(), NOW()),
  (UUID(), 'Mohamed Ali',    'محمد علي', 'Nefzi',        'النفزي',           65, @team_id, 'seniors', 'TITULAR', 1, NOW(), NOW()),
  (UUID(), 'Mohamed Amine',  'محمد أمين', 'Ben Ammar',   'بن عمار',          31, @team_id, 'seniors', 'TITULAR', 1, NOW(), NOW()),
  (UUID(), 'Mohamed Hedi',   'محمد الهادي', 'Hadouchi',  'الحدوشي',          25, @team_id, 'seniors', 'TITULAR', 1, NOW(), NOW()),
  (UUID(), 'Mehdi',          'مهدي',  'Khiri',          'خيري',             7,  @team_id, 'seniors', 'TITULAR', 1, NOW(), NOW()),
  (UUID(), 'Chahine',        'شاهين', 'Semaoui',        'السماوي',          54, @team_id, 'seniors', 'SUBSTITUTE', 1, NOW(), NOW()),
  (UUID(), 'Mahrez',         'محرز',  'Belrajeh',       'بالراجح',          5,  @team_id, 'seniors', 'SUBSTITUTE', 1, NOW(), NOW()),
  (UUID(), 'Mohamed',        'محمد',  'Diouf',          'ديوف',             44, @team_id, 'seniors', 'SUBSTITUTE', 1, NOW(), NOW()),
  (UUID(), 'Majd',           'مجد',   'Hadhli',         'الهذلي',           82, @team_id, 'seniors', 'SUBSTITUTE', 1, NOW(), NOW()),
  (UUID(), 'Hocine',         'حسين',  'Gafsi',          'قفصي',             36, @team_id, 'seniors', 'SUBSTITUTE', 1, NOW(), NOW()),
  (UUID(), 'Iyed',           'إياد',  'Ferchichi',      'الفرشيشي',         20, @team_id, 'seniors', 'SUBSTITUTE', 1, NOW(), NOW()),
  (UUID(), 'Yahia',          'يحي',   'Achouri',        'العاشوري',         18, @team_id, 'seniors', 'SUBSTITUTE', 1, NOW(), NOW()),
  (UUID(), 'Bachir',         'بشير',  'Hosni',          'الحسني',           21, @team_id, 'seniors', 'SUBSTITUTE', 1, NOW(), NOW()),
  (UUID(), 'Bahaa',          'بهاء',  'Charni',         'الشارني',          52, @team_id, 'seniors', 'SUBSTITUTE', 1, NOW(), NOW());
