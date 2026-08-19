import { PUBLIC_FORM_DOMAINS } from "@/entities/PublicFormSettings";
import { PublicContentPolicyService } from "@/services/PublicContentPolicyService";
import { PublicFormSettingsService } from "@/services/PublicFormSettingsService";
import {
  toEffectiveConfigurationSection,
  type EffectiveConfigurationSection,
} from "../../../packages/domain-contracts/src/effective-configuration";

/** GOV-006 — vue effective Club Hub, sans logique d'héritage dans l'UI. */
export class EffectiveConfigurationService {
  async resolveForTeam(teamId: string, at: Date = new Date()): Promise<EffectiveConfigurationSection[]> {
    const publicContent = await new PublicContentPolicyService().resolveExplained(teamId, at);
    const formSettingsService = new PublicFormSettingsService();
    const forms = await Promise.all(
      PUBLIC_FORM_DOMAINS.map(async (domain) => ({
        domain,
        resolved: await formSettingsService.getExplained(teamId, domain, at),
      })),
    );

    return [
      toEffectiveConfigurationSection(
        "CLUB_PUBLIC_CONTENT",
        "Contenu public du club",
        publicContent,
      ),
      ...forms.map(({ domain, resolved }) =>
        toEffectiveConfigurationSection(
          `CLUB_PUBLIC_FORM_${domain}`,
          `Formulaire public · ${domain}`,
          resolved,
        ),
      ),
    ];
  }
}
