import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdatePaymentRoutingPolicyDto } from './dto/update-payment-routing-policy.dto';
import { PaymentRoutingPolicy } from './entities/payment-routing-policy.entity';
import { PaymentProviderName } from './enums/payment-provider.enum';

export interface EffectivePaymentRoutingPolicy {
  consumerApplication: string;
  enabledProviders: PaymentProviderName[];
  defaultProvider: PaymentProviderName;
  fallbackProvider: PaymentProviderName | null;
  version: number;
  source: 'DEFAULT' | 'CONSUMER';
}

const COMPATIBILITY_DEFAULT_PROVIDERS = Object.freeze([
  PaymentProviderName.KONNECT,
  PaymentProviderName.PAYMEE,
  PaymentProviderName.FLOUCI,
]);

@Injectable()
export class PaymentRoutingPolicyService {
  constructor(
    @InjectRepository(PaymentRoutingPolicy)
    private readonly repository: Repository<PaymentRoutingPolicy>,
  ) {}

  async getEffectivePolicy(
    consumerApplication: string,
  ): Promise<EffectivePaymentRoutingPolicy> {
    const policy = await this.repository.findOne({
      where: { consumerApplication },
    });

    if (!policy) {
      return {
        consumerApplication,
        enabledProviders: [...COMPATIBILITY_DEFAULT_PROVIDERS],
        defaultProvider: PaymentProviderName.KONNECT,
        fallbackProvider: null,
        version: 0,
        source: 'DEFAULT',
      };
    }

    return {
      consumerApplication,
      enabledProviders: [...policy.enabledProviders],
      defaultProvider: policy.defaultProvider,
      fallbackProvider: policy.fallbackProvider,
      version: policy.version,
      source: 'CONSUMER',
    };
  }

  async updatePolicy(
    consumerApplication: string,
    dto: UpdatePaymentRoutingPolicyDto,
    actorApplication: string,
  ): Promise<EffectivePaymentRoutingPolicy> {
    this.validatePolicy(dto);

    const existing = await this.repository.findOne({
      where: { consumerApplication },
    });
    const version = (existing?.version ?? 0) + 1;
    const entity = this.repository.create({
      ...existing,
      consumerApplication,
      enabledProviders: [...dto.enabledProviders],
      defaultProvider: dto.defaultProvider,
      fallbackProvider: dto.fallbackProvider ?? null,
      version,
      updatedByApplication: actorApplication,
    });
    await this.repository.save(entity);

    return {
      consumerApplication,
      enabledProviders: [...entity.enabledProviders],
      defaultProvider: entity.defaultProvider,
      fallbackProvider: entity.fallbackProvider,
      version: entity.version,
      source: 'CONSUMER',
    };
  }

  async assertProviderEnabled(
    consumerApplication: string,
    provider: PaymentProviderName,
  ): Promise<void> {
    const policy = await this.getEffectivePolicy(consumerApplication);
    if (!policy.enabledProviders.includes(provider)) {
      throw new ForbiddenException(
        `Payment provider ${provider} is disabled for ${consumerApplication}`,
      );
    }
  }

  async resolveProvider(
    consumerApplication: string,
    preferredProvider?: PaymentProviderName,
  ): Promise<PaymentProviderName> {
    const policy = await this.getEffectivePolicy(consumerApplication);

    if (
      preferredProvider &&
      policy.enabledProviders.includes(preferredProvider)
    ) {
      return preferredProvider;
    }

    if (preferredProvider) {
      const fallback = this.enabledFallback(policy);
      if (fallback) return fallback;
      throw new ForbiddenException(
        `Preferred payment provider ${preferredProvider} is disabled and no enabled fallback is configured for ${consumerApplication}`,
      );
    }

    if (policy.enabledProviders.includes(policy.defaultProvider)) {
      return policy.defaultProvider;
    }

    const fallback = this.enabledFallback(policy);
    if (fallback) return fallback;

    throw new ServiceUnavailableException(
      `No enabled payment provider is routable for ${consumerApplication}`,
    );
  }

  private enabledFallback(
    policy: EffectivePaymentRoutingPolicy,
  ): PaymentProviderName | null {
    if (
      policy.fallbackProvider &&
      policy.enabledProviders.includes(policy.fallbackProvider)
    ) {
      return policy.fallbackProvider;
    }
    return null;
  }

  private validatePolicy(dto: UpdatePaymentRoutingPolicyDto): void {
    if (dto.enabledProviders.length === 0) {
      throw new BadRequestException(
        'At least one payment provider must remain enabled',
      );
    }

    if (!dto.enabledProviders.includes(dto.defaultProvider)) {
      throw new BadRequestException(
        'The default payment provider must be enabled',
      );
    }

    if (dto.fallbackProvider) {
      if (!dto.enabledProviders.includes(dto.fallbackProvider)) {
        throw new BadRequestException(
          'The fallback payment provider must be enabled',
        );
      }
      if (dto.fallbackProvider === dto.defaultProvider) {
        throw new BadRequestException(
          'The fallback payment provider must differ from the default provider',
        );
      }
    }
  }
}
