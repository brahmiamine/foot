export interface ConflictDeclarationSnapshot {
  hasConflict: boolean;
}

/**
 * REF-005 — une désignation ne peut être acceptée que si l'officiel a
 * explicitement déclaré l'absence de conflit d'intérêts. Toute déclaration
 * positive bloque l'acceptation (remplacement/refus obligatoire).
 */
export function canAcceptWithConflictDeclaration(declaration: ConflictDeclarationSnapshot | null): string | null {
  if (!declaration) {
    return "Une déclaration d'absence de conflit d'intérêts est requise avant d'accepter cette désignation";
  }
  if (declaration.hasConflict) {
    return "Vous avez déclaré un conflit d'intérêts sur cette désignation : elle ne peut pas être acceptée";
  }
  return null;
}
