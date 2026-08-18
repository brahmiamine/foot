import { getDataSource } from "@/lib/database";
import { PublicFormSettings, type PublicFormDomain } from "@/entities/PublicFormSettings";

export class PublicFormClosedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicFormClosedError";
  }
}

export interface PublicFormSettingsInput {
  isOpen: boolean;
  opensAt?: Date | null;
  closesAt?: Date | null;
  rateLimitMax?: number | null;
  rateLimitWindowMinutes?: number | null;
}

const DEFAULTS: PublicFormSettingsInput = {
  isOpen: true,
  opensAt: null,
  closesAt: null,
  rateLimitMax: null,
  rateLimitWindowMinutes: null,
};

/**
 * OB-001 : source unique de vérité pour l'ouverture/fermeture et le rate
 * limit des formulaires publics (académie/recrutement/sponsor/vendeur/
 * contact). Consommée depuis club-hub (ses propres server actions) et,
 * via `/api/internal/public-form-settings`, depuis club-ob pour le
 * formulaire vendeur — jamais de logique d'autorisation dupliquée côté
 * frontend public.
 */
export class PublicFormSettingsService {
  async get(teamId: string, domain: PublicFormDomain): Promise<PublicFormSettingsInput & { version: number }> {
    const ds = await getDataSource();
    const row = await ds.getRepository(PublicFormSettings).findOne({ where: { teamId, domain } });
    if (!row) return { ...DEFAULTS, version: 0 };
    return {
      isOpen: Boolean(row.isOpen),
      opensAt: row.opensAt,
      closesAt: row.closesAt,
      rateLimitMax: row.rateLimitMax,
      rateLimitWindowMinutes: row.rateLimitWindowMinutes,
      version: row.version,
    };
  }

  async listForTeam(teamId: string): Promise<PublicFormSettings[]> {
    const ds = await getDataSource();
    return ds.getRepository(PublicFormSettings).find({ where: { teamId } });
  }

  async update(
    teamId: string,
    domain: PublicFormDomain,
    input: PublicFormSettingsInput,
    actorUserId: string,
  ): Promise<PublicFormSettings> {
    const ds = await getDataSource();
    const repository = ds.getRepository(PublicFormSettings);
    const existing = await repository.findOne({ where: { teamId, domain } });
    const row =
      existing ??
      repository.create({ teamId, domain, ...DEFAULTS, version: 0 });
    row.isOpen = input.isOpen;
    row.opensAt = input.opensAt ?? null;
    row.closesAt = input.closesAt ?? null;
    row.rateLimitMax = input.rateLimitMax ?? null;
    row.rateLimitWindowMinutes = input.rateLimitWindowMinutes ?? null;
    row.version = (existing?.version ?? 0) + 1;
    row.updatedBy = actorUserId;
    return repository.save(row);
  }

  /**
   * Garde serveur unique, appelée par CHAQUE action de soumission publique
   * avant d'écrire quoi que ce soit. `countRecentSubmissions` est fourni
   * par l'appelant (chaque domaine compte dans sa propre table métier —
   * ContactMessage/RecruitmentApplication/PlayerApplication/SponsorRequest
   * — plutôt que de dupliquer un journal générique).
   */
  async assertOpen(
    teamId: string,
    domain: PublicFormDomain,
    countRecentSubmissions?: (windowStart: Date) => Promise<number>,
    now: Date = new Date(),
  ): Promise<void> {
    const settings = await this.get(teamId, domain);
    if (!settings.isOpen) {
      throw new PublicFormClosedError("Ce formulaire est actuellement fermé.");
    }
    if (settings.opensAt && now < settings.opensAt) {
      throw new PublicFormClosedError("Ce formulaire n'est pas encore ouvert.");
    }
    if (settings.closesAt && now >= settings.closesAt) {
      throw new PublicFormClosedError("Ce formulaire est fermé.");
    }
    if (settings.rateLimitMax != null && settings.rateLimitWindowMinutes != null && countRecentSubmissions) {
      const windowStart = new Date(now.getTime() - settings.rateLimitWindowMinutes * 60_000);
      const count = await countRecentSubmissions(windowStart);
      if (count >= settings.rateLimitMax) {
        throw new PublicFormClosedError("Trop de soumissions récentes, merci de réessayer plus tard.");
      }
    }
  }
}
