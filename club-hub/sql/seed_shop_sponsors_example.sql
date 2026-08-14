-- Données d'exemple pour la Boutique et les Sponsors.
-- Alimente le premier club trouvé dans `teams` (adaptez le WHERE si besoin
-- pour cibler un club précis).

USE foot;

SET @team_id = (SELECT id FROM teams ORDER BY created_at ASC LIMIT 1);

-- =========================================================================
-- BOUTIQUE : catégories
-- =========================================================================

INSERT INTO cms_product_categories (team_id, name_fr, name_ar) VALUES
  (@team_id, 'Maillots', 'قمصان'),
  (@team_id, 'Accessoires', 'إكسسوارات'),
  (@team_id, 'Écharpes & goodies', 'أوشحة وهدايا');

SET @cat_maillots = (SELECT id FROM cms_product_categories WHERE team_id = @team_id AND name_fr = 'Maillots' LIMIT 1);
SET @cat_accessoires = (SELECT id FROM cms_product_categories WHERE team_id = @team_id AND name_fr = 'Accessoires' LIMIT 1);
SET @cat_goodies = (SELECT id FROM cms_product_categories WHERE team_id = @team_id AND name_fr = 'Écharpes & goodies' LIMIT 1);

-- =========================================================================
-- BOUTIQUE : produits (stock et prix variés)
-- =========================================================================

INSERT INTO cms_products (team_id, category_id, name_fr, name_ar, description_fr, price, stock, image_url, is_active) VALUES
  (@team_id, @cat_maillots, 'Maillot domicile 2025/2026', 'قميص أساسي 2025/2026', 'Maillot officiel domicile, saison en cours.', 89.900, 42, '/uploads/products/maillot-domicile.jpg', 1),
  (@team_id, @cat_maillots, 'Maillot extérieur 2025/2026', 'قميص احتياطي 2025/2026', 'Maillot officiel extérieur, saison en cours.', 89.900, 30, '/uploads/products/maillot-exterieur.jpg', 1),
  (@team_id, @cat_maillots, 'Maillot gardien', 'قميص حارس المرمى', 'Maillot officiel gardien de but.', 79.900, 12, NULL, 1),
  (@team_id, @cat_accessoires, 'Casquette officielle', 'قبعة رسمية', 'Casquette brodée du logo du club.', 24.900, 60, NULL, 1),
  (@team_id, @cat_accessoires, 'Ballon officiel', 'كرة رسمية', 'Ballon floqué aux couleurs du club, taille 5.', 34.900, 0, NULL, 1),
  (@team_id, @cat_goodies, 'Écharpe supporter', 'وشاح المشجعين', 'Écharpe tricolore, édition supporters.', 14.900, 100, '/uploads/products/echarpe.jpg', 1),
  (@team_id, @cat_goodies, 'Porte-clés logo', 'ميدالية مفاتيح', 'Porte-clés métal gravé du logo du club.', 6.900, 200, NULL, 1),
  (@team_id, NULL, 'Pack collector (édition limitée)', 'مجموعة نادرة', 'Maillot + écharpe + casquette, édition limitée numérotée.', 129.900, 5, NULL, 0);

-- =========================================================================
-- SPONSORS : demandes de partenariat (exemples avec logos de tailles variées)
-- =========================================================================

INSERT INTO cms_sponsor_requests (team_id, company_name, contact_name, email, phone, website, logo_url, logo_size, proposed_level, message, status, admin_notes, reviewed_at, created_at) VALUES
  (@team_id, 'Café Central', 'Sami Trabelsi', 'contact@cafecentral.tn', '+216 20 111 222', 'https://cafecentral.tn', '/uploads/sponsors/cafe-central-logo-small.png', 'SMALL', 'LOCAL', 'Petit commerce local, on aimerait soutenir le club et avoir notre logo sur le site.', 'PENDING', NULL, NULL, NOW() - INTERVAL 2 DAY),
  (@team_id, 'Pharmacie El Amen', 'Yosra Ben Ali', 'contact@pharmacie-elamen.tn', '+216 22 333 444', NULL, '/uploads/sponsors/pharmacie-elamen-logo-medium.png', 'MEDIUM', 'BRONZE', 'Nous souhaitons devenir partenaire officiel santé du club.', 'PENDING', NULL, NULL, NOW() - INTERVAL 1 DAY),
  (@team_id, 'AutoDistrib Tunisie', 'Karim Jaziri', 'k.jaziri@autodistrib.tn', '+216 71 555 666', 'https://autodistrib.tn', '/uploads/sponsors/autodistrib-logo-large.png', 'LARGE', 'ARGENT', 'Groupe automobile régional, budget marketing dédié au sponsoring sportif.', 'ACCEPTED', 'Dossier validé par le bureau, contrat signé pour la saison.', NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 20 DAY),
  (@team_id, 'Banque du Nord', 'Nadia Cherif', 'sponsoring@banquedunord.tn', '+216 71 777 888', 'https://banquedunord.tn', '/uploads/sponsors/banque-du-nord-logo-large.png', 'LARGE', 'OR', 'Sponsor principal souhaité, logo sur maillot et toutes supports.', 'ACCEPTED', 'Sponsor principal retenu pour 2 saisons.', NOW() - INTERVAL 30 DAY, NOW() - INTERVAL 45 DAY),
  (@team_id, 'Superette Rapide', 'Mounir Gharbi', 'mounir@superette-rapide.tn', '+216 25 999 000', NULL, NULL, 'SMALL', 'LOCAL', 'Petit budget mais motivés pour aider le club de quartier.', 'REFUSED', 'Budget proposé insuffisant pour le niveau demandé, à revoir la saison prochaine.', NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 8 DAY);

-- =========================================================================
-- SPONSORS : dossiers actifs correspondant aux demandes acceptées ci-dessus
-- =========================================================================

INSERT INTO cms_sponsors (team_id, sponsor_request_id, company_name, logo_url, logo_size, website, level, logo_placement, contract_start, contract_end, contract_amount, is_active) VALUES
  (@team_id, (SELECT id FROM cms_sponsor_requests WHERE team_id = @team_id AND company_name = 'AutoDistrib Tunisie' LIMIT 1), 'AutoDistrib Tunisie', '/uploads/sponsors/autodistrib-logo-large.png', 'LARGE', 'https://autodistrib.tn', 'ARGENT', 'HOME,FOOTER,MATCH_PAGES', CURDATE() - INTERVAL 10 DAY, CURDATE() + INTERVAL 355 DAY, 5000.000, 1),
  (@team_id, (SELECT id FROM cms_sponsor_requests WHERE team_id = @team_id AND company_name = 'Banque du Nord' LIMIT 1), 'Banque du Nord', '/uploads/sponsors/banque-du-nord-logo-large.png', 'LARGE', 'https://banquedunord.tn', 'OR', 'HOME,FOOTER,MATCH_PAGES,SHOP', CURDATE() - INTERVAL 30 DAY, CURDATE() + INTERVAL 700 DAY, 20000.000, 1);
