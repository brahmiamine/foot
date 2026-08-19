import { PUBLIC_FORM_DOMAINS } from "@/entities/PublicFormSettings";
import {
  fetchEffectiveNotificationPolicy,
  fetchNotificationPolicies,
} from "@/lib/notificationApi";
import { PublicContentPolicyService } from "@/services/PublicContentPolicyService";
import { PublicFormSettingsService } from "@/services/PublicFormSettingsService";
import {
  toEffectiveConfigurationSection,
  type EffectiveConfigurationSection,
} from "../../../packages/domain-contracts/src/effective-configuration";

/** GOV-006 — vue effective Club Hub, sans logique d'héritage dans l'UI. */
export class EffectiveConfigurationService {
  async resolveForTeam(teamId: string, at: Date = new Date()): Promise<EffectiveConfigurationSection[]> {
    const [publicContent, notificationPolicies] = await Promise.all([
      new PublicContentPolicyService().resolveExplained(teamId, at),
      fetchNotificationPolicies(),
    ]);
    const formSettingsService = new PublicFormSettingsService();
    const forms = await Promise.all(
      PUBLIC_FORM_DOMAINS.map(async (domain) => ({
        domain,
        resolved: await formSettingsService.getExplained(teamId, domain, at),
      })),
    );

    const notificationCategories = [
      null,
      ...Array.from(
        new Set(
          notificationPolicies
            .map((policy) => policy.category)
            .filter((category): category is string => Boolean(category)),
        ),
      ).sort(),
    ];
    const notifications = await Promise.all(
      notificationCategories.map(async (category) => ({
        category,
        resolved: await fetchEffectiveNotificationPolicy(category, at),
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
      ...notifications.map(({ category, resolved }) =>
        toEffectiveConfigurationSection(
          category ? `NOTIFICATION_POLICY_${category}` : "NOTIFICATION_POLICY_DEFAULT",
          category ? `Notifications · ${category}` : "Notifications · fallback global",
          resolved,
        ),
      ),
    ];
  }
}
