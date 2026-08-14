/**
 * Protection contre les votes multiples
 * Vérifie uniquement dans la base de données (source de vérité unique)
 */

/**
 * Vérifie si un vote existe dans la base de données pour un match donné avec un fingerprint
 * La base de données est la seule source de vérité
 */
export async function hasVotedAsync(matchId: string, fingerprint?: string | null): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  // Si pas de fingerprint, on ne peut pas vérifier
  if (!fingerprint) {
    return false
  }
  
  try {
    const response = await fetch(`/api/votes/${matchId}/user?fingerprint=${fingerprint}`)
    if (response.ok) {
      // Vote existe en base de données
      return true
    } else if (response.status === 404) {
      // Vote n'existe pas en base de données
      return false
    }
    // Autre erreur HTTP
    return false
  } catch (error) {
    // En cas d'erreur réseau, on retourne false (pas de vote)
    console.error('Error checking vote in database:', error)
    return false
  }
}

