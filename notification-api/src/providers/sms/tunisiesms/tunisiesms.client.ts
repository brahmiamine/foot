import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { TunisieSmsTransportError } from './tunisiesms.exceptions';
import {
  TunisieSmsMessagePayload,
  TunisieSmsRawResponse,
} from './tunisiesms.types';

const xmlParser = new XMLParser({ ignoreAttributes: true });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Convertit une valeur de champ (numérique, texte, ou objet inattendu) en chaîne affichable, sans jamais produire "[object Object]" silencieusement. */
function toDisplayString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return JSON.stringify(value);
}

/**
 * Seul point d'appel HTTP vers TunisieSMS (§ Architecture HTTP). Centralise
 * la requête HTTP, l'authentification (id/api_key de compte), les headers,
 * la sérialisation, le parsing de la réponse (XML ou JSON, §"Protocole
 * HTTP") et la gestion des erreurs HTTP/réseau. Ne connaît jamais la logique
 * métier de l'application (utilisateurs, notifications, OTP, ...).
 *
 * IMPORTANT — format de requête non confirmé contre un compte réel :
 * l'environnement de développement n'a pas d'accès réseau sortant vers
 * tunisiesms.tn (documentation officielle demandée en source de vérité mais
 * inaccessible ici), donc le corps de requête ci-dessous (POST JSON avec les
 * champs `id`/`api_key`/`destination`/`content`/`sender`) suit la
 * spécification fournie avec la tâche (noms de champs et variables d'env
 * explicitement donnés) sans avoir pu être vérifié contre la documentation
 * `tunisiesms.tn/api-sms/`. Avant mise en production : confirmer auprès du
 * compte TunisieSMS la méthode HTTP exacte et le format de requête (JSON vs
 * XML vs query string) — cette confirmation ne touche que `send()`
 * ci-dessous, tout le reste (parsing de réponse, codes d'erreur, retry,
 * normalisation numéro/encodage) reste valide.
 */
@Injectable()
export class TunisieSmsClient implements OnModuleInit {
  private readonly logger = new Logger(TunisieSmsClient.name);
  private apiUrl: string | null = null;
  private id: string | null = null;
  private apiKey: string | null = null;
  private timeoutMs = 10_000;

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  onModuleInit(): void {
    this.apiUrl = this.config.get<string>('TUNISIESMS_API_URL') ?? null;
    this.id = this.config.get<string>('TUNISIESMS_ID') ?? null;
    this.apiKey = this.config.get<string>('TUNISIESMS_API_KEY') ?? null;
    this.timeoutMs = this.config.get<number>('TUNISIESMS_TIMEOUT_MS') ?? 10_000;
    if (!this.isConfigured()) {
      this.logger.warn(
        'TUNISIESMS_API_URL/TUNISIESMS_ID/TUNISIESMS_API_KEY not fully set: TunisieSmsClient is inactive.',
      );
    }
  }

  isConfigured(): boolean {
    return !!(this.apiUrl && this.id && this.apiKey);
  }

  async send(
    payload: TunisieSmsMessagePayload,
  ): Promise<TunisieSmsRawResponse> {
    if (!this.apiUrl || !this.id || !this.apiKey) {
      throw new TunisieSmsTransportError(
        'NOT_CONFIGURED',
        'TunisieSmsClient is not configured (TUNISIESMS_API_URL/ID/API_KEY missing)',
      );
    }

    const body = { id: this.id, api_key: this.apiKey, ...payload };

    let rawBody: string;
    try {
      const response = await firstValueFrom(
        this.http.post<string>(this.apiUrl, body, {
          timeout: this.timeoutMs,
          responseType: 'text',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, application/xml, text/xml',
          },
          validateStatus: () => true,
        }),
      );

      if (response.status < 200 || response.status >= 300) {
        throw new TunisieSmsTransportError(
          'HTTP_ERROR',
          `TunisieSMS returned HTTP ${response.status}`,
        );
      }
      rawBody =
        typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data);
    } catch (error) {
      if (error instanceof TunisieSmsTransportError) throw error;
      throw this.toTransportError(error);
    }

    return this.parseResponse(rawBody);
  }

  private toTransportError(error: unknown): TunisieSmsTransportError {
    const err = error as { code?: string; message?: string };
    if (
      err?.code === 'ECONNABORTED' ||
      err?.message?.toLowerCase().includes('timeout')
    ) {
      return new TunisieSmsTransportError(
        'TIMEOUT',
        'TunisieSMS request timed out',
        error,
      );
    }
    return new TunisieSmsTransportError(
      'NETWORK_ERROR',
      `TunisieSMS request failed: ${err?.message ?? String(error)}`,
      error,
    );
  }

  private parseResponse(rawBody: string): TunisieSmsRawResponse {
    const trimmed = rawBody.trim();
    if (!trimmed) {
      throw new TunisieSmsTransportError(
        'INVALID_RESPONSE',
        'Empty response from TunisieSMS',
      );
    }

    const status = trimmed.startsWith('<')
      ? this.extractFromXml(trimmed)
      : this.extractFromJson(trimmed);

    const statusCodeRaw = status['status_code'];
    if (
      statusCodeRaw === undefined ||
      statusCodeRaw === null ||
      statusCodeRaw === ''
    ) {
      throw new TunisieSmsTransportError(
        'INVALID_RESPONSE',
        'Missing status_code in TunisieSMS response',
      );
    }
    const statusCode = Number(statusCodeRaw);
    if (Number.isNaN(statusCode)) {
      throw new TunisieSmsTransportError(
        'INVALID_RESPONSE',
        `Non-numeric status_code: ${toDisplayString(statusCodeRaw)}`,
      );
    }

    const messageId =
      status['message_id'] !== undefined && status['message_id'] !== null
        ? toDisplayString(status['message_id'])
        : undefined;
    if (statusCode === 200 && !messageId) {
      throw new TunisieSmsTransportError(
        'INVALID_RESPONSE',
        'Missing message_id on a successful TunisieSMS response',
      );
    }

    return {
      statusCode,
      statusMsg:
        status['status_msg'] !== undefined
          ? toDisplayString(status['status_msg'])
          : undefined,
      messageId,
    };
  }

  /** Cherche un noeud "status" imbriqué (`response.status` ou `status`), sinon retombe sur le document lui-même (réponse JSON à plat). */
  private extractStatusNode(doc: unknown): Record<string, unknown> | undefined {
    if (!isRecord(doc)) return undefined;
    const response = doc['response'];
    if (isRecord(response) && isRecord(response['status'])) {
      return response['status'];
    }
    if (isRecord(doc['status'])) {
      return doc['status'];
    }
    return doc;
  }

  private extractFromXml(body: string): Record<string, unknown> {
    const validation = XMLValidator.validate(body);
    if (validation !== true) {
      throw new TunisieSmsTransportError(
        'INVALID_RESPONSE',
        `Invalid XML response from TunisieSMS: ${validation.err?.msg ?? 'parse error'}`,
      );
    }

    const doc: unknown = xmlParser.parse(body);
    const status = this.extractStatusNode(doc);
    if (!status) {
      throw new TunisieSmsTransportError(
        'INVALID_RESPONSE',
        'Unexpected TunisieSMS XML response shape',
      );
    }
    return status;
  }

  private extractFromJson(body: string): Record<string, unknown> {
    let doc: unknown;
    try {
      doc = JSON.parse(body);
    } catch (error) {
      throw new TunisieSmsTransportError(
        'INVALID_RESPONSE',
        'Invalid JSON response from TunisieSMS',
        error,
      );
    }
    const status = this.extractStatusNode(doc);
    if (!status) {
      throw new TunisieSmsTransportError(
        'INVALID_RESPONSE',
        'Unexpected TunisieSMS JSON response shape',
      );
    }
    return status;
  }
}
