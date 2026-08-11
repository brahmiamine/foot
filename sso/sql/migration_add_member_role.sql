-- Ajoute le rôle MEMBER (espace membre public de `ob`) à la table `User`
-- partagée. Additive uniquement : les rôles existants (ADMIN, OBSERVATEUR,
-- SUPERADMIN) et leurs contraintes ne changent pas, matchsheet/arbinote/
-- superadmin/teamManager n'ont rien à modifier (ils décodent le rôle du JWT
-- comme une simple string, voir leur src/lib/ssoSession.ts).

USE foot;

ALTER TABLE `User`
  MODIFY `role` ENUM('ADMIN', 'OBSERVATEUR', 'SUPERADMIN', 'MEMBER') NOT NULL DEFAULT 'OBSERVATEUR';
