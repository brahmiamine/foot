import { getDataSource } from './db'
import { TeamBranding } from './entities'
import { toPlain } from './serialization'

export interface TeamBrandingInput {
  faviconUrl?: string | null
  icon192Url?: string | null
  icon512Url?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  accentColor?: string | null
  font?: string | null
  metadata?: Record<string, unknown> | null
}

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/

function assertValidColor(value: string | null | undefined, field: string) {
  if (value != null && value !== '' && !HEX_COLOR.test(value)) {
    throw new Error(`${field} doit être une couleur hexadécimale valide (ex: #c8102e)`)
  }
}

export async function getTeamBranding(teamId: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository(TeamBranding)
  const branding = await repo.findOne({ where: { teamId } })
  return branding ? toPlain(branding) : null
}

export async function upsertTeamBranding(teamId: string, input: TeamBrandingInput) {
  assertValidColor(input.primaryColor, 'primaryColor')
  assertValidColor(input.secondaryColor, 'secondaryColor')
  assertValidColor(input.accentColor, 'accentColor')

  const dataSource = await getDataSource()
  const repo = dataSource.getRepository(TeamBranding)

  let branding = await repo.findOne({ where: { teamId } })
  if (!branding) {
    branding = repo.create({ teamId })
  }

  if (input.faviconUrl !== undefined) branding.faviconUrl = input.faviconUrl
  if (input.icon192Url !== undefined) branding.icon192Url = input.icon192Url
  if (input.icon512Url !== undefined) branding.icon512Url = input.icon512Url
  if (input.primaryColor !== undefined) branding.primaryColor = input.primaryColor
  if (input.secondaryColor !== undefined) branding.secondaryColor = input.secondaryColor
  if (input.accentColor !== undefined) branding.accentColor = input.accentColor
  if (input.font !== undefined) branding.font = input.font
  if (input.metadata !== undefined) branding.metadata = input.metadata

  const saved = await repo.save(branding)
  return toPlain(saved)
}
