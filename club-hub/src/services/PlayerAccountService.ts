import type {
  IdentityAccountInvitationResult,
  IdentityPlayerInvitationPort,
} from '../../../packages/domain-contracts/src/identity'
import { createClubIdentityInvitationAdapter } from '@/adapters/identity/createClubIdentityInvitationAdapter'
import { PlayerService } from './PlayerService'

/** Club-side orchestration. Identity owns credentials/tokens/email delivery. */
export class PlayerAccountService {
  constructor(
    private readonly identity: IdentityPlayerInvitationPort = createClubIdentityInvitationAdapter(),
    private readonly players: PlayerService = new PlayerService(),
  ) {}

  async invite(
    playerId: string,
    teamId: string,
    email: string,
    invitedByUserId: string,
  ): Promise<IdentityAccountInvitationResult> {
    const player = await this.players.findById(playerId, teamId)
    if (!player) throw new Error('Joueur introuvable pour ce club')
    if (!player.isActive) throw new Error('Impossible de provisionner un compte pour un joueur inactif')

    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Adresse email invalide')
    }

    return this.identity.invitePlayerAccount({
      name: `${player.firstNameFr} ${player.lastNameFr}`.trim(),
      email: normalizedEmail,
      teamId,
      playerId: player.id,
      invitedByUserId,
    })
  }
}
